# 031 — Create RBAC authentication and authorization workbook

Date: 2026-10-31

## Checklist

- [x] Create an Excel RBAC matrix and authentication/authorization reference workbook.
- [x] Include human roles, scoped permissions, service accounts, API controls, and audit rules.
- [x] Keep secrets and production identities out of the workbook.
- [x] Publish the approved design as canonical SDD Markdown documentation.

## Change Description

Added a reusable English-language workbook generator and its generated XLSX reference. The workbook documents the approved local-account, scoped-RBAC, client-credentials integration model for the MES. System Administrator is explicitly documented as the GLOBAL full-access role for every catalog permission, including integration operations. The matrix was revised so MES is operated only by Production; PPSS, WMS, QMS, MMS, and ERP have dedicated service accounts and retain their departmental workflows.

## Modified Files

- `.reference/.generate_rbac_workbook.py` — add XLSX generator.
- `.reference/RBAC_Authentication_Authorization_Matrix.xlsx` — add generated RBAC workbook.
- `.agent-knowledge/dynamic/docs/dev/sdd/AUTHENTICATION.md` — add authentication and session specification.
- `.agent-knowledge/dynamic/docs/dev/sdd/AUTHORIZATION.md` — add production-only RBAC and integration authorization specification.
- `.agent-knowledge/dynamic/docs/dev/sdd/SECURITY.md` — add security, audit, secret-handling, and privileged-access specification.
- `.agent-knowledge/dynamic/docs/README.md` — map the canonical specification in the living-document index.
- `.agent-knowledge/dynamic/reports/tasks/031-create-rbac-authentication-authorization-workbook.md` — add task report.

## Review

- Result: Workbook generated with twelve sheets and canonical SDD Markdown covering production-only human roles, scope, authentication, integration identities, audit, and API enforcement.
- Verification: The XLSX package passed `unzip -t`; all OOXML/XML parts parsed successfully; the workbook contains 12 worksheets, production-only role decisions, QMS/MMS service accounts, and scoped-assignment dropdowns. The Markdown document contains the System Administrator full-access policy, production-only RBAC matrix, authentication policy, integration policy, and 401/403 enforcement semantics.
- Follow-up: Use the workbook as the approval baseline before implementing the backend authorization model.

## UAT (User Acceptance Test) Verification

| # | Test | Result |
| --- | --- | --- |
| 1 | Open workbook in a spreadsheet application and confirm its matrices support the intended access-governance review. | Not tested — requires user review in their spreadsheet application. |
