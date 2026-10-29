# 024 — Implement Phase 14 Industrial IoT Protocol Connectors (Modbus TCP Gateway & Ingestion Source Selector)

Date: 2026-10-30

## Checklist

- [x] Extend `SourceTypeEnum` in `NormalizedMachineEventDto` with `MODBUS_TCP`
- [x] Implement `IngestSourceSelectorService` to manage telemetry source mode per machine (`SIMULATOR`, `MQTT`, `MODBUS_TCP`)
- [x] Implement `ModbusTcpGatewayService` with high-performance native TCP server (`0.0.0.0:5502`) and client poller for holding registers (FC 03, FC 04, FC 06, FC 16)
- [x] Standardize 16-register industrial map (Machine Status, Shot Counter High/Low, Cycle Time, Cushion, Peak Pressure, Clamping Force, Barrel Temps Zone 1-4, Fault Code ID)
- [x] Convert holding registers directly to canonical `NormalizedMachineEventDto` and route to `TelemetryIngestionService`
- [x] Integrate source gating in `SimulatorService.tick()` (skips virtual simulation ticks for machines set to fieldbus streams)
- [x] Expose controller endpoints: `GET /iot-gateway/ingest-sources`, `PUT /iot-gateway/ingest-sources/:machineCode`, `GET /iot-gateway/modbus/status`, `POST /iot-gateway/modbus/write-register`, `POST /iot-gateway/modbus/poll/:machineCode`
- [x] Add developer virtual Modbus PLC simulation script `backend/scripts/modbus-plc-simulator.ts` (`pnpm mock:modbus`)
- [x] Build frontend `IngestSourceSelectorCard.tsx` with 3-way visual mode switcher, Modbus host/port/unit configuration, live register bank inspector table, and direct register test writer
- [x] Author comprehensive unit tests in `modbus-tcp-gateway.service.spec.ts` (125/125 backend tests passing)
- [x] Verify zero warnings and zero errors in `oxlint`
- [x] Verify production bundle compilation (`vite build` and `nest build`)

## Change Description

Engineered **Phase 14 (Epic 12: Industrial IoT Protocol Connectors)**, completing multi-protocol shop-floor machine connectivity:
1. **Modbus TCP Gateway (Server & Client Poller)**:
   - Built native, zero-dependency Node.js TCP socket server (`node:net`) listening on port 5502 (configurable via `MODBUS_TCP_PORT`).
   - Implements official Modbus Application Protocol Specification V1.1b3 framing with MBAP 7-byte header and PDU handling for Function Codes:
     - `0x03` / `0x04`: Read Holding / Input Registers
     - `0x06`: Write Single Holding Register
     - `0x10`: Write Multiple Holding Registers
   - Implements automated periodic Modbus client poller that queries physical remote PLCs over TCP/IP and ingests registers.
2. **Standard 16-Register Injection Molding Holding Map**:
   - `40001`: Machine State (`1`=RUNNING, `2`=IDLE, `3`=SETUP, `4`=STOPPED, `5`=FAULT, `6`=DISCONNECTED)
   - `40002 - 40003`: 32-bit Total Shot Counter (High/Low words)
   - `40004`: Cycle Time ($0.1\text{s}$)
   - `40005`: Injection Time ($0.1\text{s}$)
   - `40006`: Cushion Position ($0.01\text{mm}$)
   - `40007`: Peak Injection Pressure ($\text{bar}$)
   - `40008`: Clamping Force ($\text{kN}$)
   - `40009 - 40013`: Barrel PID Temperature Zones 1-4 & Nozzle ($0.1^\circ\text{C}$)
   - `40014`: Fault Code ID (`101`=Zone 1 Thermocouple, `102`=Hydraulic Pressure, `103`=Safety Gate, `104`=Hopper Level)
   - `40015 - 40016`: Good & Scrap Part tallies
3. **Ingestion Source Selector Engine**:
   - Manages active telemetry routing per machine (`SIMULATOR`, `MQTT`, `MODBUS_TCP`).
   - Dynamically mutes `SimulatorService` ticks on specific machines when switched to external fieldbus protocols (`MQTT` or `MODBUS_TCP`), preventing simulated data from corrupting real PLC streams.
4. **Developer Tooling & Scripts**:
   - Added `backend/scripts/modbus-plc-simulator.ts` executable via `pnpm mock:modbus` to simulate a live physical PLC continuously writing PID temperatures and shot strokes over TCP socket.
5. **Frontend Diagnostics & Fieldbus Selector Card**:
   - Implemented `IngestSourceSelectorCard.tsx` in `MachineDetailView.tsx`.
   - Features 3-way visual selector cards, live connection badges, host/port/unit ID settings, live 16-register table inspector, and interactive register injection test writer.

## Modified Files

- `backend/package.json` — edit (added `mock:modbus` script)
- `package.json` — edit (added root `mock:modbus` shortcut)
- `backend/src/modules/telemetry/dto/normalized-machine-event.dto.ts` — edit (added `MODBUS_TCP` to `SourceTypeEnum`)
- `backend/src/modules/iot-gateway/dto/modbus-config.dto.ts` — add (Modbus DTO schemas)
- `backend/src/modules/iot-gateway/services/ingest-source-selector.service.ts` — add (telemetry mode registry)
- `backend/src/modules/iot-gateway/services/modbus-tcp-gateway.service.ts` — add (Modbus TCP server, client poller, and register encoder/decoder)
- `backend/src/modules/iot-gateway/services/modbus-tcp-gateway.service.spec.ts` — add (unit test suite)
- `backend/src/modules/iot-gateway/services/mqtt-ingestion.service.ts` — edit (integrated with ingest source selector)
- `backend/src/modules/iot-gateway/iot-gateway.controller.ts` — edit (added ingest source and Modbus endpoints)
- `backend/src/modules/iot-gateway/iot-gateway.module.ts` — edit (registered and exported Modbus & Ingest services)
- `backend/src/modules/simulator/simulator.service.ts` — edit (added source selector gating)
- `backend/src/modules/simulator/simulator.module.ts` — edit (imported `IotGatewayModule`)
- `backend/scripts/modbus-plc-simulator.ts` — add (virtual Modbus PLC script)
- `frontend/src/types/iot-gateway.ts` — edit (added Modbus & Ingest Source types)
- `frontend/src/services/api.ts` — edit (added API client endpoints)
- `frontend/src/components/machines/detail/IngestSourceSelectorCard.tsx` — add (interactive selector & register table)
- `frontend/src/components/machines/detail/MachineDetailView.tsx` — edit (embedded IngestSourceSelectorCard)

## Review

- Result: Phase 14 / Epic 12 Industrial IoT Protocol Connectors (MQTT, Modbus TCP Gateway, and Ingestion Source Selector) completed and verified end-to-end.
- Verification: Monorepo linting passed cleanly with 0 errors/0 warnings (`oxlint`). Vitest backend test suite passed 100% (125/125 tests passing in 22 test files). Frontend build (`tsc -b && vite build`) and backend build (`nest build`) completed with zero errors.

## UAT (User Acceptance Test) Verification

| # | Test | Result |
| --- | --- | --- |
| 1 | Decode Modbus TCP FC 03 Read Holding Registers request and return correct bytes | Pass |
| 2 | Handle Modbus TCP FC 06 Write Single Register and echo response | Pass |
| 3 | Handle Modbus TCP FC 16 Write Multiple Registers and trigger telemetry ingestion | Pass |
| 4 | Convert holding registers to canonical `NormalizedMachineEventDto` with `MODBUS_TCP` source | Pass |
| 5 | Ingestion Source Selector switches machine source between Simulator, MQTT, and Modbus TCP | Pass |
| 6 | Simulator skips generating events for machines assigned to MQTT or Modbus TCP | Pass |
| 7 | Modbus PLC simulator script compilation (`pnpm mock:modbus`) | Pass |
| 8 | Render `IngestSourceSelectorCard` in `MachineDetailView` with live registers table | Pass |
| 9 | Monorepo lint and build verification (`oxlint`, `vitest`, `vite build`, `nest build`) | Pass |
