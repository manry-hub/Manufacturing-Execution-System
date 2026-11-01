export type ScopeNodeType = 'GLOBAL' | 'PLANT' | 'AREA' | 'MACHINE';

export interface ScopeNode {
  id: string;
  parentId: string | null;
  type: ScopeNodeType;
  code: string;
  name: string;
  path: string;
  isActive: boolean;
  plantId?: string | null;
  areaId?: string | null;
  machineId?: string | null;
  children?: ScopeNode[];
  _count?: {
    roleAssignments: number;
    children?: number;
  };
}

export interface IamPermission {
  id: string;
  key: string;
  code: string;
  module: string;
  action: string;
  resource: string;
  validScope?: string;
  description: string | null;
  isCritical: boolean;
}

export interface IamRole {
  id: string;
  name: string;
  description: string | null;
  isBuiltin: boolean;
  applicableNodeTypes: string; // JSON array string
  rolePermissions: Array<{
    permission: IamPermission;
  }>;
  _count?: {
    roleAssignments: number;
  };
}

export interface IamRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  scopeNodeId: string;
  validFrom: string;
  validTo: string | null;
  grantedBy: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    name?: string | null;
    email: string;
    isActive: boolean;
  };
  role: {
    id: string;
    name: string;
    isBuiltin: boolean;
    applicableNodeTypes: string;
  };
  scopeNode: {
    id: string;
    name: string;
    code: string;
    type: ScopeNodeType;
    path: string;
    isActive: boolean;
  };
}

export interface RoleImpactPreview {
  roleId: string;
  roleName: string;
  affectedUserCount: number;
  affectedAssignmentsCount: number;
  affectedUsers: Array<{
    id: string;
    username: string;
    name: string | null;
    email: string;
  }>;
}

export interface EffectiveAccessResponse {
  userId: string;
  targetNodeId: string;
  targetNodePath: string;
  permissions: Array<{
    code: string;
    module: string;
    description: string | null;
    isCritical: boolean;
    grantedByRoles: string[];
  }>;
  matchingAssignments: Array<{
    id: string;
    roleName: string;
    scopeNodePath: string;
    validFrom: string;
    validTo: string | null;
  }>;
}

export interface CanCheckResponse {
  allowed: boolean;
  reason: string;
  matchedAssignments: Array<{
    assignmentId: string;
    roleName: string;
    scopeNodePath: string;
    permissionCode: string;
  }>;
}
