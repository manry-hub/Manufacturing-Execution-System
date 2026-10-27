# ADR-005: Protocol-Agnostic Normalized Event Contract

## Context

Industrial manufacturing facilities feature equipment from diverse equipment vendors using varied fieldbus protocols (OPC UA, Euromap 77, MQTT Sparkplug B, Modbus TCP, proprietary serial). Direct coupling of core MES business logic to physical communication protocols impairs platform maintainability.

## Decision

Establish an **Internal Normalized Event Contract** (a standard JSON schema incorporating `eventId`, `machineId`, `sourceTimestamp`, `normalizedStatus`, cycle metrics, and diagnostic faults). Ingestion adapters (both the software simulator and future OPC UA drivers) translate native payloads into this canonical schema before dispatching to the MES domain.

## Consequences

- **Positive:** Core production scheduling, OEE mathematics, and Andon logic remain completely decoupled from equipment communication protocols.
- **Negative:** Introduces an ingestion translation step and lightweight schema validation overhead.
