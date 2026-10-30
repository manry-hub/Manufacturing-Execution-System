# 028 — Implement Native OPC UA Client Daemon and Raw ZPL Network Printer Driver

Date: 2026-10-30

## Checklist

- [x] Install and configure `node-opcua-client` in backend
- [x] Implement `OpcUaClientDaemonService` (`backend/src/modules/iot-gateway/services/opcua-client-daemon.service.ts`) for binary OPC UA TCP connectivity to Euromap 77 nodes
- [x] Extend `IngestSourceSelectorService` and DTOs to support `'OPC_UA'` source mode
- [x] Add OPC UA daemon status and management endpoints to `IotGatewayController`
- [x] Implement `NetworkPrinterService` (`backend/src/modules/packaging/services/network-printer.service.ts`) with raw TCP socket (port 9100) and ZPL-II label generator
- [x] Add network printer endpoints to `PackagingController`
- [x] Create unit tests for `OpcUaClientDaemonService` and `NetworkPrinterService`
- [x] Update frontend `CartonLabelModal.tsx` and `api.ts` to allow direct raw ZPL network printing
- [x] Verify lint (`oxlint`), tests (`vitest`), and builds (`nest build`, `vite build`)
- [x] Await user permission before git commit or push (per `GIT.md` rules)

## Change Description

Implementing factory-floor hardware protocols:
1. **Native OPC UA Client Daemon:**
   - Binary TCP stack (`opc.tcp://<host>:4840`) connecting directly to physical/virtual PLC endpoints.
   - Subscribes to Euromap 77 / OPC 40077 nodes (cyclic parameters, zone temperatures, status, clamp force).
   - Ingests normalized events into MES telemetry engine with automatic reconnection backoff.
   - Dynamic per-machine source selection (`OPC_UA`).
2. **Hardware Network Thermal Printer Driver:**
   - Raw TCP socket stream to port 9100 (standard JetDirect) for Zebra, Honeywell, and Sato industrial label printers.
   - ZPL-II generator creating compliant barcode/QR labels with inspection disposition and metadata.
   - Network printer management API and direct print trigger from packaging UI modal.

## Modified Files

- `backend/package.json` — edit
- `backend/src/modules/iot-gateway/dto/modbus-config.dto.ts` — edit
- `backend/src/modules/iot-gateway/dto/opcua-config.dto.ts` — add
- `backend/src/modules/iot-gateway/services/opcua-client-daemon.service.ts` — add
- `backend/src/modules/iot-gateway/services/opcua-client-daemon.service.spec.ts` — add
- `backend/src/modules/iot-gateway/services/ingest-source-selector.service.ts` — edit
- `backend/src/modules/iot-gateway/iot-gateway.controller.ts` — edit
- `backend/src/modules/iot-gateway/iot-gateway.module.ts` — edit
- `backend/src/modules/packaging/services/network-printer.service.ts` — add
- `backend/src/modules/packaging/services/network-printer.service.spec.ts` — add
- `backend/src/modules/packaging/dto/print-label.dto.ts` — add
- `backend/src/modules/packaging/packaging.controller.ts` — edit
- `backend/src/modules/packaging/packaging.module.ts` — edit
- `backend/src/modules/packaging/packaging.service.ts` — edit
- `frontend/src/types/packaging.ts` — edit
- `frontend/src/services/api.ts` — edit
- `frontend/src/components/packaging/CartonLabelModal.tsx` — edit

## Review

- Result: PASS
- Verification:
  - `oxlint`: 0 warnings, 0 errors across frontend and backend.
  - `vitest`: 156 passed across 28 test suites (including 5 tests for OPC UA daemon and 5 tests for Network Printer driver).
  - `nest build`: 0 issues, 112 files compiled.
  - `vite build`: bundle generated cleanly.
- Follow-up: Adhering to `GIT.md`, waiting for explicit user confirmation before committing and pushing.

## UAT (User Acceptance Test) Verification

| # | Test | Result |
| --- | --- | --- |
| 1 | Binary OPC UA client session lifecycle and node polling | PASS |
| 2 | Euromap 77 node mapping to normalized telemetry event | PASS |
| 3 | Ingest source selector switches machine to OPC_UA mode | PASS |
| 4 | ZPL-II label generator outputs compliant format with barcode and QR | PASS |
| 5 | Raw socket dispatch to port 9100 with timeout handling | PASS |
| 6 | Frontend CartonLabelModal triggers network print with live feedback | PASS |
