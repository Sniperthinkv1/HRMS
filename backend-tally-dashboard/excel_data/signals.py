from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import DailyAttendance, Attendance, AdvanceLedger, Payment, SalaryData, MonthlyAttendanceSummary, EmployeeProfile, ChartAggregatedData, CalculatedSalary
from django.db.models import Sum
from datetime import date
from decimal import Decimal

@receiver([post_save, post_delete], sender=DailyAttendance)
def sync_attendance_from_daily(sender, instance, **kwargs):
    """
    Automatically aggregate DailyAttendance into monthly Attendance records.
    This ensures that when daily attendance is recorded, monthly attendance is automatically updated.
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"🔄 SIGNAL TRIGGERED: {instance.employee_id} - {instance.date} - {instance.attendance_status}")
    
    try:
        tenant = instance.tenant
        year = instance.date.year
        month = instance.date.month
        employee_id = instance.employee_id

        # Get all daily attendance records for this employee for this month
        daily_records = DailyAttendance.objects.filter(
            tenant=tenant,
            employee_id=employee_id,
            date__year=year,
            date__month=month,
        )

        # Calculate aggregated values
        from django.db.models import Sum, Case, When, FloatField, Value, Count
        import calendar
        
        # Get employee info
        try:
            employee = EmployeeProfile.objects.get(tenant=tenant, employee_id=employee_id)
            employee_name = f"{employee.first_name} {employee.last_name}".strip()
            department = employee.department or 'General'
        except EmployeeProfile.DoesNotExist:
            # Fallback to daily record data
            employee_name = instance.employee_name
            department = instance.department or 'General'

        # Aggregate present days (PRESENT and PAID_LEAVE count as 1, HALF_DAY as 0.5)
        present_aggregate = daily_records.aggregate(
            present_days=Sum(
                Case(
                    When(attendance_status__in=['PRESENT', 'PAID_LEAVE'], then=Value(1.0)),
                    When(attendance_status='HALF_DAY', then=Value(0.5)),
                    default=Value(0.0),
                    output_field=FloatField()
                )
            ),
            ot_hours=Sum('ot_hours'),
            late_minutes=Sum('late_minutes')
        )

        present_days = float(present_aggregate['present_days'] or 0)
        ot_hours = float(present_aggregate['ot_hours'] or 0)
        late_minutes = int(present_aggregate['late_minutes'] or 0)

        # Calculate working days for the month based on employee's joining date and off days
        days_in_month = calendar.monthrange(year, month)[1]
        
        try:
            from ..services.salary_service import SalaryCalculationService
            employee = EmployeeProfile.objects.get(tenant=tenant, employee_id=employee_id, is_active=True)
            month_names = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
            total_working_days = SalaryCalculationService._calculate_employee_working_days(
                employee, year, month_names[month - 1]
            )
        except EmployeeProfile.DoesNotExist:
            # Fallback: use calendar days if employee not found
            total_working_days = days_in_month
            logger.warning(f'Employee {employee_id} not found in signal, using calendar days for working days calculation')
        except Exception as e:
            # Fallback: use calendar days if calculation fails
            total_working_days = days_in_month
            logger.warning(f'Could not calculate working days for employee {employee_id} in signal: {str(e)}')
        
        absent_days = max(0, total_working_days - present_days)

        # Create or update monthly Attendance record
        attendance_date = date(year, month, 1)  # First day of the month
        
        Attendance.objects.update_or_create(
            tenant=tenant,
            employee_id=employee_id,
            date=attendance_date,
            defaults={
                'name': employee_name,
                'department': department,
                'calendar_days': days_in_month,
                'total_working_days': total_working_days,
                'present_days': present_days,
                'absent_days': absent_days,
                'ot_hours': ot_hours,
                'late_minutes': late_minutes,
            }
        )

        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"✅ SIGNAL COMPLETED: Updated monthly Attendance for {employee_id} - {year}-{month:02d}: {present_days} present days")

    except Exception as exc:
        # Soft-fail – we don't want attendance updates to break
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"❌ SIGNAL FAILED: Failed to sync Attendance from DailyAttendance: {exc}")

# DISABLED: These signals are trying to update a non-existent 'total_advance' field in SalaryData
# The CalculatedSalary model is now used for advance calculations instead
"""
@receiver([post_save, post_delete], sender=AdvanceLedger)
def update_total_advance_on_advance_change(sender, instance, **kwargs):
    employee_id = instance.employee_id
    # Sum all advances for this employee
    total_advance = AdvanceLedger.objects.filter(employee_id=employee_id).aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0.00')
    # Subtract all advance deductions from payments
    total_deduction = Payment.objects.filter(employee_id=employee_id).aggregate(
        total=Sum('advance_deduction')
    )['total'] or Decimal('0.00')
    # Update all SalaryData records for this employee
    SalaryData.objects.filter(employee_id=employee_id).update(total_advance=total_advance - total_deduction)

@receiver([post_save, post_delete], sender=Payment)
def update_total_advance_on_payment(sender, instance, **kwargs):
    employee_id = instance.employee_id
    # Sum all advances
    total_advance = AdvanceLedger.objects.filter(employee_id=employee_id).aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0.00')
    # Subtract all advance deductions
    total_deduction = Payment.objects.filter(employee_id=employee_id).aggregate(
        total=Sum('advance_deduction')
    )['total'] or Decimal('0.00')
    # Update all SalaryData records for this employee
    SalaryData.objects.filter(employee_id=employee_id).update(total_advance=total_advance - total_deduction)
"""

@receiver([post_save, post_delete], sender=DailyAttendance)
def update_monthly_attendance_summary(sender, instance, **kwargs):
    """Maintain per-employee MonthlyAttendanceSummary aggregates."""
    try:
        tenant = instance.tenant
        year = instance.date.year
        month = instance.date.month
        employee_id = instance.employee_id

        # Pull all daily attendance rows for the employee for the same month
        qs = DailyAttendance.objects.filter(
            tenant=tenant,
            employee_id=employee_id,
            date__year=year,
            date__month=month,
        )

        # Present counts: PRESENT and PAID_LEAVE count as 1, HALF_DAY as 0.5
        present_full = qs.filter(attendance_status__in=["PRESENT", "PAID_LEAVE"]).count()
        half_days = qs.filter(attendance_status="HALF_DAY").count()
        total_present = present_full + (half_days * 0.5)

        # Aggregate OT & late minutes
        aggregate_vals = qs.aggregate(
            ot_sum=Sum("ot_hours"),
            late_sum=Sum("late_minutes"),
        )
        ot_hours = aggregate_vals["ot_sum"] or Decimal("0")
        late_minutes = aggregate_vals["late_sum"] or 0

        # Upsert summary
        MonthlyAttendanceSummary.objects.update_or_create(
            tenant=tenant,
            employee_id=employee_id,
            year=year,
            month=month,
            defaults={
                "present_days": Decimal(str(total_present)),
                "ot_hours": ot_hours,
                "late_minutes": late_minutes,
            },
        )
    except Exception as exc:
        # Soft-fail – we don't want attendance updates to break
        import logging
        logging.getLogger(__name__).error(f"Failed to update MonthlyAttendanceSummary: {exc}")


# ==================== Chart Aggregation Signals ====================
# Real-time sync to ChartAggregatedData for dashboard performance

@receiver(post_save, sender=SalaryData)
def sync_chart_data_from_salary(sender, instance, created, **kwargs):
    """
    Auto-sync ChartAggregatedData when SalaryData (Excel upload) is created/updated.
    
    NOTE: This processes individual records. For bulk uploads, use 
    sync_chart_data_batch() to avoid N+1 signal calls.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Skip if this is part of a bulk operation (will be handled by batch sync)
    if kwargs.get('raw', False):
        return
    
    try:
        chart_data, was_created = ChartAggregatedData.aggregate_from_salary_data(instance)
        action = "Created" if was_created else "Updated"
        logger.info(f"📊 Chart Data {action}: {instance.name} - {instance.month} {instance.year} (Excel)")
        
        # Clear cache for this period
        from django.core.cache import cache
        tenant_id = instance.tenant.id if instance.tenant else 'default'
        cache_pattern = f"frontend_charts_{tenant_id}_*"
        try:
            cache.delete_pattern(cache_pattern)
        except AttributeError:
            # Fallback if delete_pattern not available
            cache.delete(f"frontend_charts_{tenant_id}")
        
    except Exception as e:
        # Soft fail - don't break Excel upload if aggregation fails
        logger.warning(f"Failed to sync ChartAggregatedData from SalaryData: {e}")


@receiver(post_save, sender=CalculatedSalary)
def sync_chart_data_from_calculated(sender, instance, created, **kwargs):
    """
    Auto-sync ChartAggregatedData when CalculatedSalary (Frontend form) is created/updated.
    This ensures dashboard charts show frontend-calculated data immediately.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        chart_data, was_created = ChartAggregatedData.aggregate_from_calculated_salary(instance)
        action = "Created" if was_created else "Updated"
        logger.info(f"📊 Chart Data {action}: {instance.employee_name} - {instance.payroll_period} (Frontend)")
        
        # Clear cache for this period
        from django.core.cache import cache
        tenant_id = instance.tenant.id if instance.tenant else 'default'
        cache_pattern = f"frontend_charts_{tenant_id}_*"
        try:
            cache.delete_pattern(cache_pattern)
        except AttributeError:
            # Fallback if delete_pattern not available
            cache.delete(f"frontend_charts_{tenant_id}")
        
    except Exception as e:
        # Soft fail - don't break salary calculation if aggregation fails
        logger.warning(f"Failed to sync ChartAggregatedData from CalculatedSalary: {e}")


@receiver(post_delete, sender=SalaryData)
def delete_chart_data_from_salary(sender, instance, **kwargs):
    """
    Remove ChartAggregatedData when SalaryData is deleted.
    Keeps data in sync.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Standardize month name
        MONTH_MAPPING = {
            'JANUARY': 'JAN', 'FEBRUARY': 'FEB', 'MARCH': 'MAR', 'APRIL': 'APR',
            'MAY': 'MAY', 'JUNE': 'JUN', 'JULY': 'JUL', 'AUGUST': 'AUG',
            'SEPTEMBER': 'SEP', 'OCTOBER': 'OCT', 'NOVEMBER': 'NOV', 'DECEMBER': 'DEC',
            'JAN': 'JAN', 'FEB': 'FEB', 'MAR': 'MAR', 'APR': 'APR',
            'JUN': 'JUN', 'JUL': 'JUL', 'AUG': 'AUG', 'SEP': 'SEP',
            'OCT': 'OCT', 'NOV': 'NOV', 'DEC': 'DEC'
        }
        month_short = MONTH_MAPPING.get(instance.month.upper(), 'JAN') if instance.month else 'JAN'
        
        deleted_count = ChartAggregatedData.objects.filter(
            tenant=instance.tenant,
            employee_id=instance.employee_id,
            year=instance.year,
            month=month_short
        ).delete()
        
        if deleted_count[0] > 0:
            logger.info(f"🗑️ Deleted {deleted_count[0]} chart data records for {instance.name}")
            
            # Clear cache
            from django.core.cache import cache
            tenant_id = instance.tenant.id if instance.tenant else 'default'
            try:
                cache.delete_pattern(f"frontend_charts_{tenant_id}_*")
            except AttributeError:
                cache.delete(f"frontend_charts_{tenant_id}")
                
    except Exception as e:
        logger.warning(f"Failed to delete ChartAggregatedData: {e}")


@receiver(post_delete, sender=CalculatedSalary)
def delete_chart_data_from_calculated(sender, instance, **kwargs):
    """
    Remove ChartAggregatedData when CalculatedSalary is deleted.
    Keeps data in sync.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Standardize month name
        MONTH_MAPPING = {
            'JANUARY': 'JAN', 'FEBRUARY': 'FEB', 'MARCH': 'MAR', 'APRIL': 'APR',
            'MAY': 'MAY', 'JUNE': 'JUN', 'JULY': 'JUL', 'AUGUST': 'AUG',
            'SEPTEMBER': 'SEP', 'OCTOBER': 'OCT', 'NOVEMBER': 'NOV', 'DECEMBER': 'DEC',
            'JAN': 'JAN', 'FEB': 'FEB', 'MAR': 'MAR', 'APR': 'APR',
            'JUN': 'JUN', 'JUL': 'JUL', 'AUG': 'AUG', 'SEP': 'SEP',
            'OCT': 'OCT', 'NOV': 'NOV', 'DEC': 'DEC'
        }
        month_name = instance.payroll_period.month.upper()
        month_short = MONTH_MAPPING.get(month_name, 'JAN')
        
        deleted_count = ChartAggregatedData.objects.filter(
            tenant=instance.tenant,
            employee_id=instance.employee_id,
            year=instance.payroll_period.year,
            month=month_short
        ).delete()
        
        if deleted_count[0] > 0:
            logger.info(f"🗑️ Deleted {deleted_count[0]} chart data records for {instance.employee_name}")
            
            # Clear cache
            from django.core.cache import cache
            tenant_id = instance.tenant.id if instance.tenant else 'default'
            try:
                cache.delete_pattern(f"frontend_charts_{tenant_id}_*")
            except AttributeError:
                cache.delete(f"frontend_charts_{tenant_id}")
                
    except Exception as e:
        logger.warning(f"Failed to delete ChartAggregatedData: {e}") 