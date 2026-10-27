# MES — OEE Calculation Specification

**Status:** Initial Approved Baseline  
**Date:** October 27, 2026  
**Standards Reference:** ISO 22400-2:2014, SEMI E10, Blueprint Section 5

---

## 1. Objectives & Mathematical Rigor

This specification establishes the mathematical formulations, time loss models, and aggregation rules for calculating **Overall Equipment Effectiveness (OEE)** across the MES platform.

### Core Axioms

1. **Time Conservation Law (Zero Temporal Leakage):**
   Over any arbitrary historical evaluation window $[T_{\text{start}}, T_{\text{end}}]$, the sum of all mutually exclusive machine state durations must strictly equal the total elapsed calendar duration:
   $$\sum \Delta t_{\text{Running}} + \sum \Delta t_{\text{PlannedDowntime}} + \sum \Delta t_{\text{UnplannedDowntime}} + \sum \Delta t_{\text{Setup}} + \sum \Delta t_{\text{Idle}} \equiv T_{\text{end}} - T_{\text{start}}$$
2. **Auditability:**
   Every computed KPI metric must be traceable back to immutable raw event timestamps.
3. **Weighted Aggregation:**
   Factory-level and area-level OEE **must never be calculated as a simple arithmetic average** of individual machine OEEs.

---

## 2. Hierarchical Time Loss Model

Adhering to ISO 22400-2, operational calendar time is structured into successive loss categories:

```text
Total Calendar Time (24 Hours / Evaluation Window)
│
├── Non-Scheduled Time (Holidays, Official Factory Shutdown, No Demand)
│
└── Planned Production Time (PPT)
    │
    ├── Availability Loss (Downtime)
    │   ├── Unplanned Downtime (Breakdowns, Equipment Alarms, Material Starvation)
    │   └── Changeover / Setup Loss (Mold changes, pre-heating, color purging)
    │
    └── Operating Time (Run Time)
        │
        ├── Performance Loss
        │   ├── Minor Stops / Idling (< 60 seconds)
        │   └── Reduced Speed (Actual cycle time slower than ideal standard)
        │
        └── Net Operating Time
            │
            ├── Quality Loss
            │   ├── Scrap / Reject Parts
            │   └── Startup Purge Defects
            │
            └── Fully Productive Time (Producing 100% conforming parts at standard rate)
```

---

## 3. Mathematical Formulations

### 3.1 Availability

Measures the proportion of planned time the machine is actively operating.

$$\text{Availability} = \frac{\text{Run Time}}{\text{Planned Production Time}}$$

_Rules:_

- $\text{Run Time} = \sum \Delta t_{\text{RUNNING}}$
- $\text{Planned Production Time} = \text{Total Evaluated Time} - \sum \Delta t_{\text{NON\_SCHEDULED}}$
- If $\text{Planned Production Time} = 0$, $\text{Availability} = 0$ (or designated as `N/A`).

### 3.2 Performance

Measures how fast the equipment cycles relative to its theoretical ideal cycle time while operating.

$$\text{Performance} = \frac{\text{Ideal Cycle Time} \times \text{Total Parts Produced}}{\text{Run Time}}$$

_Injection Molding Specifics:_

- For multi-cavity tooling:
  $$\text{Total Parts Produced} = \text{Total Machine Shots} \times \text{Mold Cavity Count}$$
- $\text{Ideal Cycle Time}$ (seconds per shot) is defined in `mold_product_compatibilities`.
- If $\text{Performance} > 1.0$ (machine running faster than standard), the system sets a `SPEED_OVER_PERFORMANCE` audit flag without clipping raw metrics.

### 3.3 Quality

Measures the ratio of conforming parts produced to total parts produced.

$$\text{Quality} = \frac{\text{Good Count}}{\text{Total Count}}$$

_Rules:_

- $\text{Total Count} = \text{Good Count} + \text{Reject Count} + \text{Rework Count}$
- If $\text{Total Count} = 0$, $\text{Quality} = 1.0$ (no defects produced).

### 3.4 Overall Equipment Effectiveness (OEE)

$$\text{OEE} = \text{Availability} \times \text{Performance} \times \text{Quality}$$

---

## 4. State Classification Policies

| State Category        | PPT Impact                | OEE Loss Classification                                                                  |
| --------------------- | ------------------------- | ---------------------------------------------------------------------------------------- |
| `SETUP` / Mold Change | Included in PPT           | Reduces **Availability** (Setup Loss).                                                   |
| `CLEANING`            | Calendar Policy Dependent | Excluded from PPT if scheduled in calendar; reduces **Availability** if unbudgeted.      |
| `IDLE`                | Included in PPT           | Reduces **Availability** if $\ge 60\text{s}$; reduces **Performance** if $< 60\text{s}$. |
| `FAULT` / Breakdown   | Included in PPT           | Reduces **Availability** fully.                                                          |
| `DISCONNECTED`        | Included in PPT           | Tracked as `UNCLASSIFIED_LOSS` until telemetry reconciliation completes.                 |

---

## 5. Multi-Machine & Plant Aggregation Rules

To compute aggregate OEE across $N$ machines (or a whole plant area), weighted aggregation based on total operating times and total quantities is mandatory:

$$\text{Plant Availability} = \frac{\sum_{i=1}^{N} \text{Run Time}_i}{\sum_{i=1}^{N} \text{Planned Production Time}_i}$$

$$\text{Plant Performance} = \frac{\sum_{i=1}^{N} (\text{Ideal Cycle Time}_i \times \text{Total Parts}_i)}{\sum_{i=1}^{N} \text{Run Time}_i}$$

$$\text{Plant Quality} = \frac{\sum_{i=1}^{N} \text{Good Count}_i}{\sum_{i=1}^{N} \text{Total Count}_i}$$

$$\text{Plant OEE} = \text{Plant Availability} \times \text{Plant Performance} \times \text{Plant Quality}$$

> **Prohibited Approach:**  
> $\text{Plant OEE} \neq \frac{1}{N} \sum_{i=1}^N \text{OEE}_i$. Simple arithmetic averages mathematically distort the weighting of high-tonnage primary lines versus secondary cell units.

---

## 6. Boundary Rules & Edge Cases

1. **Division by Zero:**
   - All equations are guarded to return `0.0000` or `null` with explicit validity metadata when denominators evaluate to zero.
2. **Late-Arriving Telemetry:**
   - When events arrive out-of-order after an OEE window has closed, the engine triggers an asynchronous recalculation and logs a new `oee_calculation_versions` entry.
3. **Mid-Shift Tooling Swaps:**
   - When a mold change occurs mid-shift, the calculation interval is partitioned discretely at the changeover timestamp, applying the respective `ideal_cycle_time` and `cavity_count` to each interval.
