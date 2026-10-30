import React, { useState } from 'react';
import { UserManagementView } from './UserManagementView.js';
import { AuditLogExplorerView } from './AuditLogExplorerView.js';
import { ShieldCheck, Users, ShieldAlert } from 'lucide-react';

type AdminTab = 'users' | 'audit';

export const AdminView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-[#DEEBFF] text-[#1558BC] rounded-md">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-[#292A2E]">
                Administration & Security Audit Explorer
              </h1>
            </div>
            <p className="text-xs text-[#505258] mt-1">
              Enterprise identity directory, 9-role canonical RBAC assignment, and tamper-evident mutation audit logs with visual diffs.
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 mt-5 border-t border-[#0B120E24] pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-all ${
              activeTab === 'users'
                ? 'bg-[#1868DB] text-[#FFFFFF] shadow-xs'
                : 'bg-transparent text-[#505258] hover:bg-[#F4F5F7] hover:text-[#292A2E]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Directory & Role Assignments</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-all ${
              activeTab === 'audit'
                ? 'bg-[#1868DB] text-[#FFFFFF] shadow-xs'
                : 'bg-transparent text-[#505258] hover:bg-[#F4F5F7] hover:text-[#292A2E]'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Security Audit Log Explorer</span>
          </button>
        </div>
      </div>

      {/* Tab View Content */}
      {activeTab === 'users' ? <UserManagementView /> : <AuditLogExplorerView />}
    </div>
  );
};
