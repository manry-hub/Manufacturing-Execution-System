# Implementation Workflow 008: Industrial IoT Gateway Adapter (MQTT Broker Ingestion / Euromap 77 OPC UA Connector)

**Status:** PROPOSED PLAN — READY FOR STAGED EXECUTION  
**Target Completion:** Phase 9 / Option 4 (Industry 4.0 Standard Euromap 77 OPC 40077 Mapping, MQTT Broker Ingestion, and Virtual Edge Gateway Simulation)  
**References:**
- Product Requirements: [PRD.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/PRD.md)
- System Architecture: [ARCHITECTURE.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/sdd/ARCHITECTURE.md)
- Normalized Telemetry Schema: [normalized-machine-event.dto.ts](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/backend/src/modules/telemetry/dto/normalized-machine-event.dto.ts)
- Design System Tokens: [DESIGN.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/DESIGN.md)

---

## 1. Executive Summary & Problem Statement

In modern plastics processing facilities, connecting heavy machinery to an MES without proprietary vendor lock-in relies on two international Industry 4.0 standards:
1. **Euromap 77 (OPC 40077 / VDMA 40077)**: The official worldwide semantic information model developed jointly by the European Plastics and Rubber Machinery Association (EUROMAP) and the OPC Foundation. Major injection molding machine builders (Engel, KraussMaffei, Arburg, Haitian, Sumitomo Demag, Fanuc Roboshot) expose this standard natively on their machine controllers.
2. **MQTT (Message Queuing Telemetry Transport)**: Lightweight publish/subscribe protocol commonly adopted by plant-floor Industrial Edge Gateways (e.g. Advantech WISE, Siemens SIMATIC IOT2050, Moxa UC, or industrial Raspberry Pi gateways) that poll machine PLC registers via Modbus/Profinet and broadcast JSON/Sparkplug B packets over TCP port 1883.

### The Objective:
Transform the MES backend so that it seamlessly ingests live field telemetry from physical or edge devices without requiring physical PLC hardware on the developer workstation. 

### Why No Physical PLC Is Needed:
- In production, PLCs and edge gateways communicate via standard TCP/IP network sockets.
- By provisioning a lightweight, containerized **Eclipse Mosquitto MQTT Broker** via Docker Compose and pairing it with a **Virtual Factory Edge Gateway / Euromap 77 Mock Publisher**, the MES backend receives packets identical down to the byte structure, topic namespace, and semantic schema to real factory hardware.
- When deployed onto a factory shop floor, only the MQTT broker address needs to point to the factory gateway IP (`192.168.x.x`) with **zero code modifications**.

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                        INDUSTRIAL IOT GATEWAY ARCHITECTURE & FLOW                                      │
└───────────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                    │
                 ┌──────────────────────────────────┴──────────────────────────────────┐
                 ▼                                                                     ▼
   ┌───────────────────────────┐                                         ┌───────────────────────────┐
   │ Physical Factory Machine  │                                         │ Virtual Edge Gateway Mock │
   │ (Engel / KraussMaffei)    │                                         │ (backend/scripts/edge.ts) │
   │ - Euromap 77 OPC UA Server│                                         │ - Simulates 10 IMM Nodes  │
   │ - Edge Advantech / Siemens│                                         │ - Publishes Euromap 77    │
   └─────────────┬─────────────┘                                         └─────────────┬─────────────┘
                 │                                                                     │
                 └──────────────────────────────────┬──────────────────────────────────┘
                                                    │ (TCP/IP Port 1883)
                                                    ▼
                                     ┌─────────────────────────────┐
                                     │  Eclipse Mosquitto Broker   │
                                     │  (Docker Container: mes-mqtt│
                                     │   Topic: factory/+/imm-+/+) │
                                     └──────────────┬──────────────┘
                                                    │
                                                    ▼
                                     ┌─────────────────────────────┐
                                     │   MqttIngestionService      │
                                     │   - Auto-reconnect & Health │
                                     │   - Topic Pattern Matcher   │
                                     └──────────────┬──────────────┘
                                                    │
                                                    ▼
                                     ┌─────────────────────────────┐
                                     │   Euromap77MapperService    │
                                     │   - OPC 40077 Tag Extractor │
                                     │   - Transforms to Canonical │
                                     │     NormalizedMachineEvent  │
                                     └──────────────┬──────────────┘
                                                    │
                                                    ▼
                                     ┌─────────────────────────────┐
                                     │  TelemetryIngestionService  │
                                     │  - Idempotency De-duplication│
                                     │  - State Projection (O(1))  │
                                     │  - Downtime Segment Slicing │
                                     │  - Event Log Audit Trail    │
                                     └──────────────┬──────────────┘
                                                    │
                                                    ▼
                                     ┌─────────────────────────────┐
                                     │   TelemetryGateway (WS)     │
                                     │   - Broadcasts to Frontend  │
                                     │   - Updates Gauges & OEE    │
                                     └─────────────────────────────┘
```

---

## 2. Technical Standards & Tag Mapping

### 2.1 Euromap 77 / OPC 40077 Semantic Model

Euromap 77 defines standardized object classes for injection molding machines:

| Euromap 77 Node / Parameter | Data Type | Physical Unit | MES Canonical Field | Description |
|---|---|---|---|---|
| `CyclicParameters.CycleTime` | Float | Seconds (s) | `metrics.cycleTimeSeconds` | Duration of the last completed mold clamp-to-eject cycle. |
| `CyclicParameters.InjectionTime` | Float | Seconds (s) | `metrics.injectionTimeSeconds` | Time taken to fill cavity during primary high-pressure stroke. |
| `CyclicParameters.Cushion` | Float | Millimeters (mm) | `metrics.cushionPositionMm` | Distance of screw tip from nozzle seat at holding pressure transfer. |
| `CyclicParameters.PeakInjectionPressure` | Float | Bar | `metrics.peakInjectionPressureBar` | Maximum hydraulic/melt pressure recorded during injection fill. |
| `ClampingUnit.ClampingForce` | Float | Kilonewtons (kN) | `metrics.clampingForceKn` | Actual tonnage applied by clamp toggle/ram to seal parting line. |
| `HeatingZones.ZoneTemperatures` | Array[Float] | Celsius (°C) | `metrics.barrelTemperatures` | Zone 1 to Zone 4 barrel PID heating band temperatures. |
| `Production.TotalParts` | Integer | Pieces (pcs) | `metrics.cycleCounter` | Hardware shot counter incremented by mechanical cam / PLC. |
| `MouldStatus` | Enum | - | `rawStatus` | `OPEN`, `CLOSED`, `CLAMPED`, `MOVING`, `EJECTING`. |
| `MachineStatus` | Enum | - | `normalizedStatus` | `RUNNING`, `IDLE`, `SETUP`, `STOPPED`, `FAULT`. |
| `ActiveAlarms.FaultCode` | String | - | `fault.faultCode` | Specific active PLC error code (e.g. `ALM-HYD-01`, `ALM-TEMP-04`). |

### 2.2 MQTT Topic Architecture

Topics follow a hierarchical industrial layout:
```text
factory/<plantId>/<machineCode>/<channel>
```

Examples:
- `factory/plant-1/IMM-01/telemetry`: High-frequency sensor samples (barrel temps, hydraulic pressure, cushion).
- `factory/plant-1/IMM-01/cycle`: Cycle completion event emitted at mold open (shots counter, cycle time).
- `factory/plant-1/IMM-01/state`: Machine state transitions (RUNNING, STOPPED, FAULT, IDLE).
- `factory/plant-1/IMM-01/euromap77`: Full raw Euromap 77 JSON payload bundle.

### 2.3 Sample Euromap 77 JSON Payload

```json
{
  "timestamp": "2026-10-29T21:30:00.000Z",
  "machineCode": "IMM-01",
  "protocol": "EUROMAP_77",
  "version": "1.0",
  "cyclicParameters": {
    "cycleTime": 22.4,
    "injectionTime": 3.8,
    "cushion": 4.25,
    "peakInjectionPressure": 136.2
  },
  "clampingUnit": {
    "clampingForce": 1470.0,
    "mouldStatus": "CLOSED"
  },
  "heatingZones": {
    "zoneTemperatures": [205.1, 215.4, 228.2, 230.0],
    "nozzleTemperature": 232.0
  },
  "production": {
    "totalParts": 1420,
    "goodParts": 1390,
    "badParts": 30
  },
  "machineStatus": "RUNNING",
  "activeFault": null
}
```

---

## 3. Backend Architecture & Components

### 3.1 Module Placement
Create a dedicated NestJS module: `backend/src/modules/iot-gateway/`:
- `iot-gateway.module.ts`: Registers `MqttIngestionService`, `Euromap77MapperService`, and `IotGatewayController`.
- `mqtt-ingestion.service.ts`:
  - Connects to MQTT broker via standard `mqtt` client library.
  - Handles auto-reconnect, exponential backoff, and subscriptions.
  - Routes inbound packets to `Euromap77MapperService`.
  - Maintains live gateway metrics (packets received, packets/sec, parse errors, connection state).
- `euromap77-mapper.service.ts`:
  - Validates and parses incoming JSON payloads (both Euromap 77 format and lightweight telemetry format).
  - Normalizes data into `NormalizedMachineEventDto`.
  - Forwards normalized events directly to `TelemetryIngestionService.ingestEvent()`.
- `iot-gateway.controller.ts`:
  - `GET /api/v1/iot-gateway/status`: Ingestion status, broker URL, latency, active topics.
  - `GET /api/v1/iot-gateway/metrics`: Packet rate, throughput, error rates.
  - `POST /api/v1/iot-gateway/test-publish`: Allows manual simulation / test packet dispatch from Swagger or UI.

### 3.2 Docker Infrastructure
Update root `docker-compose.yml`:
```yaml
  mosquitto:
    image: eclipse-mosquitto:2.0
    container_name: mes-mosquitto
    restart: unless-stopped
    ports:
      - "1883:1883"
      - "9001:9001"
    volumes:
      - ./docker/mosquitto/mosquitto.conf:/mosquitto/config/mosquitto.conf
      - mosquitto_data:/mosquitto/data
      - mosquitto_log:/mosquitto/log

volumes:
  mssql_data:
    driver: local
  mosquitto_data:
    driver: local
  mosquitto_log:
    driver: local
```

Create `docker/mosquitto/mosquitto.conf`:
```text
listener 1883
allow_anonymous true
persistence true
persistence_location /mosquitto/data/
log_dest stdout
```

---

## 4. Virtual PLC Edge Gateway Publisher Script

Create `backend/scripts/virtual-edge-gateway.ts` executable via `pnpm mock:edge`:
- Connects to `mqtt://localhost:1883`.
- Simulates realistic PLC edge gateway behavior for machines `IMM-01` through `IMM-10`:
  - Publishes continuous telemetry (temperatures, pressure) every 2 seconds.
  - Emits cycle completion events with shot increments.
  - Simulates periodic scenarios (normal run, slow cycle, heater fault).
- Proves end-to-end integration without touching physical machinery.

---

## 5. Frontend UI & Atlassian Design Integration

### 5.1 Gateway Connectivity Drawer / Card
- Integrate into `ShopFloorGrid.tsx` or `Header.tsx`:
  - **IIoT Gateway Status Badge**: Green dot for `MQTT: CONNECTED` (with broker ping latency), grey/red for `OFFLINE`.
  - **Live Throughput Meter**: Displays real-time packets/sec.
- In `MachineDetailView.tsx`:
  - Add **Fieldbus & Gateway Diagnostics Tab / Drawer**:
    - Displays active Edge Topic (e.g. `factory/plant-1/IMM-01/euromap77`).
    - Raw Inbound JSON Inspector (shows the actual MQTT packet received from the virtual or physical PLC).
    - Euromap 77 Tag Mapping Matrix with live values.

---

## 6. Staged Implementation Plan

### Stage 1: Infrastructure & Broker Setup
1. Update `docker-compose.yml` to include `mosquitto` container.
2. Create `docker/mosquitto/mosquitto.conf` configuration.
3. Add `mqtt` dependency to `backend/package.json`.
4. Add environment variables `MQTT_BROKER_URL=mqtt://localhost:1883` and `MQTT_ENABLED=true` to `.env`.

### Stage 2: Backend IoT Gateway Module & Services
1. Create `backend/src/modules/iot-gateway/dto/euromap77-payload.dto.ts`.
2. Create `backend/src/modules/iot-gateway/services/euromap77-mapper.service.ts`:
   - Tag extraction and conversion to `NormalizedMachineEventDto`.
3. Create `backend/src/modules/iot-gateway/services/mqtt-ingestion.service.ts`:
   - Connection lifecycle management, topic subscriptions, error handling, and routing to mapper.
4. Create `backend/src/modules/iot-gateway/iot-gateway.controller.ts`:
   - Health and live statistics endpoints.
5. Create `backend/src/modules/iot-gateway/iot-gateway.module.ts`:
   - Register in `AppModule`.

### Stage 3: Unit Testing Suite
1. Create `backend/src/modules/iot-gateway/services/euromap77-mapper.service.spec.ts`:
   - Test transformation of cyclic parameters, barrel temperatures, and machine status.
2. Create `backend/src/modules/iot-gateway/services/mqtt-ingestion.service.spec.ts`:
   - Test topic dispatching, packet counter accumulation, and error resilience.
3. Run `pnpm --filter backend test` to ensure 100% pass rate.

### Stage 4: Virtual PLC Edge Gateway Publisher Script
1. Create `backend/scripts/virtual-edge-gateway.ts`.
2. Add npm script `"mock:edge": "tsx scripts/virtual-edge-gateway.ts"` in `backend/package.json`.
3. Verify test message dispatch to `mosquitto` broker.

### Stage 5: Frontend Diagnostics UI Integration
1. Update `frontend/src/types/machine.ts` / create `frontend/src/types/iot-gateway.ts`.
2. Add gateway inspection API in `frontend/src/services/api.ts`.
3. Add IoT Gateway status indicator to `Header.tsx` or `ShopFloorGrid.tsx`.
4. Add Raw Packet Inspector drawer in `MachineDetailView.tsx`.

### Stage 6: Monorepo Verification & Task Report
1. Run `pnpm lint` (`oxlint`) across backend and frontend (0 warnings, 0 errors).
2. Run `pnpm --filter backend test` (19+ test suites, 100% assertions green).
3. Run `pnpm --filter frontend build` and `pnpm --filter backend build`.
4. Author task report `.agent-knowledge/dynamic/reports/tasks/017-implement-phase-9-industrial-iot-gateway.md`.
5. Commit and push to `origin/develop`.

---

## 7. Verification & Observability Matrix

| Verification Step | Command / Tool | Acceptance Criteria |
|---|---|---|
| **Broker Readiness** | `docker compose ps` / port 1883 | Mosquitto container running on port 1883 |
| **Linter Check** | `pnpm lint` | 0 errors, 0 warnings across monorepo |
| **Backend Unit Tests** | `pnpm --filter backend test` | 19+ suites passing, 100% assertions green |
| **Mapper Verification** | `euromap77-mapper.service.spec.ts` | Successfully translates Euromap 77 JSON to `NormalizedMachineEventDto` |
| **Mock Ingestion** | `pnpm mock:edge` | Publishes packets to MQTT; backend ingests and updates machine states |
| **Frontend Diagnostics** | Web UI / `MachineDetailView` | Displays live MQTT status, topic, and raw JSON packet inspector |
