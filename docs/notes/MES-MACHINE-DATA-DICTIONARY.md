# MES — Machine Data Dictionary

**Status:** Initial Approved Baseline  
**Date:** October 27, 2026  
**Standards Reference:** OPC 40077 (Euromap 77) — Data Exchange Between Injection Moulding Machines and MES

---

## 1. Introduction

This data dictionary formally defines all telemetry attributes, process variables, units of measurement, valid operational ranges, acquisition sources, and data quality indicators for injection molding machinery.

---

## 2. Telemetry Data Attributes

### 2.1 Equipment Identity & Network Connectivity

| Field Name         | Type      | Unit | Range / Format                    | Source              | Description                                                         |
| ------------------ | --------- | ---- | --------------------------------- | ------------------- | ------------------------------------------------------------------- |
| `machineId`        | `String`  | —    | `IMM-01` to `IMM-10`              | Machine Config      | Permanent unique equipment identifier within the facility.          |
| `sourceId`         | `String`  | —    | UUID / String                     | Adapter / Simulator | Node identifier of the emitting telemetry gateway.                  |
| `sourceType`       | `Enum`    | —    | `SIMULATOR`, `OPC_UA`, `MQTT_SPB` | Gateway Metadata    | Transport layer classification.                                     |
| `connectionStatus` | `Enum`    | —    | `ONLINE`, `DEGRADED`, `OFFLINE`   | Health Watchdog     | Heartbeat and physical transport status.                            |
| `isSimulated`      | `Boolean` | —    | `true` / `false`                  | Hardware Flag       | Mandatory flag distinguishing virtual nodes from physical machines. |

---

### 2.2 Operational State & Counters

| Field Name         | Type     | Unit    | Range / Format                                                            | Source            | Description                                                       |
| ------------------ | -------- | ------- | ------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------- |
| `rawStatus`        | `String` | —       | Controller specific                                                       | PLC S7 / Beckhoff | Native equipment state string emitted by machine control.         |
| `normalizedStatus` | `Enum`   | —       | `RUNNING`, `IDLE`, `SETUP`, `STOPPED`, `FAULT`, `DISCONNECTED`, `UNKNOWN` | MES Ingestion     | Standardized operational state for monitoring and OEE accounting. |
| `cycleCounter`     | `UInt64` | Shots   | $0 - 2^{64}-1$                                                            | PLC Memory Tag    | Monotonic hardware shot counter since installation/reset.         |
| `actualCycleTime`  | `Float`  | Seconds | $5.0 - 600.0$                                                             | Hardware Timer    | Elapsed duration of the most recently completed shot stroke.      |
| `injectionTime`    | `Float`  | Seconds | $0.5 - 30.0$                                                              | Stroke Sensor     | Ram forward stroke time during filling stage.                     |
| `coolingTime`      | `Float`  | Seconds | $2.0 - 300.0$                                                             | Controller Timer  | Part solidification dwell duration inside clamped mold.           |

---

### 2.3 Injection Process & Quality Parameters (OPC 40077)

| Field Name               | Type           | Unit    | Range / Format    | Source                | Description                                                                |
| ------------------------ | -------------- | ------- | ----------------- | --------------------- | -------------------------------------------------------------------------- |
| `clampingForceActual`    | `Float`        | kN      | $500.0 - 15000.0$ | Load Cell / Hydraulic | Actual tonnage force asserted on mold platen during injection.             |
| `injectionPressurePeak`  | `Float`        | Bar     | $50.0 - 2500.0$   | Transducer            | Peak hydraulic/electric pressure registered during injection stroke.       |
| `holdingPressure`        | `Float`        | Bar     | $30.0 - 2000.0$   | Transducer            | Secondary packing pressure applied to compensate for volumetric shrinkage. |
| `cushionPosition`        | `Float`        | mm      | $2.0 - 50.0$      | Linear Potentiometer  | Final screw tip position at completion of injection stroke.                |
| `plasticizingTime`       | `Float`        | Seconds | $1.0 - 120.0$     | Controller Timer      | Duration required for screw recovery and resin dosing.                     |
| `barrelZoneTemperatures` | `Array[Float]` | °C      | $100.0 - 400.0$   | Thermocouples 1-5     | Temperature gradient across barrel heating bands (feed to nozzle).         |
| `oilTemperature`         | `Float`        | °C      | $20.0 - 70.0$     | Tank Probe            | Hydraulic fluid operational temperature.                                   |

---

### 2.4 Production Context & Tooling

| Field Name        | Type     | Unit     | Range / Format         | Source               | Description                                                   |
| ----------------- | -------- | -------- | ---------------------- | -------------------- | ------------------------------------------------------------- |
| `activeOrderId`   | `String` | —        | UUID / Work Order Code | MES Production       | Work Order currently assigned and cycling on the machine.     |
| `activeRunId`     | `String` | —        | UUID                   | MES Production       | Granular production execution run session.                    |
| `activeMoldId`    | `String` | —        | `MOLD-XXXX`            | Tooling RFID / MES   | Identifier of mounted mold tooling currently cycling.         |
| `moldCavityCount` | `UInt16` | Cavities | $1 - 128$              | Mold Master Data     | Multiplier of finished parts produced per single shot stroke. |
| `idealCycleTime`  | `Float`  | Seconds  | $5.0 - 600.0$          | Compatibility Matrix | Fastest engineered standard cycle time for product-mold pair. |

---

### 2.5 Diagnostics, Alarms & Faults

| Field Name         | Type     | Unit | Range / Format                     | Source            | Description                                                      |
| ------------------ | -------- | ---- | ---------------------------------- | ----------------- | ---------------------------------------------------------------- |
| `faultCode`        | `String` | —    | E.g., `E-1042`                     | Controller Alarm  | Controller diagnostic hexadecimal/alphanumeric fault code.       |
| `faultSeverity`    | `Enum`   | —    | `INFO`, `WARNING`, `CRITICAL_STOP` | Ingest Classifier | Severity level of asserted equipment alarm.                      |
| `faultDescription` | `String` | —    | Descriptive text                   | Alarm Catalog     | Plaintext description (e.g., "Heater Zone 3 Thermocouple Open"). |

---

### 2.6 Signal Quality & Provenance Metadata

| Field Name          | Type       | Range / Format             | Description                                                                                                                    |
| ------------------- | ---------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `dataQuality`       | `Enum`     | `GOOD`, `UNCERTAIN`, `BAD` | Signal integrity status: `GOOD` (valid telemetry), `UNCERTAIN` (transient noise or out-of-band), `BAD` (sensor fault/timeout). |
| `sourceTimestamp`   | `DateTime` | ISO 8601 UTC               | Precise wall-clock timestamp logged by equipment controller clock.                                                             |
| `receivedTimestamp` | `DateTime` | ISO 8601 UTC               | Millisecond timestamp when the payload arrived at MES Ingestion Gateway.                                                       |
| `schemaVersion`     | `String`   | `1.0`                      | Ingestion schema version assuring backward contract compatibility.                                                             |
