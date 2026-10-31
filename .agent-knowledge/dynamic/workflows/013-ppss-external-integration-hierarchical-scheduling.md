# Implementation Workflow 013: Hierarchical PPSS-MES Integration & Bidirectional Synchronization (Option 1)

**Status:** PROPOSED PLAN — READY FOR STAGED EXECUTION  
**Target Completion:** Phase 14 / Epic 13 (Hierarchical Production Planning & Scheduling Integration, Inbound Order Ingestion, Outbound Execution Webhooks, Dual-Authority Guarding, and ISA-95 Shop-Floor Closed-Loop Feedback)  
**References:**
- Architecture Decision Record & Analysis: [ppss_mes_integration_plan.md](file:///home/ughway/.gemini/antigravity-cli/brain/7b0b046f-d74a-4c72-8819-4856a930b2aa/ppss_mes_integration_plan.md)
- Product Requirements Document: [PRD.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/PRD.md) (Epic 2 & Epic 10)
- Existing Scheduling Service: [scheduling.service.ts](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/backend/src/modules/scheduling/scheduling.service.ts)
- Existing Production Orders Service: [orders.service.ts](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/backend/src/modules/production/services/orders.service.ts)
- Existing Runs Service: [runs.service.ts](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/backend/src/modules/production/services/runs.service.ts)
- Existing Gantt Timeline HMI: [SchedulingView.tsx](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/frontend/src/components/scheduling/SchedulingView.tsx)
- Database Schema: [schema.prisma](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/backend/prisma/schema.prisma)

---

## 1. Executive Summary & ISA-95 Hierarchical Model

In industrial manufacturing, separating **Enterprise Planning (Level 4)** from **Shop-Floor Execution (Level 3)** prevents duplicate work, desynchronization, and conflicting operational priorities. 

When deploying a dedicated **Production Planning & Scheduling System (PPSS)** alongside an operational **Manufacturing Execution System (MES)**, attempting to make both systems control machine-level schedules simultaneously creates severe conflicts.

**Workflow 013** implements **Option 1: Coexistence Hierarkis (Macro Planning in PPSS + Micro Scheduling & Execution in MES)**:
1. **PPSS owns Macro Planning & Demand**:
   - Generates production orders from sales orders, customer delivery forecasts, and Material Requirements Planning (MRP).
   - Ingests planned orders into MES via secure REST Inbound API (`POST /api/v1/integration/production-orders`).
2. **MES owns Detailed Shop-Floor Scheduling & Dispatching**:
   - Order mendarat di MES sebagai `DRAFT` pada **Backlog Drawer**.
   - Planner pabrik / supervisor menggunakan Gantt Drag-and-Drop MES yang sudah ada untuk memilih mesin (`IMM-01` s/d `IMM-10`), memasangkan mold, memperhitungkan matriks changeover mold, serta memverifikasi batasan tonase dan collision.
   - Planner merilis order (`RELEASED`) ke lantai pabrik untuk dieksekusi operator.
3. **MES Closed-Loop Feedback ke PPSS**:
   - MES secara otomatis mengirimkan webhook event ke PPSS ketika:
     - Order dijadwalkan (`order.scheduled`)
     - Order dirilis (`order.released`)
     - Run dimulai (`run.started`)
     - Telemetri mesin mencatat progres aktual & scrap (`run.progress`)
     - Run selesai dengan rekonsiliasi kuantiti (`run.completed`)
     - Mesin mengalami breakdown atau Andon kritis (`machine.down`)

```text
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                      ISA-95 HIERARCHICAL INTEGRATION ARCHITECTURE                      │
 └──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            │
                ┌───────────────────────────┴───────────────────────────┐
                ▼                                                       ▼
 ┌─────────────────────────────┐                         ┌─────────────────────────────┐
 │        LEVEL 4: PPSS        │                         │        LEVEL 3: MES         │
 │  - Sales Orders & Forecast  │                         │  - Shop-Floor Telemetry     │
 │  - Material Req (MRP)       │                         │  - 10 Virtual/Real Machines │
 │  - Macro Due Dates & Target │                         │  - Mold Changeover Matrix   │
 └──────────────┬──────────────┘                         └──────────────┬──────────────┘
                │                                                       │
                │ 1. Inbound Sync (POST /api/v1/integration/orders)     │
                │    [orderNumber, product, qty, dueDate, priority]     │
                ├──────────────────────────────────────────────────────►│
                │                                                       │ (Stored as DRAFT in Backlog)
                │                                                       │
                │                                                       ▼
                │                                        ┌─────────────────────────────┐
                │                                        │ MES Gantt Drag-and-Drop     │
                │                                        │ - Tonnage Guard Checks      │
                │                                        │ - Tooling Collision Checks  │
                │                                        │ - Setup Matrix Calculation  │
                │                                        └──────────────┬──────────────┘
                │                                                       │
                │ 2. Outbound Feedback Webhooks                         │
                │    [order.scheduled, run.progress, run.completed]     │
                │◄──────────────────────────────────────────────────────┤
                │                                                       │
                ▼                                                       ▼
 ┌─────────────────────────────┐                         ┌─────────────────────────────┐
 │ PPSS Plan-vs-Actual Tracking│                         │ Shop Floor Physical Runs    │
 │ - Rescheduling Trigger      │                         │ - Real-time Cycle Counters  │
 │ - Accurate Delivery Status  │                         │ - Quality Gate Releases     │
 └─────────────────────────────┘                         └─────────────────────────────┘
```

---

## 2. Granular Stage-by-Stage Implementation Plan

### Stage 1: Database Schema Expansion (`backend/prisma/schema.prisma`)
Extend `ProductionOrder` and introduce integration configurations:
1. Update `ProductionOrder` model:
   - `externalOrderRef`: String? @unique @map("external_order_ref") @db.VarChar(100) — Unique ID dari PPSS.
   - `dueDate`: DateTime? @map("due_date") — Batas waktu pengiriman pelanggan.
   - `externalSyncStatus`: String @default("LOCAL") @map("external_sync_status") @db.VarChar(30) — Status sinkronisasi (`LOCAL`, `SYNCED_FROM_PPSS`, `DESYNC_ALERT`).
   - `suggestedMachineCode`: String? @map("suggested_machine_code") @db.VarChar(50) — Rekomendasi lini dari PPSS.
2. Introduce `IntegrationWebhookConfig` model:
   - Menyimpan URL webhook endpoint PPSS, shared secret token (HMAC-SHA256), dan daftar event yang aktif (`order.scheduled`, `run.progress`, `run.completed`, dll.).
3. Run Prisma migration / sync script:
   ```bash
   pnpm --filter backend prisma db push
   ```

---

### Stage 2: Backend Integration Module (`backend/src/modules/integration/`)
Create a dedicated NestJS module to isolate external integration concerns:

```text
backend/src/modules/integration/
├── dto/
│   ├── inbound-production-order.dto.ts
│   ├── update-inbound-order.dto.ts
│   └── webhook-config.dto.ts
├── services/
│   ├── ppss-inbound.service.ts
│   ├── ppss-webhook.service.ts
│   └── ppss-inbound.service.spec.ts
├── integration.controller.ts
└── integration.module.ts
```

1. **`ppss-inbound.service.ts`**:
   - `ingestOrder(dto: InboundProductionOrderDto)`:
     - Validasi part number produk di katalog MES.
     - Cek duplikasi `externalOrderRef` atau `orderNumber`.
     - Buat order dengan status `DRAFT` dan 3 langkah operasi standar (`MOLDING`, `SECONDARY_FINISHING`, `PACKAGING`).
     - Simpan `dueDate` dan `suggestedMachineCode`.
     - Siarkan event WebSocket internal `backlog:updated` agar Backlog Drawer di frontend otomatis menampilkan order baru.
   - `updateOrder(externalRef: string, dto: UpdateInboundOrderDto)`:
     - **Immutability Guard**: Jika order di MES sudah `RELEASED`, `IN_PROGRESS`, atau `COMPLETED`, tolak mutasi dengan `BadRequestException("Order already released or active on shop floor; changes must be coordinated via MES supervisor")`.
     - Jika masih `DRAFT` atau `SCHEDULED`, perbarui target kuantiti, priority, atau due date.
   - `cancelOrder(externalRef: string)`:
     - Batalkan order jika status belum `IN_PROGRESS`.
   - `getPlantCapabilities()`:
     - Menyediakan endpoint bagi PPSS untuk mengunduh daftar mesin, tonase, mold, dan matriks changeover untuk sinkronisasi batasan teknis.

2. **`ppss-webhook.service.ts`**:
   - Mendengarkan event internal dari `SchedulingService` dan `RunsService`.
   - Mengirim payload HTTP POST ke webhook URL PPSS dengan header keamanan:
     - `X-MES-Signature: sha256=<hmac_hash>`
     - `X-MES-Event: <event_name>`
     - `X-MES-Delivery: <uuid>`
   - Mekanisme *retry* otomatis jika PPSS sedang offline atau merespons dengan HTTP 5xx.

3. **`integration.controller.ts`**:
   - `POST /api/v1/integration/orders` — Inbound order creation.
   - `PATCH /api/v1/integration/orders/:externalRef` — Inbound order update.
   - `DELETE /api/v1/integration/orders/:externalRef` — Inbound order cancellation.
   - `GET /api/v1/integration/capabilities` — Master data export.
   - `GET /api/v1/integration/webhook-config` & `POST /api/v1/integration/webhook-config` — Pengaturan webhook.

---

### Stage 3: Hooking MES Event Lifecycle to Webhooks
Integrasikan `ppss-webhook.service.ts` ke dalam siklus hidup eksekusi MES:
1. **Di `SchedulingService`**:
   - Saat order dijadwalkan (`scheduleOrder` / `rescheduleOrder`): panggil `webhookService.notifyOrderScheduled(order)`.
   - Memasukkan data `plannedStartTime`, `plannedEndTime`, `assignedMachineCode`, dan `assignedMoldCode`.
2. **Di `RunsService`**:
   - Saat run dimulai (`startRun`): panggil `webhookService.notifyRunStarted(run)`.
   - Saat siklus telemetri bertambah (`handleCycleCompleted`): kirim *throttled progress update* (misal setiap 50 shots atau 15 menit).
   - Saat run diselesaikan (`completeRun`): panggil `webhookService.notifyRunCompleted(run)` dengan kuantiti riil yang telah diverifikasi (*reconciled*).
3. **Di `MaintenanceService` / `TelemetryService`**:
   - Saat mesin mengalami alarm status `FAULT`: panggil `webhookService.notifyMachineDown(machineId, faultCode)`.

---

### Stage 4: Frontend Gantt & Backlog Integration UI (`SchedulingView.tsx`)
Tingkatkan HMI penjadwalan agar planner lantai pabrik menyadari konteks PPSS dan batas waktu pengiriman (*due date*):
1. **Backlog Drawer UI**:
   - Berikan badge pembeda warna ungu: `[PPSS Sync]` untuk order yang berasal dari sistem luar.
   - Tampilkan target `Due Date` dan sisa waktu pengiriman (misal: `"Due: Nov 5 (5d left)"`).
   - Tampilkan rekomendasi mesin dari PPSS jika ada (`"Suggested: IMM-07"`).
2. **Gantt Timeline Block Warning**:
   - Hitung selisih antara `plannedEndTime` dengan `dueDate`.
   - Jika `plannedEndTime > dueDate`: Tampilkan ikon peringatan jam merah `ClockAlert` dengan pesan tooltip: *"Schedule Delays Customer Delivery: Due date violated by X hours"*.
3. **Order Detail Drawer**:
   - Tampilkan informasi asal order (`External Ref: PPSS-PO-2026-1088`).
   - Tampilkan status sinkronisasi integrasi.
4. **Integration Status Banner / Settings**:
   - Menambahkan menu konfigurasi webhook PPSS sederhana di panel Admin atau header status integrasi.

---

## 3. Data Contracts & Payload Specifications

### 3.1 Inbound Order DTO (PPSS $\to$ MES)
```typescript
export class InboundProductionOrderDto {
  @IsString()
  @IsNotEmpty()
  externalOrderRef: string; // e.g. "PPSS-PO-2026-1088"

  @IsString()
  @IsNotEmpty()
  orderNumber: string; // e.g. "WO-2026-1088"

  @IsString()
  @IsNotEmpty()
  productPartNumber: string; // e.g. "PART-BUMP-001"

  @IsInt()
  @Min(1)
  targetQuantity: number;

  @IsISO8601()
  dueDate: string; // Customer delivery deadline

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  priority?: number; // 1: Urgent, 2: High, 3: Normal, 4: Low

  @IsOptional()
  @IsString()
  suggestedMachineCode?: string; // e.g. "IMM-07"

  @IsOptional()
  @IsString()
  notes?: string;
}
```

### 3.2 Outbound Webhook Event Payload (MES $\to$ PPSS)
```typescript
export interface MesWebhookPayload<T> {
  eventId: string;
  eventType: 'order.scheduled' | 'order.released' | 'run.started' | 'run.progress' | 'run.completed' | 'machine.down';
  timestamp: string;
  data: T;
}

export interface OrderScheduledEventData {
  orderNumber: string;
  externalOrderRef?: string;
  assignedMachineCode: string;
  assignedMoldCode: string;
  plannedStartTime: string;
  plannedEndTime: string;
  durationMinutes: number;
}

export interface RunProgressEventData {
  orderNumber: string;
  externalOrderRef?: string;
  machineCode: string;
  totalShots: number;
  goodQuantity: number;
  scrapQuantity: number;
  progressPercent: number;
  estimatedRemainingMinutes: number;
}
```

---

## 4. Conflict & Dual-Authority Guard Rules

1. **Rule 1: Execution State Immutability**:
   - `DRAFT`: Dapat diedit bebas oleh PPSS maupun MES.
   - `SCHEDULED`: PPSS dapat mengusulkan reschedule; jika diubah PPSS, order kembali ke draft backlog MES.
   - `RELEASED` & `IN_PROGRESS`: **Locked**. PPSS dilarang mengubah kuantiti atau tanggal. Permintaan perubahan dari PPSS harus memunculkan notifikasi/task di MES bagi supervisor pabrik.
   - `COMPLETED`: **Closed**. Tidak dapat diubah oleh sistem manapun.

2. **Rule 2: Due Date Violation Indicator**:
   - Jika planner lapangan menggeser order sehingga `plannedEndTime` melewati `dueDate`, sistem tidak memblokir pergeseran fisik (karena realita kerusakan mesin di lapangan tidak bisa dibatalkan), tetapi **seketika memicu notifikasi peringatan** dan mengirim webhook `order.due_date_risk` ke PPSS agar customer service di PPSS bisa berkoordinasi dengan klien.

3. **Rule 3: Master Data Authority**:
   - Kapabilitas teknis mesin (tonase) dan spesifikasi mold (cavity, cycle time ideal) wajib berpedoman pada master data MES sebagai representasi fisik lantai pabrik.

---

## 5. Verification & Testing Strategy

### 5.1 Automated Backend Tests (`ppss-inbound.service.spec.ts` & `ppss-webhook.service.spec.ts`)
- [ ] Test 1: Menerima valid inbound order dari PPSS dan memverifikasi order tersimpan sebagai `DRAFT` di Backlog dengan `externalOrderRef` yang sesuai.
- [ ] Test 2: Menolak order jika part number produk tidak terdaftar di katalog MES.
- [ ] Test 3: Mencegah perubahan/pembatalan order dari PPSS jika order sudah berstatus `IN_PROGRESS` atau `RELEASED`.
- [ ] Test 4: Memverifikasi pengiriman webhook `order.scheduled` saat order dialokasikan di Gantt board.
- [ ] Test 5: Memverifikasi perhitungan keterlambatan `dueDate` vs `plannedEndTime`.

### 5.2 End-to-End Simulation Check
- [ ] Simulasi POST payload order PPSS via cURL / Swagger.
- [ ] Membuka frontend `SchedulingView.tsx` dan memastikan order baru muncul di Backlog Drawer dengan tanda `[PPSS Sync]`.
- [ ] Drag-and-drop order ke `IMM-07`, amati waktu mulai/selesai yang terhitung.
- [ ] Verifikasi log webhook outbound terkirim dengan signature yang valid.
