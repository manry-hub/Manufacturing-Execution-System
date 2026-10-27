# ADR-003: Separation of Current Machine State Projections from Event Logs

## Context

Shop floor operations demand sub-second response times when fetching current machine states for live monitoring dashboards across multiple lines. Concurrently, strict auditability and historical OEE evaluations require an unalterable log of every single cycle stroke, fault, and operational transition.

## Decision

Separate the data model into two distinct layers:

1. `machine_current_states`: A read-optimized projection (fixed 1 row per machine) updated immediately as events arrive.
2. `machine_event_logs`: An append-only immutable historical log storing raw and normalized telemetry chronologically.

## Consequences

- **Positive:** Dashboard reads execute in $O(1)$ without scanning millions of historical event rows; historical data is preserved permanently for auditing and OEE recalculations.
- **Negative:** Ingestion handlers must write to both the event log and state projection table.
