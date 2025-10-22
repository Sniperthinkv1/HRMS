// Define the new TimePeriod type
import { API_CONFIG } from "../config/apiConfig";
export type TimePeriod =
  | "this_month"
  | "last_6_months"
  | "last_12_months"
  | "last_5_years";

// Interface representing the raw API response format - UPDATED to match backend model
export interface SalaryRawData {
  id: number;
  year: number;
  month: string;
  date: string;
  name: string;
  employee_id: string;
  department: string;
  // Backend field names (not the expected frontend names)
  salery: string; // was basic_salary
  absent: string; // was days_absent
  days: string; // was days_present
  sl_wo_ot: string; // was sl_wo_ot_wo_late
  ot: string; // was ot_hours
  hour_rs: string; // was basic_salary_per_hour
  charges: string; // was ot_charges
  late: string; // was late_minutes
  charge: string; // was basic_salary_per_minute
  incentive: string;
  amt: string; // was late_charges
  sal_ot: string; // was salary_wo_advance_deduction
  adv_25th: string; // was adv_paid_on_25th
  old_adv: string; // was repayment_of_old_adv
  nett_payable: string; // was net_payable
  total_old_adv: string; // was total_old_advance
  balnce_adv: string; // was final_balance_advance
  tds: string;
  sal_tds: string; // was sal_before_tds
  advance: string;
}

// Interface for processed salary data to be used by the frontend
export interface SalaryData {
  // Stats data
  totalEmployees: number;
  avgAttendancePercentage: number;
  totalWorkingDays: number;
  totalOTHours: number;
  totalLateMinutes: number;

  // Comparison data (trends/changes)
  employeesChange: number;
  attendanceChange: number;
  lateMinutesChange: number;
  otHoursChange: number;

  // Department data
  departmentData: {
    department: string;
    averageSalary: number;
    headcount: number;
    totalSalary: number;
    attendancePercentage: number;
    totalOTHours: number;
    totalLateMinutes: number;
  }[];

  // Distribution data
  salaryDistribution: {
    range: string;
    count: number;
  }[];

  // Attendance data
  todayAttendance: {
    status: string;
    count: number;
  }[];

  // Trends data
  salaryTrends: {
    month: string;
    averageSalary: number;
  }[];

  // OT trends
  otTrends: {
    month: string;
    averageOTHours: number;
  }[];

  // Top salaried employees
  topSalariedEmployees: {
    name: string;
    salary: number;
    department: string;
  }[];

  // Top attendance employees
  topAttendanceEmployees: {
    name: string;
    attendancePercentage: number;
    department: string;
  }[];

  // Late minute trends
  lateMinuteTrends: {
    month: string;
    averageLateMinutes: number;
  }[];

  // Department distribution
  departmentDistribution: {
    department: string;
    count: number;
  }[];

  // Available departments for dropdown
  availableDepartments?: string[];

  // Selected payroll period used for the current KPI calculations
  selectedPeriod?: {
    month: string;
    year: number;
    label: string;
  };
}

// Constants removed - were not being used

// Helper functions removed - were not being used

// Function removed - was not being used

// Function removed - was not being used

// Function removed - was not being used

// Function removed - was not being used

// Caching for repeated salaryData calls within the same session
const salaryDataCache: {
  [key: string]: { data: SalaryData; timestamp: number };
} = {};
const SALARY_DATA_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clear in-memory cache – call after payroll is (re)calculated so UI refreshes
export const clearSalaryDataCache = () => {
  Object.keys(salaryDataCache).forEach((key) => delete salaryDataCache[key]);
};

export const fetchSalaryData = async (
  timePeriod: TimePeriod | 'custom_range' = "this_month",
  department: string = "All",
  customStartDate?: string,
  customEndDate?: string
): Promise<SalaryData> => {
  // Create cache key that includes custom dates if provided
  const cacheKey = timePeriod === 'custom_range' 
    ? `custom_${customStartDate}_${customEndDate}_${department}`
    : `${timePeriod}_${department}`;
  
  const cached = salaryDataCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < SALARY_DATA_CACHE_TTL) {
    return cached.data;
  }
  try {
    // Build URL with parameters
    let url = API_CONFIG.getApiUrl(`/salary-data/frontend_charts/`);
    const params = new URLSearchParams();
    
    console.log('🔍 fetchSalaryData called with:', {
      timePeriod,
      department,
      customStartDate,
      customEndDate
    });
    
    if (timePeriod === 'custom_range' && customStartDate && customEndDate) {
      params.append('time_period', 'custom_range');
      params.append('start_date', customStartDate);
      params.append('end_date', customEndDate);
      console.log('📅 Using custom date range:', { start_date: customStartDate, end_date: customEndDate });
    } else if (timePeriod === 'custom_range') {
      // Fallback to this_month if custom_range is selected but no dates provided
      params.append('time_period', 'this_month');
      console.log('📅 Custom range selected but no dates, falling back to this_month');
    } else {
      params.append('time_period', timePeriod);
      console.log('📅 Using standard time period:', timePeriod);
    }
    
    params.append('department', department);
    url += `?${params.toString()}`;
    
    console.log('🌐 API URL:', url);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access")}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "API Error Response:",
        response.status,
        "Error details:",
        errorText
      );
      throw new Error(`Failed to fetch salary data: ${response.status}`);
    }

    const responseData: SalaryData = await response.json();
    console.log('📊 API Response data:', {
      timePeriod,
      department,
      customStartDate,
      customEndDate,
      totalEmployees: responseData.totalEmployees,
      departmentDataLength: responseData.departmentData?.length,
      salaryTrendsLength: responseData.salaryTrends?.length,
      selectedPeriod: responseData.selectedPeriod,
      // Check for new fields
      topAttendanceEmployees: responseData.topAttendanceEmployees?.length || 0,
      lateMinuteTrends: responseData.lateMinuteTrends?.length || 0,
      hasTopAttendance: !!responseData.topAttendanceEmployees,
      hasLateMinuteTrends: !!responseData.lateMinuteTrends
    });

    // Cache the response
    salaryDataCache[cacheKey] = { data: responseData, timestamp: Date.now() };

    return responseData;
  } catch (error) {
    console.error("Error fetching salary data:", error);
    throw error; // Rethrow to allow proper error handling by caller
  }
};

// Helper function to format salary numbers
export const formatSalary = (salary: number): string => {
  const roundedSalary = Math.round(salary);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(roundedSalary);
};

// Payment API integration
export const fetchPayments = async () => {
  const response = await fetch(API_CONFIG.getApiUrl("/payments/"), {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("access")}`,
    },
  });
  if (!response.ok) throw new Error("Failed to fetch payments");
  return response.json();
};

export const createPayment = async (payload: Record<string, unknown>) => {
  const response = await fetch(API_CONFIG.getApiUrl("/payments/"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("access")}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to create payment");
  return response.json();
};

export const updatePayment = async (
  id: string,
  payload: Record<string, unknown>
) => {
  const response = await fetch(API_CONFIG.getApiUrl(`/payments/${id}/`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("access")}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to update payment");
  return response.json();
};

// Fetch salary data for a specific employee and month/year
export const fetchSalaryDataForEmployeeMonth = async (
  employee_id: string,
  year: number,
  month: string
): Promise<SalaryRawData | null> => {
  const url = API_CONFIG.getApiUrl(
    `/salary-data/?employee_id=${employee_id}&year=${year}&month=${month}`
  );
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access")}`,
      },
    });
    if (!response.ok) return null;

    const responseData = await response.json();

    // Handle both paginated and non-paginated responses
    let data: SalaryRawData[] = [];
    if (Array.isArray(responseData)) {
      data = responseData;
    } else if (responseData.results && Array.isArray(responseData.results)) {
      data = responseData.results;
    } else {
      data = [];
    }

    // Return the first matching record (should be only one per employee/month)
    return data.length > 0 ? data[0] : null;
  } catch (e) {
    console.error("Error fetching salary data for employee/month:", e);
    return null;
  }
};
