import React, { useState } from 'react';
import { X, Users, AlertTriangle, CheckCircle, UserPlus } from 'lucide-react';

interface MissingEmployee {
  employee_id: string;
  name: string;
  first_name: string;
  last_name: string;
  department: string;
  row_number: number;
}

interface EmployeeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (missingEmployees: MissingEmployee[]) => void;
  missingEmployees: MissingEmployee[];
  uploadType: 'attendance' | 'salary';
}

const EmployeeConfirmationModal: React.FC<EmployeeConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  missingEmployees,
  uploadType
}) => {
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsCreating(true);
    try {
      await onConfirm(missingEmployees);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Missing Employees Found
              </h2>
              <p className="text-sm text-gray-600">
                {missingEmployees.length} employees need to be created before uploading {uploadType} data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Warning Message */}
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-orange-900 mb-2">
                  Action Required
                </h3>
                <p className="text-sm text-orange-800">
                  The following employees were found in your {uploadType} file but don't exist in the system. 
                  Click "Create Employees & Continue Upload" to automatically create these employees with default settings, 
                  then proceed with the {uploadType} upload.
                </p>
              </div>
            </div>
          </div>

          {/* Employee List */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Employees to be Created ({missingEmployees.length})
            </h3>
            
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Row
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {missingEmployees.map((employee, index) => (
                      <tr key={employee.employee_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {employee.row_number}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {employee.employee_id}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {employee.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {employee.department || 'Not specified'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Default Settings Info */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Default Settings for New Employees
            </h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• <strong>Employment Type:</strong> Full Time</p>
              <p>• <strong>Designation:</strong> Employee</p>
              <p>• <strong>Shift:</strong> 9:00 AM - 6:00 PM</p>
              <p>• <strong>Off Days:</strong> Saturday & Sunday</p>
              <p>• <strong>Joining Date:</strong> Today's date</p>
              <p>• <strong>Email:</strong> Auto-generated from Employee ID</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            💡 You can update employee details later in the Employee Directory
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isCreating}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Employees & Continue Upload
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeConfirmationModal;
