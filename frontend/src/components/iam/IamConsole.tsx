import React, { useState } from 'react';
import {
  FolderTree,
  Shield,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { ScopeTreeView } from './ScopeTreeView.js';
import { RoleManagerView } from './RoleManagerView.js';
import { AssignmentManagerView } from './AssignmentManagerView.js';
import { EffectiveAccessInspectorView } from './EffectiveAccessInspectorView.js';
import { IamAuditLogView } from './IamAuditLogView.js';

type IamTab = 'tree' | 'roles' | 'assignments' | 'inspector' | 'audit';

export const IamConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<IamTab>('tree');

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation */}
      <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-[#DEEBFF] text-[#1868DB] rounded-md">
                <FolderTree className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-[#292A2E]">
                Enterprise IAM & Hierarchical Scoped RBAC Console
              </h1>
            </div>
            <p className="text-xs text-[#505258] mt-1">
              Multi-plant injection molding access control with materialized scope paths (<code className="font-mono bg-[#EBECF0] px-1 py-0.5 rounded text-[11px]">GLOBAL -&gt; PLANT -&gt; AREA -&gt; MACHINE</code>), automatic downward inheritance, and System Administrator super-user authority.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-5 border-t border-[#0B120E24] pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('tree')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'tree'
                ? 'bg-[#1868DB] text-[#FFFFFF] shadow-xs'
                : 'bg-transparent text-[#505258] hover:bg-[#F4F5F7] hover:text-[#292A2E]'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Scope Tree Hierarchy</span>
          </button>

          <button
            onClick={() => setActiveTab('roles')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'roles'
                ? 'bg-[#1868DB] text-[#FFFFFF] shadow-xs'
                : 'bg-transparent text-[#505258] hover:bg-[#F4F5F7] hover:text-[#292A2E]'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Role & Permission Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab('assignments')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'assignments'
                ? 'bg-[#1868DB] text-[#FFFFFF] shadow-xs'
                : 'bg-transparent text-[#505258] hover:bg-[#F4F5F7] hover:text-[#292A2E]'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Scoped Role Assignments</span>
          </button>

          <button
            onClick={() => setActiveTab('inspector')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'inspector'
                ? 'bg-[#1868DB] text-[#FFFFFF] shadow-xs'
                : 'bg-transparent text-[#505258] hover:bg-[#F4F5F7] hover:text-[#292A2E]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Effective Access Inspector & can()</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-[#1868DB] text-[#FFFFFF] shadow-xs'
                : 'bg-transparent text-[#505258] hover:bg-[#F4F5F7] hover:text-[#292A2E]'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Security Audit Trail</span>
          </button>
        </div>
      </div>

      {/* Active Tab View */}
      {activeTab === 'tree' && <ScopeTreeView />}
      {activeTab === 'roles' && <RoleManagerView />}
      {activeTab === 'assignments' && <AssignmentManagerView />}
      {activeTab === 'inspector' && <EffectiveAccessInspectorView />}
      {activeTab === 'audit' && <IamAuditLogView />}
    </div>
  );
};
