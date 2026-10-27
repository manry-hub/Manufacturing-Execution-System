# MES — State Machine & Event Specification

**Status:** Initial Approved Baseline  
**Date:** October 27, 2026  
**Standards Reference:** ANSI/ISA-95 Part 2/3, PackML (ANSI/ISA-TR88.00.02), OPC 40077 (Euromap 77)

---

## 1. Scope & Objectives

This specification defines the standardized **Finite State Machine (FSM)** for both virtual and physical injection molding machines, alongside the telemetry event ingestion schema connecting shop floor equipment to the core MES domain.

---

## 2. Normalized Machine States

The MES normalizes heterogeneous controller signals into 7 canonical operational states:

| State          | OEE Classification     | Operational Definition                                                                                                                     |
| -------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `RUNNING`      | Operating Time         | The machine is actively executing injection molding cycles (clamping, plasticizing, injection, cooling, mold open, part ejection).         |
| `IDLE`         | Planned/Unplanned Loss | Machine is powered, heated, and ready to cycle, but is waiting for work orders, raw resin feed, or operator start confirmation.            |
| `SETUP`        | Changeover Loss        | Machine is undergoing tool changeover (mold mounting/unmounting), barrel temperature soaking, color purging, or first-piece inspection.    |
| `STOPPED`      | Planned Downtime       | Machine is intentionally halted under scheduled conditions (shift change, planned maintenance window, weekend shutdown).                   |
| `FAULT`        | Unplanned Downtime     | Machine tripped on an emergency stop, interlock error, motor overload, heater burnout, or hydraulic pressure collapse.                     |
| `DISCONNECTED` | Data Quality Loss      | Transport connection between the equipment adapter/simulator and the MES server is broken. Physical state cannot be verified in real time. |
| `UNKNOWN`      | Unclassified           | Bootstrap state or data corruption state where message provenance cannot be determined.                                                    |

> **Critical Invariant:**  
> `DISCONNECTED` and `UNKNOWN` states **must never be conflated with `STOPPED`**. A machine that ceases sending telemetry packets may still be physically cycling.

---

## 3. State Transition Matrix & Guard Conditions

```text
                  ┌───────────────┐
                  │    UNKNOWN    │
                  └───────┬───────┘
                          │ (System Init / Handshake)
                          ▼
                  ┌───────────────┐
       ┌─────────►│     IDLE      │◄─────────────┐
       │          └───────┬───────┘              │
       │                  │                      │
       │ (Start Setup)    │ (Start Production)   │ (Clear Fault & Verify)
       ▼                  ▼                      │
┌───────────────┐  ┌───────────────┐      ┌──────┴────────┐
│     SETUP     │  │    RUNNING    │─────►│     FAULT     │
└───────┬───────┘  └───────┬───────┘      └───────────────┘
        │                  │ (Stop Order)  (Alarm Tripped)
        │ (Setup Done)     ▼
        └─────────────────►┌───────────────┐
                           │    STOPPED    │
                           └───────────────┘
       (Transport Connection Lost from ANY state ──► DISCONNECTED)
```

### Transition Table & Guards

| Current State  | Target State       | Triggering Event                          | Guard Condition                                  | System Action                                                          |
| -------------- | ------------------ | ----------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------- |
| `*`            | `DISCONNECTED`     | `SOURCE_CONNECTION_CHANGED`               | `connected == false`                             | Flag connection offline; preserve last known physical state timestamp. |
| `DISCONNECTED` | Last Known State   | `SOURCE_CONNECTION_CHANGED`               | `connected == true`                              | Trigger store-and-forward buffer reconciliation.                       |
| `IDLE`         | `SETUP`            | `SETUP_STARTED`                           | Operator authenticated & Work Order assigned     | Open `SETUP` time segment; log newly mounted mold ID.                  |
| `SETUP`        | `IDLE` / `RUNNING` | `SETUP_COMPLETED`                         | Pre-flight checklist passed & temperature soaked | Close `SETUP` segment; release machine for production dispatch.        |
| `IDLE`         | `RUNNING`          | `CYCLE_COMPLETED` / `JOB_CONTEXT_CHANGED` | Active Production Run & verified mold            | Begin `OPERATING` time segment; start cycle timer.                     |
| `RUNNING`      | `FAULT`            | `FAULT_STARTED`                           | Alarm code asserted on controller bus            | Open `UNPLANNED_DOWNTIME` segment; auto-create draft Andon ticket.     |
| `FAULT`        | `IDLE`             | `FAULT_CLEARED`                           | Maintenance sign-off & safety reset confirmed    | Close `UNPLANNED_DOWNTIME`; transition Andon ticket to `RESOLVED`.     |
| `RUNNING`      | `STOPPED`          | `MACHINE_STATE_CHANGED`                   | Scheduled stop requested / shift ends            | Open `PLANNED_DOWNTIME` segment.                                       |
| `RUNNING`      | `RUNNING`          | `CYCLE_COMPLETED`                         | Cycle duration $t_{\text{cycle}} > 0$            | Increment shot counter; reconcile output vs. target run.               |

---

## 4. Micro-Stops vs. Macro Downtime Thresholds

1. **Micro-Stops ($< 60$ seconds):**
   - Transient pauses (e.g., brief hopper hang-up, manual runner clearing).
   - Do NOT generate automated Andon tickets.
   - Classified strictly as **Performance Loss** (speed reduction) rather than Availability downtime.
2. **Macro Downtime ($\ge 60$ seconds):**
   - Machine stoppage exceeding operational thresholds.
   - Transitions operational status to `FAULT` or unallocated stoppage.
   - Reduces **Availability** within the OEE loss tree.
   - Dispatches an automated Digital Andon alert when accompanied by an alarm code.

---

## 5. Normalized Event Schema Contract

All machine events must conform to the following JSON schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "eventId": "c7a8b9e0-1234-4567-89ab-cdef01234567",
  "machineId": "IMM-01",
  "sourceId": "SIMULATOR-NODE-01",
  "sourceType": "SIMULATOR",
  "sourceTimestamp": "2026-10-27T14:30:00.125Z",
  "receivedTimestamp": "2026-10-27T14:30:00.138Z",
  "eventType": "CYCLE_COMPLETED",
  "rawStatus": "INJECTION_STROKE_DONE",
  "normalizedStatus": "RUNNING",
  "context": {
    "productionOrderId": "PO-20261027-001",
    "productionRunId": "RUN-01",
    "moldId": "MOLD-AUTO-BUMPER-02"
  },
  "metrics": {
    "cycleCounter": 1420,
    "cycleTimeSeconds": 24.8,
    "cushionPositionMm": 12.4,
    "peakInjectionPressureBar": 145.2,
    "barrelTemperatures": [210.5, 215.0, 220.0, 220.5]
  },
  "fault": null,
  "dataQuality": "GOOD",
  "schemaVersion": "1.0",
  "isSimulated": true
}
```

### Enumeration of `eventType`

- `MACHINE_STATE_CHANGED`: General equipment state alteration.
- `CYCLE_COMPLETED`: One shot cycle completed successfully.
- `COUNTER_UPDATED`: Periodic hardware counter synchronization.
- `FAULT_STARTED`: Critical trip alarm asserted on equipment.
- `FAULT_CLEARED`: Alarm acknowledged and machine cleared for reset.
- `SETUP_STARTED`: Tool changeover or pre-heating commenced.
- `SETUP_COMPLETED`: Tooling verified and pre-production run released.
- `JOB_CONTEXT_CHANGED`: Binding or unbinding a work order to the machine.
- `PARAMETER_SAMPLE_RECEIVED`: Process telemetry readings (pressure, thermal profiles).
- `SOURCE_CONNECTION_CHANGED`: Transport network fluctuation (Online / Offline).

---

## 6. Ingestion Policies & Data Integrity

1. **Absolute Idempotency (Deduplication):**
   - `eventId` is a database-enforced unique constraint in `machine_event_logs`.
   - Repeated transmissions of identical `eventId`s are dropped immediately with zero state mutation.
2. **Timestamp Separation:**
   - `sourceTimestamp` (local device clock) governs cycle duration calculations and chronological resequencing.
   - `receivedTimestamp` (server clock) benchmarks network delivery latency.
3. **Hardware Counter Reset Handling:**
   - When `cycleCounter(t) < cycleCounter(t-1)`, the ingestor recognizes a hardware rollover or manual counter reset, establishing a new baseline without generating negative output deltas.
4. **Out-of-Order Resequencing:**
   - Delayed packets ($\le 5$ seconds latency) are inserted into historical time segments based on `sourceTimestamp` to preserve mathematical OEE continuity.
