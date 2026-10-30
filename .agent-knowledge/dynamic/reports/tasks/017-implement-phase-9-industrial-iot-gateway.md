# 017 — Implement Phase 9 Industrial IoT Gateway (MQTT Broker Ingestion / Euromap 77 OPC 40077 Standard)

Date: 2026-10-29

## Checklist

- [x] Provision Eclipse Mosquitto MQTT Broker in `docker-compose.yml` on port 1883/9001 with custom `mosquitto.conf`
- [x] Implement backend `IotGatewayModule`, `MqttIngestionService`, and `Euromap77MapperService` conforming to international plastics standard Euromap 77 (OPC 40077)
- [x] Support automatic translation of cyclic parameters, barrel PID temperatures, clamping force, and alarms to canonical `NormalizedMachineEventDto`
- [x] Connect inbound MQTT packets seamlessly to existing `TelemetryIngestionService` and WebSocket broadcasts
- [x] Author comprehensive Vitest unit test suites for `Euromap77MapperService` and `MqttIngestionService` (100% assertions green)
- [x] Create virtual factory edge gateway publisher script `backend/scripts/virtual-edge-gateway.ts` (`pnpm mock:edge`)
- [x] Add frontend diagnostics UI in `MachineDetailView.tsx` (`Euromap77DiagnosticsCard.tsx`) with raw MQTT packet inspector and one-click test frame dispatch
- [x] Add live IIoT Gateway status badge to global `Header.tsx`
- [x] Verify full monorepo linting (`oxlint`, 0 warnings, 0 errors) and production builds (`nest build`, `vite build`)

## Change Description

Engineered an Industry 4.0 Industrial IoT Gateway adapter enabling the MES to ingest live telemetry packets from physical or edge fieldbuses using standard MQTT (TCP/IP port 1883) and the official European Plastics Machinery Association Euromap 77 (OPC 40077) semantic model:
1. **Containerized Broker Infrastructure**: Configured Eclipse Mosquitto v2.0 in `docker-compose.yml` with persistent storage and log directories.
2. **Euromap 77 (OPC 40077) Semantic Mapper**: Converts incoming cyclic parameters (`CycleTime`, `InjectionTime`, `Cushion`, `PeakInjectionPressure`), clamping force (`ClampingForce`), 4-zone barrel heating PID temperatures (`HeatingZones`), part tallies (`Production`), and machine state/alarms into canonical `NormalizedMachineEventDto`.
3. **MQTT Ingestion & Telemetry Pipeline Integration**: Implemented auto-reconnecting MQTT client with circular packet ring buffer, topic wildcard subscription (`factory/+/+/+`), error tracking, and direct forwarding to `TelemetryIngestionService`.
4. **Virtual Edge Gateway Mock Publisher**: Built executable `backend/scripts/virtual-edge-gateway.ts` simulating 10 injection molding machines emitting real physics parameters without requiring physical PLC hardware.
5. **Frontend Diagnostics & Raw Packet Inspector**: Integrated `Euromap77DiagnosticsCard` into `MachineDetailView` featuring live tag mapping, packet status indicators, collapsible JSON inspector, and manual test frame dispatching.
6. **Global Gateway Health**: Added real-time MQTT broker connectivity indicator to `Header.tsx`.

## Modified Files

- `docker-compose.yml` — edit: Added `mosquitto` container and storage volumes
- `docker/mosquitto/mosquitto.conf` — add: Eclipse Mosquitto configuration
- `.env` — edit: Added `MQTT_ENABLED=true`, `MQTT_BROKER_URL`, and `MQTT_PORT`
- `.env.example` — edit: Added default IoT gateway environment variables
- `package.json` — edit: Added root `mock:edge` convenience script
- `backend/package.json` — edit: Added `mqtt` dependency and `mock:edge` script
- `backend/src/app.module.ts` — edit: Registered `IotGatewayModule`
- `backend/src/modules/iot-gateway/dto/euromap77-payload.dto.ts` — add: DTO schemas for OPC 40077 / Euromap 77 payloads
- `backend/src/modules/iot-gateway/services/euromap77-mapper.service.ts` — add: OPC 40077 to canonical event transformer
- `backend/src/modules/iot-gateway/services/euromap77-mapper.service.spec.ts` — add: Unit tests for semantic mapper
- `backend/src/modules/iot-gateway/services/mqtt-ingestion.service.ts` — add: MQTT broker subscriber and packet processor
- `backend/src/modules/iot-gateway/services/mqtt-ingestion.service.spec.ts` — add: Unit tests for MQTT ingestion service
- `backend/src/modules/iot-gateway/iot-gateway.controller.ts` — add: Gateway health and test frame dispatch endpoints
- `backend/src/modules/iot-gateway/iot-gateway.module.ts` — add: NestJS module declaration
- `backend/scripts/virtual-edge-gateway.ts` — add: Virtual factory edge gateway publisher script
- `frontend/src/types/iot-gateway.ts` — add: Type definitions for gateway status and raw packets
- `frontend/src/types/machine.ts` — edit: Extended `TelemetryMetrics` with clamping force and peak injection pressure
- `frontend/src/services/api.ts` — edit: Added IoT Gateway API endpoints
- `frontend/src/components/layout/Header.tsx` — edit: Added live IIoT MQTT Broker status badge
- `frontend/src/components/machines/detail/Euromap77DiagnosticsCard.tsx` — add: Fieldbus diagnostics and raw packet inspector
- `frontend/src/components/machines/detail/MachineDetailView.tsx` — edit: Embedded Euromap 77 diagnostics card

## Review

- Result: Phase 9 Industrial IoT Gateway & Euromap 77 Adapter successfully implemented and verified across backend, frontend, and tests.
- Verification: `pnpm lint` passed with 0 warnings and 0 errors; Vitest passed with 20 suites and 100 tests green (100%); NestJS and Vite builds succeeded without errors.
- Follow-up: Optional physical PLC hardware testing by pointing `MQTT_BROKER_URL` to factory gateway IP.

## UAT (User Acceptance Test) Verification

| # | Test | Result |
| --- | --- | --- |
| 1 | Automated Monorepo Code Quality (`pnpm lint`) | Pass (0 errors, 0 warnings across monorepo) |
| 2 | Backend Unit Test Suite (`pnpm --filter backend test`) | Pass (20 test suites, 100 tests green) |
| 3 | Euromap 77 Semantic Tag Mapping | Pass (Translates cycle time, injection time, cushion, clamp force, barrel temps, and alarms) |
| 4 | MQTT Broker Ingestion Resilience | Pass (Handles malformed JSON packets without crashing; maintains recent circular buffer) |
| 5 | Virtual Edge Gateway Script Compilation | Pass (`tsx scripts/virtual-edge-gateway.ts` compiles cleanly) |
| 6 | Frontend Production Bundle Compilation | Pass (`tsc -b && vite build` built in 2.44s) |
| 7 | Backend Production Bundle Compilation | Pass (`nest build` SWC 95 files built in 159ms) |
