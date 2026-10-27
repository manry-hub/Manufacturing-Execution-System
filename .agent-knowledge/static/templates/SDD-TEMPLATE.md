# Software Design Documents — {Nama Produk}

> **IMMUTABLE — AI TIDAK BOLEH mengubah file ini.**
>
> Gunakan setiap bagian sebagai panduan struktur. Tulis atau perbarui hasilnya hanya pada file output yang tercantum di bawah.

> **Status:** `{PLANNING / CURRENT}` — pilih berdasarkan status sistem dan ubah hanya dengan bukti atau diskusi.

---

# Architecture Plan — {Nama Produk}

> **Output:** `.agent-knowledge/dynamic/docs/dev/sdd/ARCHITECTURE.md`
> **Purpose:** Cetak biru teknis untuk system design, komponen, alur data, keamanan, deployment, dan keputusan utama.

## Project Type Declaration

| Item | Value |
|------|-------|
| Project Type | `{Monolith / Fullstack}` |
| Git Location | `{apps/ — single repo} / {backend/ dan frontend/ — dual repo}` |

## 1. System Design

### Architecture Pattern

`{Monolith / Modular Monolith / Microservices / Layered Architecture}`

**Alasan:** `{kenapa pola ini dipilih}`

### High-Level Diagram

```text
{deskripsi tekstual alur sistem — bisa diganti diagram nanti}

[Client] → [Nginx] → [Backend PHP/Node/Go] → [DB]
                           ↓
                      [Cache/Redis]
                           ↓
                      [Queue Worker] → [External API]
```

## 2. Component Breakdown

| Komponen | Tipe | Tanggung Jawab | Teknologi |
|----------|------|---------------|----------|
| `{API Server}` | Backend | `{deskripsi}` | `{tek}` |
| `{Admin Panel}` | Frontend | `{deskripsi}` | `{tek}` |
| `{Public Site}` | Frontend | `{deskripsi}` | `{tek}` |
| `{Worker}` | Background | `{deskripsi}` | `{tek}` |

## 3. Routing & Middleware Strategy

### Monolith (Laravel/Node)

- Route groups per module
- Middleware: auth, role, permission
- Namespace convention

### Fullstack (API + SPA)

- API prefix: `/api/v1`
- Auth: token-based (Sanctum/JWT/Session)
- CORS policy

## 4. Data Flow

```text
{deskripsi bagaimana data mengalir antar komponen}

[Form Submit] → [Validate] → [Controller] → [Service] → [DB]
                                  ↓
                            [Queue Job] → [Notify]
```

## 5. Security Plan

| Area | Strategy |
|------|----------|
| Authentication | `{strategy}` |
| Authorization | `{RBAC / ABAC / custom}` |
| CSRF | `{protection}` |
| XSS | `{output escaping}` |
| SQL Injection | `{ORM / prepared statements}` |
| File Upload | `{validation + storage}` |

## 6. Deployment Architecture

```text
{Environment} → {Server} → {CI/CD} → {Monitoring}
```

| Environment | Server | Domain | Branch |
|------------|--------|--------|--------|
| Local | `{localhost}` | — | `dev/feat` |
| Staging | `{server}` | `{staging.example.com}` | `dev` |
| Production | `{server}` | `{example.com}` | `main` |

## 7. Key Decisions

| # | Keputusan | Alasan | ADR |
|---|----------|--------|-----|
| 1 | `{keputusan}` | `{alasan}` | `{ADR path}` |

---

# Technology Stack — {Nama Produk}

> **Output:** `.agent-knowledge/dynamic/docs/dev/sdd/TECHNOLOGYSTACK.md`
> **Purpose:** Daftar kanonis teknologi, versi, dan perannya dalam sistem.

| Layer | Technology | Version | Role |
|-------|------------|---------|------|
| Backend | `{framework}` | `{versi}` | `{peran}` |
| Frontend | `{framework}` | `{versi}` | `{peran}` |
| Database | `{engine}` | `{versi}` | `{peran}` |
| Cache | `{engine}` | `{versi}` | `{peran}` |
| Queue | `{engine}` | `{versi}` | `{peran}` |
| Search | `{engine}` | `{versi}` | `{peran}` |
| Storage | `{engine}` | `{versi}` | `{peran}` |
| Web Server | `{engine}` | `{versi}` | `{peran}` |

---

# Database Plan — {Nama Produk}

> **Output:** `.agent-knowledge/dynamic/docs/dev/sdd/DATABASE.md`
> **Purpose:** Cetak biru database: ERD, schema, relasi, indexing strategy.

## 1. Database Topology

| Connection | DB Engine | Database Name | Purpose |
|-----------|----------|--------------|---------|
| `{default}` | `{MySQL/PostgreSQL}` | `{nama_db}` | Primary data |
| `{connection_2}` | `{engine}` | `{nama_db}` | `{purpose}` |

## 2. Table Schemas

### `{nama_tabel}`

| Column | Type | Constraints | Index | Notes |
|--------|------|------------|-------|-------|
| `id` | `{bigint}` | PK, auto-increment | PRIMARY | |
| `{field}` | `{type}` | `{NOT NULL / nullable}` | `{INDEX / UNIQUE}` | `{catatan}` |
| `created_at` | `timestamp` | | | |
| `updated_at` | `timestamp` | | | |
| `deleted_at` | `timestamp` | nullable | | Soft delete (jika ada) |

## 3. Relationships Summary

| Table A | Relation | Table B | Foreign Key |
|---------|----------|---------|-------------|
| `{tabel_a}` | `{hasMany}` | `{tabel_b}` | `{tabel_a}_id` |
| `{tabel_b}` | `{belongsTo}` | `{tabel_a}` | `{tabel_a}_id` |

## 4. Indexing Strategy

| Table | Index | Columns | Type | Reason |
|-------|-------|---------|------|--------|
| `{tabel}` | `{idx_name}` | `{field1, field2}` | `{BTREE / UNIQUE / FULLTEXT}` | `{alasan}` |

## 5. Migration Plan

| # | Migration | Table | Domain | Notes |
|---|-----------|-------|--------|-------|
| 1 | `create_users_table` | `users` | Core | |
| 2 | `create_{nama}_table` | `{nama}` | `{modul}` | |

## 6. Seed Data

| Seeder | Purpose | Data Source |
|--------|---------|-------------|
| `{RoleSeeder}` | Initial roles | Hardcoded |
| `{AdminSeeder}` | Default admin user | Hardcoded |
