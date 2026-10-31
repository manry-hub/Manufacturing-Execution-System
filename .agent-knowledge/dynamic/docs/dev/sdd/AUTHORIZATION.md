# Authorization — MES

> **Status:** `APPROVED TARGET DESIGN`  
> **Purpose:** Production-only RBAC and integration authorization policy.  
> **Companion artifact:** `.reference/RBAC_Authentication_Authorization_Matrix.xlsx`

## System boundary

MES is the Production department's execution system. PPIC operates PPSS; Warehouse operates WMS; Quality operates QMS; Maintenance/Engineering operates MMS; and ERP remains cross-functional. Their users do not receive MES roles merely because their system integrates with MES.

MES can display QMS disposition and MMS machine-release status that affects execution, but QMS owns inspection/NCR/CAPA/disposition and MMS owns PM/work orders/repair.

## Human roles

| Role | Responsibility | Scope |
| --- | --- | --- |
| System Administrator | Full MES administration and audited break-glass operational access | `GLOBAL` only |
| Production Manager | Production-performance ownership and oversight | Plant / area / machine |
| Production Supervisor | Active production supervision and exception response | Plant / area / machine |
| Machine Operator | Execution and recording at assigned machines | Machine |
| Production Read-only Analyst | Production execution and performance visibility | Plant / area / machine |

`System Administrator` has every catalog permission globally, including direct integration operations. It does not bypass audit logging, input validation, rate limits, or session controls; the final active System Administrator cannot be removed or disabled.

## RBAC and scope rules

- The application owns the permission catalog. Administrators may create roles and combine catalog permissions, but cannot create arbitrary permission keys.
- Every user-role assignment has `GLOBAL`, `PLANT`, `AREA`, or `MACHINE` scope. Effective permissions are the union of active assignments.
- `PLANT` covers child areas/machines; `AREA` covers child machines; `MACHINE` covers only that machine and its machine-bound records.
- Backend policy enforcement is authoritative. Frontend visibility is never authorization.
- APIs are default-deny. A request needs both the explicit permission and a scope that contains the target resource.
- Return `401` for missing/invalid/expired/revoked identity and `403` for missing permission or scope.

## Default permission matrix

| Permission group | Admin | Manager | Supervisor | Operator | Analyst |
| --- | --- | --- | --- | --- | --- |
| `security.*` administration and audit | ✓ | — | — | — | — |
| Master-data read / manage | ✓ | read | read | — | read |
| Production order/schedule read | ✓ | ✓ | ✓ | ✓ | ✓ |
| Run start/stop and scrap recording | ✓ | ✓ | ✓ | ✓ | — |
| Material-lot read and production consumption record | ✓ | ✓ | ✓ | ✓ | — |
| Andon read/create/respond | ✓ | ✓ | ✓ | create/read | read |
| OEE and execution analytics read | ✓ | ✓ | ✓ | — | ✓ |
| Packaging and traveler execution | ✓ | ✓ | ✓ | ✓ | read |
| QMS disposition and MMS status read | ✓ | ✓ | ✓ | ✓ | ✓ |
| Integration configuration/direct operations | ✓ | — | — | — | — |

## Integration authorization

| System | Service permissions | Operational source of truth |
| --- | --- | --- |
| PPSS | `integration.ppss.order.read`, `integration.ppss.order.write`, `masterdata.read` | Planning and scheduling |
| WMS | `integration.wms.inventory.read`, `integration.wms.inventory.write`, `materials.lot.read` | Inventory and warehouse movements |
| QMS | `integration.qms.disposition.read`, `integration.qms.event.write` | Inspection and disposition |
| MMS | `integration.mms.status.read`, `integration.mms.request.write` | PM, work orders, repairs, and release |
| ERP | `integration.erp.order.read`, `integration.erp.order.write`, `production.order.read`, `oee.read` | Enterprise transactions |

Each service account is restricted to the plant scope and endpoints required for its exchange. New endpoints cannot ship without a catalog permission, scope rule, enforcement entry, and authorization tests.
