export interface PermissionDefinition {
  key: string;
  module: string;
  action: string;
  resource: string;
  validScope: string;
  risk: 'Low' | 'Medium' | 'High' | 'Critical';
  isAudited: boolean;
  principal: string;
}

export const CANONICAL_PERMISSIONS: PermissionDefinition[] = [
  { key: 'security.user.read', module: 'Security', action: 'Read users', resource: 'User account', validScope: 'GLOBAL', risk: 'Medium', isAudited: true, principal: 'Human' },
  { key: 'security.user.manage', module: 'Security', action: 'Create/update/disable users and reset passwords', resource: 'User account', validScope: 'GLOBAL', risk: 'Critical', isAudited: true, principal: 'Human' },
  { key: 'security.role.read', module: 'Security', action: 'Read roles, assignments and effective access', resource: 'Role and assignment', validScope: 'GLOBAL', risk: 'Medium', isAudited: true, principal: 'Human' },
  { key: 'security.role.manage', module: 'Security', action: 'Create roles and maintain role permissions', resource: 'Role and permission mapping', validScope: 'GLOBAL', risk: 'Critical', isAudited: true, principal: 'Human' },
  { key: 'security.assignment.manage', module: 'Security', action: 'Assign scoped roles and revoke access', resource: 'User role assignment', validScope: 'GLOBAL', risk: 'Critical', isAudited: true, principal: 'Human' },
  { key: 'security.audit.read', module: 'Security', action: 'Read security and operational audit trails', resource: 'Audit log', validScope: 'GLOBAL', risk: 'High', isAudited: true, principal: 'Human' },
  { key: 'masterdata.read', module: 'Master data', action: 'Read plants, areas, machines, molds and products', resource: 'Master data', validScope: 'GLOBAL / PLANT', risk: 'Low', isAudited: false, principal: 'Human, Service' },
  { key: 'masterdata.manage', module: 'Master data', action: 'Create or update operational master data', resource: 'Master data', validScope: 'PLANT', risk: 'High', isAudited: true, principal: 'Human' },
  { key: 'production.order.read', module: 'Production', action: 'Read production orders and runs', resource: 'Production order/run', validScope: 'PLANT / AREA / MACHINE', risk: 'Low', isAudited: false, principal: 'Human, Service' },
  { key: 'production.schedule.read', module: 'Production', action: 'Read production schedule received from PPSS', resource: 'Production schedule', validScope: 'PLANT / AREA / MACHINE', risk: 'Low', isAudited: false, principal: 'Human, Service' },
  { key: 'production.run.start_stop', module: 'Production', action: 'Start, pause, resume or complete a run', resource: 'Production run', validScope: 'MACHINE', risk: 'High', isAudited: true, principal: 'Human' },
  { key: 'production.scrap.record', module: 'Production', action: 'Record scrap against a production run', resource: 'Production run', validScope: 'MACHINE', risk: 'Medium', isAudited: true, principal: 'Human' },
  { key: 'materials.lot.read', module: 'Production materials', action: 'Read WMS-issued material lots and genealogy context', resource: 'Material lot', validScope: 'PLANT / AREA / MACHINE', risk: 'Low', isAudited: false, principal: 'Human, Service' },
  { key: 'production.material.consume', module: 'Production materials', action: 'Record material consumption at the production machine', resource: 'Material consumption event', validScope: 'MACHINE', risk: 'High', isAudited: true, principal: 'Human' },
  { key: 'integration.qms.disposition.read', module: 'Integration', action: 'Read quality release, hold, reject, and quarantine status from QMS', resource: 'QMS disposition', validScope: 'PLANT / AREA / MACHINE', risk: 'Medium', isAudited: false, principal: 'Human, Service' },
  { key: 'integration.qms.event.write', module: 'Integration', action: 'Send run, lot, sample, and inspection-trigger context to QMS', resource: 'QMS quality event', validScope: 'PLANT / AREA / MACHINE', risk: 'High', isAudited: true, principal: 'Service' },
  { key: 'integration.mms.status.read', module: 'Integration', action: 'Read machine maintenance and release status from MMS', resource: 'MMS work-order status', validScope: 'PLANT / AREA / MACHINE', risk: 'Medium', isAudited: false, principal: 'Human, Service' },
  { key: 'integration.mms.request.write', module: 'Integration', action: 'Send machine fault and maintenance request context to MMS', resource: 'MMS maintenance request', validScope: 'PLANT / AREA / MACHINE', risk: 'High', isAudited: true, principal: 'Service' },
  { key: 'andon.read', module: 'Andon', action: 'Read Andon tickets and analytics', resource: 'Andon ticket', validScope: 'PLANT / AREA / MACHINE', risk: 'Low', isAudited: false, principal: 'Human' },
  { key: 'andon.create', module: 'Andon', action: 'Raise an Andon ticket', resource: 'Andon ticket', validScope: 'MACHINE', risk: 'Medium', isAudited: true, principal: 'Human' },
  { key: 'andon.respond', module: 'Andon', action: 'Acknowledge, assign and resolve Andon tickets', resource: 'Andon ticket', validScope: 'PLANT / AREA / MACHINE', risk: 'High', isAudited: true, principal: 'Human' },
  { key: 'oee.read', module: 'OEE and analytics', action: 'Read OEE, SPC, FMEA and operational analytics', resource: 'Analytics', validScope: 'PLANT / AREA / MACHINE', risk: 'Low', isAudited: false, principal: 'Human, Service' },
  { key: 'packaging.read', module: 'Packaging', action: 'Read packaging units and genealogy', resource: 'Packaging unit', validScope: 'PLANT / AREA / MACHINE', risk: 'Low', isAudited: false, principal: 'Human' },
  { key: 'packaging.manage', module: 'Packaging', action: 'Pack/reconcile cartons and print labels', resource: 'Packaging unit', validScope: 'MACHINE', risk: 'High', isAudited: true, principal: 'Human' },
  { key: 'traveler.read', module: 'Traveler', action: 'Read travelers and certificates of conformance', resource: 'Traveler', validScope: 'PLANT / AREA / MACHINE', risk: 'Low', isAudited: false, principal: 'Human' },
  { key: 'traveler.sign', module: 'Traveler', action: 'Sign required traveler steps', resource: 'Traveler signature', validScope: 'MACHINE', risk: 'High', isAudited: true, principal: 'Human' },
  { key: 'integration.ppss.order.read', module: 'Integration', action: 'Read PPSS inbound/outbound order state', resource: 'PPSS order', validScope: 'PLANT', risk: 'Medium', isAudited: true, principal: 'Human, Service' },
  { key: 'integration.ppss.order.write', module: 'Integration', action: 'Create/update/cancel PPSS-originated orders', resource: 'PPSS order', validScope: 'PLANT', risk: 'High', isAudited: true, principal: 'Human, Service' },
  { key: 'integration.wms.inventory.read', module: 'Integration', action: 'Read WMS material/finished-goods exchange state', resource: 'WMS inventory exchange', validScope: 'PLANT', risk: 'Medium', isAudited: true, principal: 'Human, Service' },
  { key: 'integration.wms.inventory.write', module: 'Integration', action: 'Post permitted MES inventory movements to WMS', resource: 'WMS inventory exchange', validScope: 'PLANT', risk: 'High', isAudited: true, principal: 'Human, Service' },
  { key: 'integration.erp.order.read', module: 'Integration', action: 'Read ERP order/status exchange state', resource: 'ERP order exchange', validScope: 'PLANT', risk: 'Medium', isAudited: true, principal: 'Human, Service' },
  { key: 'integration.erp.order.write', module: 'Integration', action: 'Post permitted MES production status to ERP', resource: 'ERP order exchange', validScope: 'PLANT', risk: 'High', isAudited: true, principal: 'Human, Service' },
  { key: 'integration.webhook.configure', module: 'Integration', action: 'Configure outbound webhook endpoint/events', resource: 'Webhook configuration', validScope: 'GLOBAL', risk: 'Critical', isAudited: true, principal: 'Human' },
];

export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  'System Administrator': CANONICAL_PERMISSIONS.map((p) => p.key),
  'Production Manager': [
    'masterdata.read',
    'production.order.read',
    'production.schedule.read',
    'production.run.start_stop',
    'production.scrap.record',
    'materials.lot.read',
    'production.material.consume',
    'andon.read',
    'andon.create',
    'andon.respond',
    'oee.read',
    'packaging.read',
    'packaging.manage',
    'traveler.read',
    'traveler.sign',
    'integration.qms.disposition.read',
    'integration.mms.status.read',
  ],
  'Production Supervisor': [
    'masterdata.read',
    'production.order.read',
    'production.schedule.read',
    'production.run.start_stop',
    'production.scrap.record',
    'materials.lot.read',
    'production.material.consume',
    'andon.read',
    'andon.create',
    'andon.respond',
    'oee.read',
    'packaging.read',
    'packaging.manage',
    'traveler.read',
    'traveler.sign',
    'integration.qms.disposition.read',
    'integration.mms.status.read',
  ],
  'Machine Operator': [
    'production.order.read',
    'production.schedule.read',
    'production.run.start_stop',
    'production.scrap.record',
    'materials.lot.read',
    'production.material.consume',
    'andon.read',
    'andon.create',
    'packaging.read',
    'packaging.manage',
    'traveler.read',
    'traveler.sign',
    'integration.qms.disposition.read',
    'integration.mms.status.read',
  ],
  'Production Read-only Analyst': [
    'masterdata.read',
    'production.order.read',
    'production.schedule.read',
    'materials.lot.read',
    'andon.read',
    'oee.read',
    'packaging.read',
    'traveler.read',
    'integration.qms.disposition.read',
    'integration.mms.status.read',
  ],
};

export const SERVICE_ACCOUNT_PERMISSIONS: Record<string, { clientId: string; permissions: string[]; scopeType: string }> = {
  PPSS: {
    clientId: 'service-ppss',
    permissions: ['integration.ppss.order.read', 'integration.ppss.order.write', 'masterdata.read'],
    scopeType: 'PLANT',
  },
  WMS: {
    clientId: 'service-wms',
    permissions: ['integration.wms.inventory.read', 'integration.wms.inventory.write', 'materials.lot.read'],
    scopeType: 'PLANT',
  },
  QMS: {
    clientId: 'service-qms',
    permissions: ['integration.qms.disposition.read', 'integration.qms.event.write'],
    scopeType: 'PLANT',
  },
  MMS: {
    clientId: 'service-mms',
    permissions: ['integration.mms.status.read', 'integration.mms.request.write'],
    scopeType: 'PLANT',
  },
  ERP: {
    clientId: 'service-erp',
    permissions: ['integration.erp.order.read', 'integration.erp.order.write', 'production.order.read', 'oee.read'],
    scopeType: 'PLANT',
  },
};
