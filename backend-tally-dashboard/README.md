# HRMS Backend Tally Dashboard

A Django-based Human Resource Management System (HRMS) with integrated Tally dashboard functionality for payroll and attendance management.

## 📁 Project Structure

```
backend-tally-dashboard/
│
├── 🏗️ Core Django Files
│   ├── manage.py                    # Django management script
│   ├── requirements.txt             # Python dependencies
│   ├── dashboard/                   # Main Django project
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── excel_data/                  # Main Django app
│       ├── models/
│       ├── views/
│       ├── serializers/
│       └── urls/
│
├── 📊 Data Management
│   ├── data/                        # Organized data files
│   │   ├── attendance/              # Attendance Excel templates
│   │   └── salary/                  # Salary Excel files
│   └── monthly_attendance_fixed/    # Historical attendance data
│
├── 🛠️ Scripts & Utilities
│   ├── scripts/
│   │   ├── management/              # Data management scripts
│   │   │   ├── cleanup_duplicate_employees.py
│   │   │   ├── clear_payroll_cache.py
│   │   │   └── create_missing_employees_from_attendance.py
│   │   ├── utilities/               # Utility scripts
│   │   │   ├── upload_all_attendance.py
│   │   │   ├── upload_monthly_attendance.py
│   │   │   ├── upload_multiple_months.py
│   │   │   ├── check_attendance_data.py
│   │   │   └── fix_attendance_working_days.py
│   │   ├── setup_test_user.py
│   │   └── test_single_session.py
│   └── tools/                       # Development tools
│       ├── api_debugger.html
│       └── index_verification_dashboard.html
│
├── 🗄️ Database
│   ├── database/                    # Database optimization scripts
│   │   ├── add_comprehensive_indexes.py
│   │   ├── optimize_database_performance.py
│   │   └── *.sql files
│   └── tests/                       # Test files
│
├── 📋 Documentation
│   ├── docs/                        # Technical documentation
│   │   ├── DATABASE_FIX.txt
│   │   ├── LOCAL_DB_SETUP.txt
│   │   ├── PHASE_1_OPTIMIZATIONS.md
│   │   ├── PHASE_2_OPTIMIZATIONS.md
│   │   ├── PROGRESSIVE_LOADING_API.md
│   │   └── NET_SALARY_EXPLANATION.md
│   └── templates/                   # Django templates
│
├── 🎨 Frontend
│   ├── frontend/                    # Main frontend application
│   └── frontend-charts/             # Charts and visualization
│
├── ⚙️ Configuration
│   ├── config/                      # Environment configurations
│   │   └── production.env
│   ├── .env                         # Local environment variables
│   ├── .env.backup                  # Environment backup
│   └── logs/                        # Application logs
│
└── 🐍 Python Environment
    └── hrms/                        # Virtual environment
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL
- Django 4.x

### Setup
1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend-tally-dashboard
   ```

2. **Setup virtual environment**
   ```bash
   source hrms/bin/activate  # On Linux/Mac
   pip install -r requirements.txt
   ```

3. **Configure environment**
   ```bash
   cp .env.backup .env
   # Edit .env with your database credentials
   ```

4. **Database setup**
   ```bash
   python manage.py migrate
   python manage.py collectstatic
   ```

5. **Run the server**
   ```bash
   python manage.py runserver
   ```

## 📝 Scripts Usage

### Management Scripts
Located in `scripts/management/`:

- **`cleanup_duplicate_employees.py`** - Remove duplicate employee records
- **`clear_payroll_cache.py`** - Clear payroll cache data
- **`create_missing_employees_from_attendance.py`** - Create employees from attendance files

### Utility Scripts
Located in `scripts/utilities/`:

- **`upload_all_attendance.py`** - Upload all attendance files at once
- **`upload_monthly_attendance.py`** - Upload single month attendance
- **`check_attendance_data.py`** - Validate attendance data
- **`fix_attendance_working_days.py`** - Fix working days calculation

### Running Scripts
All scripts are designed to work from any location:

```bash
# From project root
python scripts/management/cleanup_duplicate_employees.py

# From scripts directory
cd scripts/management
python cleanup_duplicate_employees.py
```

## 📊 Data Organization

### Attendance Data
- **Templates**: `data/attendance/` - Excel templates for attendance upload
- **Historical**: `monthly_attendance_fixed/` - Historical attendance data by month/year
- **Format**: `Month_Year_Attendance.xlsx` (e.g., `January_2024_Attendance.xlsx`)

### Salary Data
- **Location**: `data/salary/` - Salary Excel files
- **Format**: Company salary export files

## 🔧 Development

### Database Optimization
Database optimization scripts are in `database/`:
- Run index optimization: `python database/optimize_database_performance.py`
- Verify indexes: `python database/verify_database_indexes.py`

### API Testing
Use the debugging tools in `tools/`:
- `api_debugger.html` - API endpoint testing
- `index_verification_dashboard.html` - Database index verification

### Frontend Development
- **Main App**: `frontend/src/` - React application
- **Charts**: `frontend-charts/src/` - Chart components

## 📋 Logs
Application logs are stored in `logs/django.log`

## 🤝 Contributing
1. Follow the organized directory structure
2. Place scripts in appropriate directories (`management/` vs `utilities/`)
3. Update documentation when adding new features
4. Test scripts before committing

## 📞 Support
For technical issues, refer to the documentation in `docs/` or check the logs in `logs/`.