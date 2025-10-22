import React, { useState } from 'react';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, Eye, BarChart, Users, Calendar } from 'lucide-react';
import { apiUpload, API_ENDPOINTS, apiCall } from '../services/api';
import Dropdown, { DropdownOption } from './Dropdown';
import EmployeeConfirmationModal from './EmployeeConfirmationModal';

const HRDataUpload: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'salary' | 'attendance'>('salary');
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadResult, setUploadResult] = useState<{
    success?: boolean;
    message?: string;
    created_count?: number;
    updated_count?: number;
    records_created?: number;
    records_updated?: number;
    total_errors?: number;
    errors?: string[];
    warnings?: string[];
  } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  
  // Attendance upload states
  const [attendanceUploading, setAttendanceUploading] = useState(false);
  const [attendanceUploadStatus, setAttendanceUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [attendanceUploadMessage, setAttendanceUploadMessage] = useState('');
  const [attendanceUploadResult, setAttendanceUploadResult] = useState<{
    success?: boolean;
    message?: string;
    records_created?: number;
    records_updated?: number;
    total_errors?: number;
    errors?: string[];
    warnings?: string[];
  } | null>(null);
  const [selectedAttendanceFile, setSelectedAttendanceFile] = useState<File | null>(null);
  const [attendanceMonth, setAttendanceMonth] = useState('');
  const [attendanceYear, setAttendanceYear] = useState(new Date().getFullYear().toString());

  // Employee confirmation modal states
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [missingEmployees, setMissingEmployees] = useState<any[]>([]);
  const [pendingUploadData, setPendingUploadData] = useState<{
    file: File;
    month: string;
    year: string;
    type: 'salary' | 'attendance';
  } | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.type === 'application/vnd.ms-excel' ||
          file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setSelectedFile(file);
        setUploadStatus('idle');
        setUploadMessage('');
      } else {
        setUploadMessage('Please select a valid Excel file (.xlsx or .xls)');
        setUploadStatus('error');
      }
    }
  };

  const handleAttendanceFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.type === 'application/vnd.ms-excel' ||
          file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setSelectedAttendanceFile(file);
        setAttendanceUploadStatus('idle');
        setAttendanceUploadMessage('');
      } else {
        setAttendanceUploadMessage('Please select a valid Excel file (.xlsx or .xls)');
        setAttendanceUploadStatus('error');
      }
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.type === 'application/vnd.ms-excel' ||
          file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setSelectedFile(file);
        setUploadStatus('idle');
        setUploadMessage('');
      } else {
        setUploadMessage('Please select a valid Excel file (.xlsx or .xls)');
        setUploadStatus('error');
      }
    }
  };

  const handleAttendanceDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.type === 'application/vnd.ms-excel' ||
          file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setSelectedAttendanceFile(file);
        setAttendanceUploadStatus('idle');
        setAttendanceUploadMessage('');
      } else {
        setAttendanceUploadMessage('Please select a valid Excel file (.xlsx or .xls)');
        setAttendanceUploadStatus('error');
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleEmployeeConfirmation = async (missingEmployees: any[]) => {
    try {
      // Create missing employees
      const createResponse = await apiCall('/api/employees/create_missing_employees/', {
        method: 'POST',
        body: JSON.stringify({ missing_employees: missingEmployees })
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create missing employees');
      }

      const createResult = await createResponse.json();
      console.log('✅ Created employees:', createResult);

      // Close modal
      setShowEmployeeModal(false);
      setMissingEmployees([]);

      // Now proceed with the original upload
      if (pendingUploadData) {
        await performUpload(pendingUploadData);
        setPendingUploadData(null);
      }
    } catch (error) {
      console.error('❌ Error creating employees:', error);
      setUploadMessage('Failed to create missing employees. Please try again.');
      setUploadStatus('error');
    }
  };

  const performUpload = async (uploadData: { file: File; month: string; year: string; type: 'salary' | 'attendance' }) => {
    const { file, month, year, type } = uploadData;
    
    if (type === 'salary') {
      setUploading(true);
      setUploadStatus('idle');
      setUploadMessage('');
      setUploadResult(null);
    } else {
      setAttendanceUploading(true);
      setAttendanceUploadStatus('idle');
      setAttendanceUploadMessage('');
      setAttendanceUploadResult(null);
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('month', type === 'attendance' ? getMonthNumber(month) : month);
      formData.append('year', year);

      const endpoint = type === 'salary' ? API_ENDPOINTS.uploadSalary : '/api/upload-attendance/';
      const response = await apiUpload(endpoint, formData);
      
      if (response.ok) {
        const result = await response.json();
        
        if (type === 'salary') {
          setUploadStatus('success');
          setUploadResult(result);
          
          // Create detailed success message
          const details = [];
          if (result.records_created > 0) details.push(`${result.records_created} new records created`);
          if (result.records_updated > 0) details.push(`${result.records_updated} records updated`);
          if (result.total_errors > 0) details.push(`${result.total_errors} errors found`);
          
          const summaryText = details.length > 0 ? ` (${details.join(', ')})` : '';
          setUploadMessage(`Upload completed successfully!${summaryText}`);
          
          setSelectedFile(null);
          setMonth('');
          
          // Reset file input
          const fileInput = document.getElementById('file-input') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        } else {
          // Determine status based on errors
          if (result.total_errors > 0 && result.records_created === 0 && result.records_updated === 0) {
            // Only errors, no successful records
            setAttendanceUploadStatus('error');
            setAttendanceUploadMessage('Upload completed with errors. Please fix the issues and try again.');
          } else {
            // Some success, show as success even with errors
            setAttendanceUploadStatus('success');
            const details = [];
            if (result.records_created > 0) details.push(`${result.records_created} new records created`);
            if (result.records_updated > 0) details.push(`${result.records_updated} records updated`);
            if (result.total_errors > 0) details.push(`${result.total_errors} errors found`);
            
            const summaryText = details.length > 0 ? ` (${details.join(', ')})` : '';
            setAttendanceUploadMessage(`Upload completed!${summaryText}`);
          }
          
          setAttendanceUploadResult(result);
          
          // Only reset form if completely successful
          if (result.total_errors === 0) {
            setSelectedAttendanceFile(null);
            setAttendanceMonth('');
            
            // Reset file input
            const fileInput = document.getElementById('attendance-file-input') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
          }
        }
        
        // Dispatch refresh event to update all components
        console.log('📡 Dispatching dataUploaded and refreshEmployeeData events');
        window.dispatchEvent(new CustomEvent('dataUploaded', { detail: { timestamp: Date.now() } }));
        window.dispatchEvent(new CustomEvent('refreshEmployeeData'));
      } else {
        const error = await response.json();
        
        // Check if this is a missing employees error
        if (error.error === 'Missing employees found' && error.missing_employees) {
          setMissingEmployees(error.missing_employees);
          setPendingUploadData({ file, month, year, type });
          setShowEmployeeModal(true);
          return;
        }
        
        // Handle other errors
        if (type === 'salary') {
          setUploadStatus('error');
          setUploadMessage(error.error || 'Upload failed. Please try again.');
          setUploadResult(null);
        } else {
          setAttendanceUploadStatus('error');
          setAttendanceUploadMessage(error.error || 'Upload failed. Please try again.');
          setAttendanceUploadResult(null);
        }
      }
    } catch (error) {
      if (type === 'salary') {
        setUploadStatus('error');
        setUploadMessage(error instanceof Error ? error.message : 'Upload failed. Please check your connection and try again.');
        setUploadResult(null);
      } else {
        setAttendanceUploadStatus('error');
        setAttendanceUploadMessage(error instanceof Error ? error.message : 'Upload failed. Please check your connection and try again.');
        setAttendanceUploadResult(null);
      }
    } finally {
      if (type === 'salary') {
        setUploading(false);
      } else {
        setAttendanceUploading(false);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !month || !year) {
      setUploadMessage('Please select a file, month, and year');
      setUploadStatus('error');
      return;
    }

    await performUpload({ file: selectedFile, month, year, type: 'salary' });
  };

  // Convert month abbreviation to number for attendance upload
  const getMonthNumber = (monthAbbr: string): string => {
    const monthMap: { [key: string]: string } = {
      'JAN': '1', 'FEB': '2', 'MAR': '3', 'APR': '4', 'MAY': '5', 'JUN': '6',
      'JUL': '7', 'AUG': '8', 'SEP': '9', 'OCT': '10', 'NOV': '11', 'DEC': '12'
    };
    return monthMap[monthAbbr] || monthAbbr;
  };

  const handleAttendanceUpload = async () => {
    if (!selectedAttendanceFile || !attendanceMonth || !attendanceYear) {
      setAttendanceUploadMessage('Please select a file, month, and year');
      setAttendanceUploadStatus('error');
      return;
    }

    await performUpload({ 
      file: selectedAttendanceFile, 
      month: attendanceMonth, 
      year: attendanceYear, 
      type: 'attendance' 
    });
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await apiCall(API_ENDPOINTS.downloadTemplate);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'salary_template.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setUploadMessage('Template downloaded successfully!');
        setUploadStatus('success');
        setTimeout(() => {
          setUploadMessage('');
          setUploadStatus('idle');
        }, 3000);
      } else {
        const error = await response.json().catch(() => ({ error: 'Download failed' }));
        setUploadMessage(error.error || 'Failed to download template');
        setUploadStatus('error');
      }
    } catch (error) {
      console.error('Download error:', error);
      setUploadMessage('Failed to download template. Please try again.');
      setUploadStatus('error');
    }
  };

  const handleDownloadAttendanceTemplate = async () => {
    try {
      const response = await apiCall('/api/download-attendance-template');
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'attendance_template.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setAttendanceUploadMessage('Attendance template downloaded successfully!');
        setAttendanceUploadStatus('success');
        setTimeout(() => {
          setAttendanceUploadMessage('');
          setAttendanceUploadStatus('idle');
        }, 3000);
      } else {
        const error = await response.json().catch(() => ({ error: 'Download failed' }));
        setAttendanceUploadMessage(error.error || 'Failed to download template');
        setAttendanceUploadStatus('error');
      }
    } catch (error) {
      console.error('Download error:', error);
      setAttendanceUploadMessage('Failed to download template. Please try again.');
      setAttendanceUploadStatus('error');
    }
  };

  const monthOptions: DropdownOption[] = [
    { value: '', label: 'Select Month' },
    { value: 'JAN', label: 'January' },
    { value: 'FEB', label: 'February' },
    { value: 'MAR', label: 'March' },
    { value: 'APR', label: 'April' },
    { value: 'MAY', label: 'May' },
    { value: 'JUN', label: 'June' },
    { value: 'JUL', label: 'July' },
    { value: 'AUG', label: 'August' },
    { value: 'SEP', label: 'September' },
    { value: 'OCT', label: 'October' },
    { value: 'NOV', label: 'November' },
    { value: 'DEC', label: 'December' }
  ];

  const currentYear = new Date().getFullYear();
  const yearOptions: DropdownOption[] = [
    { value: '', label: 'Select Year' },
    ...Array.from({ length: 5 }, (_, i) => {
      const year = currentYear - 4 + i;
      return { value: year.toString(), label: year.toString() };
    })
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Data Upload
        </h2>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('salary')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'salary'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart className="w-4 h-4 inline mr-2" />
            Salary Data
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'attendance'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Attendance Data
          </button>
        </div>

        {/* Salary Upload Tab */}
        {activeTab === 'salary' && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart className="w-5 h-5" />
              Upload Salary Data
            </h3>
        
        {/* Template Download Section */}
        <div className="mb-6 p-4 bg-teal-50 rounded-lg border border-teal-200">
          <h3 className="font-medium text-black-900 mb-2">📋 Download Template First</h3>
          <p className="text-black-700 text-sm mb-3">
            Download our Excel template to ensure your data is formatted correctly.
          </p>
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
        </div>

        {/* Month and Year Selection */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <Dropdown
              options={monthOptions}
              value={month}
              onChange={setMonth}
              placeholder="Select Month"
              label="Month"
              required
            />
          </div>
          <div>
            <Dropdown
              options={yearOptions}
              value={year}
              onChange={setYear}
              placeholder="Select Year"
              label="Year"
              required
            />
          </div>
        </div>

        {/* File Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            selectedFile ? 'border-teal-300 bg-teal-50' : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          
          {selectedFile ? (
            <div>
              <p className="text-teal-700 font-medium">{selectedFile.name}</p>
              <p className="text-teal-600 text-sm">File selected successfully</p>
            </div>
          ) : (
            <div>
              <h4 className="text-lg font-medium mb-2">Drop your Excel file here</h4>
              <p className="text-gray-500 mb-4">or click to select a file</p>
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label
                htmlFor="file-input"
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 cursor-pointer transition-colors"
              >
                <Upload className="w-4 h-4" />
                Select File
              </label>
            </div>
          )}
        </div>

        {/* Status Messages */}
        {uploadMessage && (
          <div className={`mt-4 p-4 rounded-lg flex items-center gap-2 ${
            uploadStatus === 'success' 
              ? 'bg-teal-50 text-teal-700 border border-teal-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {uploadStatus === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {uploadMessage}
          </div>
        )}

        {/* Upload Results and Next Steps */}
        {uploadStatus === 'success' && uploadResult && (
          <div className="mt-6 space-y-4">
            {/* Upload Summary */}
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <h3 className="font-medium text-teal-900 mb-3">📊 Upload Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-white rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-teal-600">{uploadResult.records_created || 0}</div>
                  <div className="text-teal-700">New Records</div>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
        <div className="text-2xl font-bold text-teal-600">{uploadResult.records_updated || 0}</div>
        <div className="text-teal-700">Updated Records</div>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-orange-600">{uploadResult.total_errors || 0}</div>
                  <div className="text-orange-700">Errors</div>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {(uploadResult.records_created || 0) + (uploadResult.records_updated || 0)}
                  </div>
                  <div className="text-purple-700">Total Processed</div>
                </div>
              </div>
              
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-red-900 mb-2">⚠️ Errors Found:</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-32 overflow-y-auto hide-scrollbar">
                    {uploadResult.errors.map((error: string, index: number) => (
                      <div key={index} className="text-sm text-red-700 mb-1">{error}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Next Steps */}
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <h3 className="font-medium text-teal-900 mb-3">🎯 What's Next?</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <button 
                  onClick={() => window.location.href = '/hr-management'}
                  className="flex items-center gap-3 p-3 bg-white border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors text-left"
                >
                  <BarChart className="w-6 h-6 text-teal-600" />
                  <div>
            <div className="font-medium text-teal-900">View Salary Data</div>
            <div className="text-sm text-teal-700">Review uploaded salary records</div>
                  </div>
                </button>
                
                <button 
                  onClick={() => window.location.href = '/hr-management/directory'}
                  className="flex items-center gap-3 p-3 bg-white border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors text-left"
                >
                  <Users className="w-6 h-6 text-teal-600" />
                  <div>
            <div className="font-medium text-teal-900">Employee Directory</div>
            <div className="text-sm text-teal-700">Check employee profiles</div>
                  </div>
                </button>
                
                <button 
                  onClick={() => window.location.href = '/hr-management/payroll'}
                  className="flex items-center gap-3 p-3 bg-white border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors text-left"
                >
                  <Eye className="w-6 h-6 text-teal-600" />
                  <div>
                    <div className="font-medium text-teal-900">Payroll Overview</div>
                    <div className="text-sm text-teal-700">Generate payroll reports</div>
                  </div>
                </button>
              </div>
              
              <div className="mt-4 text-sm text-teal-700">
                💡 <strong>Tip:</strong> You can now view the uploaded data in the Salary Management section, 
                generate payroll reports, and export data for further analysis.
              </div>
            </div>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={uploading || !selectedFile || !month || !year}
          className="w-full mt-6 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload Salary Data
            </>
          )}
        </button>
          </div>
        )}

        {/* Attendance Upload Tab */}
        {activeTab === 'attendance' && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Upload Attendance Data
            </h3>
            
            {/* Template Download Section */}
            <div className="mb-6 p-4 bg-teal-50 rounded-lg border border-teal-200">
              <h3 className="font-medium text-teal-900 mb-2">📋 Download Attendance Template</h3>
              <p className="text-teal-700 text-sm mb-3">
                Download our Excel template to ensure your attendance data is formatted correctly.
              </p>
              <button
                onClick={handleDownloadAttendanceTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Attendance Template
              </button>
            </div>

            {/* Month and Year Selection */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <Dropdown
                  options={monthOptions}
                  value={attendanceMonth}
                  onChange={setAttendanceMonth}
                  placeholder="Select Month"
                  label="Month"
                  required
                />
              </div>
              <div>
                <Dropdown
                  options={yearOptions}
                  value={attendanceYear}
                  onChange={setAttendanceYear}
                  placeholder="Select Year"
                  label="Year"
                  required
                />
              </div>
            </div>

            {/* File Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                selectedAttendanceFile ? 'border-teal-300 bg-teal-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleAttendanceDrop}
              onDragOver={handleDragOver}
            >
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              
              {selectedAttendanceFile ? (
                <div>
                  <p className="text-teal-700 font-medium">{selectedAttendanceFile.name}</p>
                  <p className="text-teal-600 text-sm">File selected successfully</p>
                </div>
              ) : (
                <div>
                  <h4 className="text-lg font-medium mb-2">Drop your attendance Excel file here</h4>
                  <p className="text-gray-500 mb-4">or click to select a file</p>
                  <input
                    id="attendance-file-input"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleAttendanceFileSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="attendance-file-input"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Select File
                  </label>
                </div>
              )}
            </div>

            {/* Status Messages */}
            {attendanceUploadMessage && (
              <div className={`mt-4 p-4 rounded-lg flex items-center gap-2 ${
                attendanceUploadStatus === 'success' 
                  ? 'bg-teal-50 text-teal-700 border border-teal-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {attendanceUploadStatus === 'success' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                {attendanceUploadMessage}
              </div>
            )}

            {/* Error Details for Error Status */}
            {attendanceUploadStatus === 'error' && attendanceUploadResult && attendanceUploadResult.errors && attendanceUploadResult.errors.length > 0 && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-900 mb-2">⚠️ Errors Found:</h4>
                <div className="max-h-48 overflow-y-auto">
                  {attendanceUploadResult.errors.map((error: string, index: number) => (
                    <div key={index} className="text-sm text-red-700 mb-2 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="break-words">{error}</span>
                    </div>
                  ))}
                </div>
                
                {/* Error Resolution Tips */}
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h5 className="font-medium text-yellow-900 mb-2">🔧 How to Fix These Errors:</h5>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• <strong>Invalid Employee IDs:</strong> Check that all Employee IDs in your file exist in the employee directory</li>
                    <li>• <strong>Employee Not Found:</strong> Verify the employee is active and the ID is spelled correctly</li>
                    <li>• <strong>Missing Required Columns:</strong> Ensure your file has all required columns (Employee ID, Name, Department, Present Days, Absent Days, OT Hours, Late Minutes)</li>
                    <li>• <strong>Data Format Issues:</strong> Check that dates are in correct format and numeric fields contain valid numbers</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Upload Results and Next Steps */}
            {attendanceUploadStatus === 'success' && attendanceUploadResult && (
              <div className="mt-6 space-y-4">
                {/* Upload Summary */}
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                  <h3 className="font-medium text-teal-900 mb-3">📊 Upload Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-teal-600">{attendanceUploadResult.records_created || 0}</div>
                      <div className="text-teal-700">New Records</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-teal-600">{attendanceUploadResult.records_updated || 0}</div>
                      <div className="text-teal-700">Updated Records</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-orange-600">{attendanceUploadResult.total_errors || 0}</div>
                      <div className="text-orange-700">Errors</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {(attendanceUploadResult.records_created || 0) + (attendanceUploadResult.records_updated || 0)}
                      </div>
                      <div className="text-purple-700">Total Processed</div>
                    </div>
                  </div>
                  
                  {/* Error Details */}
                  {attendanceUploadResult.errors && attendanceUploadResult.errors.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-red-900 mb-2">⚠️ Errors Found:</h4>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                        {attendanceUploadResult.errors.map((error: string, index: number) => (
                          <div key={index} className="text-sm text-red-700 mb-2 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <span className="break-words">{error}</span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Error Resolution Tips */}
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h5 className="font-medium text-yellow-900 mb-2">🔧 How to Fix These Errors:</h5>
                        <ul className="text-sm text-yellow-800 space-y-1">
                          <li>• <strong>Invalid Employee IDs:</strong> Check that all Employee IDs in your file exist in the employee directory</li>
                          <li>• <strong>Employee Not Found:</strong> Verify the employee is active and the ID is spelled correctly</li>
                          <li>• <strong>Missing Required Columns:</strong> Ensure your file has all required columns (Employee ID, Name, Department, Present Days, Absent Days, OT Hours, Late Minutes)</li>
                          <li>• <strong>Data Format Issues:</strong> Check that dates are in correct format and numeric fields contain valid numbers</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {attendanceUploadResult.warnings && attendanceUploadResult.warnings.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-yellow-900 mb-2">⚠️ Warnings:</h4>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                        {attendanceUploadResult.warnings.map((warning: string, index: number) => (
                          <div key={index} className="text-sm text-yellow-700 mb-1">{warning}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Next Steps */}
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                  <h3 className="font-medium text-teal-900 mb-3">🎯 What's Next?</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <button 
                      onClick={() => window.location.href = '/hr-management/attendance'}
                      className="flex items-center gap-3 p-3 bg-white border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors text-left"
                    >
                      <Calendar className="w-6 h-6 text-teal-600" />
                      <div>
                        <div className="font-medium text-teal-900">View Attendance Log</div>
                        <div className="text-sm text-teal-700">Review uploaded attendance records</div>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => window.location.href = '/hr-management/directory'}
                      className="flex items-center gap-3 p-3 bg-white border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors text-left"
                    >
                      <Users className="w-6 h-6 text-teal-600" />
                      <div>
                        <div className="font-medium text-teal-900">Employee Directory</div>
                        <div className="text-sm text-teal-700">Check employee profiles and IDs</div>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => window.location.href = '/hr-management/payroll'}
                      className="flex items-center gap-3 p-3 bg-white border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors text-left"
                    >
                      <BarChart className="w-6 h-6 text-teal-600" />
                      <div>
                        <div className="font-medium text-teal-900">Generate Payroll</div>
                        <div className="text-sm text-teal-700">Use attendance data for payroll</div>
                      </div>
                    </button>
                  </div>
                  
                  <div className="mt-4 text-sm text-teal-700">
                    💡 <strong>Tip:</strong> If you have errors, fix the issues in your Excel file and upload again. 
                    The system will only process valid records and skip problematic ones.
                  </div>
                </div>
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={handleAttendanceUpload}
              disabled={attendanceUploading || !selectedAttendanceFile || !attendanceMonth || !attendanceYear}
              className="w-full mt-6 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {attendanceUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Attendance Data
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-medium text-gray-900 mb-3">📝 Upload Instructions</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• Download the appropriate template first and fill in your data</li>
          <li>• Ensure all required columns are filled correctly</li>
          <li>• Save the file as .xlsx or .xls format</li>
          <li>• Select the correct month and year before uploading</li>
          <li>• File size should not exceed 10MB</li>
          <li>• For attendance data, include employee ID, dates, and attendance status</li>
        </ul>
      </div>

      {/* Employee Confirmation Modal */}
      <EmployeeConfirmationModal
        isOpen={showEmployeeModal}
        onClose={() => {
          setShowEmployeeModal(false);
          setMissingEmployees([]);
          setPendingUploadData(null);
        }}
        onConfirm={handleEmployeeConfirmation}
        missingEmployees={missingEmployees}
        uploadType={pendingUploadData?.type || 'attendance'}
      />
    </div>
  );
};

export default HRDataUpload; 