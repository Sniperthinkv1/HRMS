import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation, useNavigate } from 'react-router-dom';
import HRSidebar from './components/HRSidebar';
import HRHeader from './components/HRHeader';
import HRStats from './components/HRStats';
import HROverviewCharts from './components/HROverviewCharts';
import HRDirectory from './components/HRDirectory';
import HRAddEmployee from './components/HRAddEmployee';
import HRPayrollNew from './components/HRPayrollNew';
import PayrollOverview from './components/payroll/PayrollOverview';

import HRAttendanceTracker from './components/HRAttendanceTracker';
import HRAttendanceLog from './components/HRAttendanceLog';
import HRLeaveManagement from './components/HRLeaveManagement';
import HRSettings from './components/HRSettings';
import HREmployeeDetails from './components/HREmployeeDetails';
import HRDataUpload from './components/HRDataUpload';
import HRUserInvitation from './components/HRUserInvitation';
import Dropdown, { DropdownOption } from './components/Dropdown';
import CustomDateInput from './components/CustomDateInput';
import { TimePeriod, clearSalaryDataCache } from './services/salaryService';
import { getDropdownOptions } from './services/dropdownService';
import Login from './components/Login';
import Signup from './components/Signup';
import AcceptInvitation from './components/AcceptInvitation';
import ForgotPassword from './components/ForgotPassword';
import ChangePassword from './components/ChangePassword';
import InactivityWarningModal from './components/InactivityWarningModal';
import { useRef } from 'react';
import { useInactivityManager } from './hooks/useInactivityManager';
import { useSessionConflict } from './hooks/useSessionConflict';
import { SessionConflictModal } from './components/SessionConflictModal';

// Time period options for HR dashboard
const timePeriodOptions: { label: string; value: TimePeriod | 'custom_range' }[] = [
  { label: 'Latest Month', value: 'this_month' },
  { label: 'Last 6 Months', value: 'last_6_months' },
  { label: 'Last 12 Months', value: 'last_12_months' },
  { label: 'Last 5 Years', value: 'last_5_years' },
  { label: 'Custom Range', value: 'custom_range' },
];

function PrivateRoute({ children }: { children: JSX.Element }) {
  const access = localStorage.getItem('access');
  const { showWarning, extendSession, logout } = useInactivityManager();
  
  // SSE-based session conflict detection
  const { modalData, closeModal, testModal } = useSessionConflict();
  
  // Debug logging
  useEffect(() => {
    console.log('📊 Modal Data Changed:', modalData);
  }, [modalData]);
  
  // Expose test function globally for debugging
  useEffect(() => {
    (window as any).testSessionModal = testModal;
    console.log('💡 Test modal with: window.testSessionModal()');
  }, [testModal]);
  
  // Legacy forcedLogout event support (backup)
  const [showForcedLogout, setShowForcedLogout] = useState<boolean>(false);
  const [forcedReason, setForcedReason] = useState<string>('OTHER_LOGIN');

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setForcedReason(e?.detail?.reason || 'OTHER_LOGIN');
      setShowForcedLogout(true);
      // Clear tokens immediately
      localStorage.clear();
    };
    window.addEventListener('forcedLogout', handler as EventListener);
    return () => window.removeEventListener('forcedLogout', handler as EventListener);
  }, []);

  if (!access) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      {children}
      
      {/* Inactivity Warning Modal */}
      <InactivityWarningModal
        isOpen={showWarning}
        onStayLoggedIn={extendSession}
        onLogout={logout}
      />
      
      {/* New SSE-based Session Conflict Modal */}
      <SessionConflictModal
        show={modalData.show}
        message={modalData.message}
        onClose={closeModal}
      />
      
      {/* Legacy Forced Logout Modal (backup) */}
      {showForcedLogout && !modalData.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">You've been logged out</h3>
            <p className="text-sm text-gray-600 mb-4">
              {forcedReason === 'OTHER_LOGIN' ? 'You have been logged out due to another login on a different device or browser.' : 'Your session has ended. Please log in again.'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                onClick={() => {
                  setShowForcedLogout(false);
                  window.location.href = '/login';
                }}
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AppContent({ dark, setDark }: { dark: boolean; setDark: (v: boolean) => void }) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod | 'custom_range'>('this_month');
  const [activePage, setActivePage] = useState('overview'); // Track active HR page
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [overviewSalaryData, setOverviewSalaryData] = useState<any>(null);

  // Convert time period options to dropdown format
  const timePeriodDropdownOptions: DropdownOption[] = timePeriodOptions.map(opt => ({
    value: opt.value,
    label: opt.label
  }));

  // Convert departments to dropdown format
  const departmentDropdownOptions: DropdownOption[] = [
    { value: 'All', label: 'All Departments' },
    ...availableDepartments.map(dept => ({ value: dept, label: dept }))
  ];

  // Fetch available departments from API
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const dropdownOptions = await getDropdownOptions();
        // Use departments from the dropdown options API (sourced from database)
        setAvailableDepartments(dropdownOptions.departments);
      } catch (error) {
        console.error('Failed to load departments:', error);
        // Fallback to default departments if API fails
        setAvailableDepartments(['Engineering', 'Sales', 'HR', 'Finance', 'Design', 'Marketing']);
      }
    };

    loadDepartments();
  }, []);

  // Update activePage based on current route
  useEffect(() => {
    if (location.pathname === '/hr-management') {
      // Check user role and redirect HR managers to directory
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const isHRManager = user?.role === 'hr_manager' || user?.role === 'hr-manager' || false;
      const isAdmin = user?.role === 'admin' || user?.is_admin || user?.is_superuser || false;
      
      if (isHRManager && !isAdmin) {
        // HR managers should go to directory instead of overview
        navigate('/hr-management/directory');
        return;
      }
      setActivePage('overview');
    } else if (location.pathname === '/hr-management/directory') {
      setActivePage('directory');
    } else if (location.pathname === '/hr-management/directory/add') {
      setActivePage('add-employee');
    } else if (location.pathname === '/hr-management/payroll') {
      setActivePage('payroll');
    } else if (location.pathname === '/hr-management/payroll-overview') {
      setActivePage('payroll');
    } else if (location.pathname === '/hr-management/attendance-tracker') {
      setActivePage('attendance-tracker');
    } else if (location.pathname === '/hr-management/attendance-log') {
      setActivePage('attendance-log');
    } else if (location.pathname === '/hr-management/leave-management') {
      setActivePage('leave-management');
    } else if (location.pathname === '/hr-management/settings') {
      setActivePage('settings');
    } else if (location.pathname === '/hr-management/data-upload') {
      setActivePage('data-upload');
    } else if (location.pathname === '/hr-management/team') {
      setActivePage('team');
    }
  }, [location.pathname]);

  // Handle time period selection
  const handleTimePeriodSelect = (value: string) => {
    console.log('🔄 Time period changed:', value);
    setTimePeriod(value as TimePeriod | 'custom_range');
    
    // Clear cache to ensure fresh data
    clearSalaryDataCache();
    
    // If custom range is selected, set default date range
    if (value === 'custom_range') {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setCustomStartDate(thirtyDaysAgo);
      setCustomEndDate(today);
      console.log('📅 Set default custom date range:', { start: thirtyDaysAgo, end: today });
    }
    
    // Dispatch filter change event
    window.dispatchEvent(new CustomEvent('filterChanged', {
      detail: { 
        type: 'timePeriod', 
        value: value,
        selectedDepartment,
        customStartDate,
        customEndDate
      }
    }));
  };

  // Handle department selection
  const handleDepartmentSelect = (value: string) => {
    console.log('🔄 Department changed:', value);
    setSelectedDepartment(value);
    
    // Clear cache to ensure fresh data
    clearSalaryDataCache();
    
    // Dispatch filter change event
    window.dispatchEvent(new CustomEvent('filterChanged', {
      detail: { 
        type: 'department', 
        value: value,
        timePeriod,
        customStartDate,
        customEndDate
      }
    }));
  };

  // Handle custom date changes
  const handleCustomDateChange = (startDate: string, endDate: string) => {
    console.log('🔄 Custom dates changed:', { startDate, endDate });
    console.log('🔄 Current timePeriod:', timePeriod);
    console.log('🔄 Current selectedDepartment:', selectedDepartment);
    
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
    
    // Clear cache to ensure fresh data
    clearSalaryDataCache();
    
    // Dispatch filter change event
    window.dispatchEvent(new CustomEvent('filterChanged', {
      detail: { 
        type: 'customDate', 
        startDate,
        endDate,
        timePeriod,
        selectedDepartment
      }
    }));
  };

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    if (dark) {
      document.documentElement.classList.add('dark');
    }
  }, [dark]);

  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/accept-invitation" element={<AcceptInvitation />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/change-password" element={<ChangePassword />} />
      {/* Protected Routes */}
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-black dark:text-white">
              {/* Left Sidebar */}
              <Routes>
                <Route path="/hr-management/*" element={<HRSidebar activePage={activePage} onPageChange={setActivePage} />} />
                <Route path="*" element={<HRSidebar activePage={activePage} onPageChange={setActivePage} />} />
              </Routes>
              {/* Main Content Area */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <Routes>
                  <Route path="/hr-management/*" element={<HRHeader dark={dark} setDark={setDark} />} />
                  <Route path="*" element={<HRHeader dark={dark} setDark={setDark} />} />
                </Routes>
                {/* Main Content with Right Sidebar */}
                <div className="flex flex-1 overflow-hidden">
                  {/* Main Content */}
                  <main className="flex-1 overflow-auto p-6 hide-scrollbar">
                    <div className="max-w-full mx-auto">
                      <Routes>
                        {/* HR Management Routes */}
                        <Route path="/hr-management" element={
                          <>
                            <div className="flex justify-end items-center mb-6">
                              <div className="flex items-center gap-4">
                                <Dropdown
                                  options={timePeriodDropdownOptions}
                                  value={timePeriod}
                                  onChange={handleTimePeriodSelect}
                                  className="w-48"
                                />
                                <Dropdown
                                  options={departmentDropdownOptions}
                                  value={selectedDepartment}
                                  onChange={handleDepartmentSelect}
                                  className="w-48"
                                />
                                
                                {/* Custom Date Range Inputs - Show when Custom Range is selected */}
                                {timePeriod === 'custom_range' && (
                                  <>
                                    <div className="flex flex-col">
                                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5 -mt-1">
                                        Start Date
                                      </label>
                                      <CustomDateInput
                                        value={customStartDate}
                                        onChange={(startDate) => {
                                          const endDate = customEndDate;
                                          handleCustomDateChange(startDate, endDate);
                                        }}
                                        placeholder="Select start date"
                                        className="w-48 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:text-white"
                                        maxDate={customEndDate ? new Date(customEndDate) : undefined}
                                      />
                                    </div>
                                    <div className="flex flex-col">
                                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5 -mt-1">
                                        End Date
                                      </label>
                                      <CustomDateInput
                                        value={customEndDate}
                                        onChange={(endDate) => {
                                          const startDate = customStartDate;
                                          handleCustomDateChange(startDate, endDate);
                                        }}
                                        placeholder="Select end date"
                                        className="w-48 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:text-white"
                                        minDate={customStartDate ? new Date(customStartDate) : undefined}
                                      />
                                    </div>
                                    <div className="flex items-end gap-2">
                                      <button
                                        onClick={() => {
                                          const today = new Date().toISOString().split('T')[0];
                                          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                                          handleCustomDateChange(thirtyDaysAgo, today);
                                        }}
                                        className="px-3 py-2 text-xs bg-teal-100 hover:bg-teal-200 text-teal-700 rounded-md transition-colors"
                                      >
                                        Last 30 Days
                                      </button>
                                      <button
                                        onClick={() => {
                                          handleCustomDateChange('', '');
                                        }}
                                        className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                                      >
                                        Clear
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="space-y-6">
                              <HRStats 
                                timePeriod={timePeriod} 
                                selectedDepartment={selectedDepartment === "N/A" ? "N/A" : selectedDepartment} 
                                overviewSalaryData={overviewSalaryData}
                                customStartDate={customStartDate}
                                customEndDate={customEndDate}
                              />
                                <HROverviewCharts 
                                  timePeriod={timePeriod} 
                                  selectedDepartment={selectedDepartment === "N/A" ? "N/A" : selectedDepartment} 
                                  onSalaryData={(d) => setOverviewSalaryData(d)}
                                  customStartDate={customStartDate}
                                  customEndDate={customEndDate}
                                />
                            </div>
                          </>
                        } />
                        {/* Directory/Employees Route */}
                        <Route path="/hr-management/directory" element={<HRDirectory />} />
                        {/* Add Employee Route */}
                        <Route path="/hr-management/directory/add" element={<HRAddEmployee />} />
                        {/* Employee Details Route */}
                        <Route path="/hr-management/directory/:id" element={<HREmployeeDetails />} />
                        {/* Employee Edit Route */}
                        <Route path="/hr-management/employees/edit/:id" element={<HREmployeeDetails />} />
                        {/* Payroll Route */}
                        <Route path="/hr-management/payroll" element={<HRPayrollNew />} />
                        {/* Payroll Overview Route */}
                        <Route path="/hr-management/payroll-overview" element={<PayrollOverview />} />

                        {/* Attendance Tracker Route */}
                        <Route path="/hr-management/attendance-tracker" element={<HRAttendanceTracker />} />
                <Route path="/hr-management/attendance-log" element={<HRAttendanceLog />} />
                        {/* Leave Management Route */}
                        <Route path="/hr-management/leave-management" element={<HRLeaveManagement />} />
                        {/* Data Upload Route */}
                        <Route path="/hr-management/data-upload" element={<HRDataUpload />} />
                        {/* Team Management Route */}
                        <Route path="/hr-management/team" element={<HRUserInvitation />} />
                        {/* Settings Route */}
                        <Route path="/hr-management/settings" element={<HRSettings />} />
                      </Routes>
                    </div>
                  </main>
                </div>
              </div>
            </div>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

function App() {
  const [dark, setDark] = useState(false); // Always start with light theme

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    if (dark) {
      document.documentElement.classList.add('dark');
    }
  }, [dark]);

  return (
    <Router>
      <AppContent dark={dark} setDark={setDark} />
    </Router>
  );
}

export default App;