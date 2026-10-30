# 027 — Document Production Network Topology and Deployment Procedures

Date: 2026-10-30

## Checklist

- [x] Create comprehensive production network topology document (`.agent-knowledge/dynamic/docs/prod/NETWORK-TOPOLOGY.md`)
- [x] Create comprehensive production deployment manual and operational runbook (`.agent-knowledge/dynamic/docs/prod/DEPLOYMENT.md`)
- [x] Align with ISA-95 Level 0-4 industrial networking, firewall rules, and container orchestration standards
- [x] Verify compliance with templates in `.agent-knowledge/static/templates/`
- [x] Await user permission before git commit or push (per `GIT.md` rules)

## Change Description

Documenting the production infrastructure, network segmentation, and deployment strategy for the Manufacturing Execution System:
1. **Network Topology (`prod/NETWORK-TOPOLOGY.md`):**
   - Industrial Purdue Model / ISA-95 Network Segmentation (Level 0 field devices up to Level 4 enterprise office LAN).
   - OT (Operational Technology) vs IT (Information Technology) DMZ design.
   - Ports, services, firewall rules (iptables/UFW), Docker network subnets, and monotonic time synchronization (NTP).
   - SSL/TLS termination, Nginx reverse proxy configuration, and network troubleshooting diagnostics.
2. **Deployment Procedures (`prod/DEPLOYMENT.md`):**
   - Production Docker Compose configuration (MSSQL Server 2022, Mosquitto MQTT broker, NestJS API, Nginx React frontend).
   - Systemd unit configuration (`mes-stack.service`) for automated recovery after plant power cycles.
   - Database migration workflows (`prisma migrate deploy`), automated nightly MSSQL backup script, and retention policy.
   - Pre-deployment, deployment, post-deployment checklists, and disaster recovery / rollback runbooks.

## Modified Files

- `.agent-knowledge/dynamic/docs/prod/NETWORK-TOPOLOGY.md` — add
- `.agent-knowledge/dynamic/docs/prod/DEPLOYMENT.md` — add

## Review

- Result: PASS
- Verification: Cross-referenced against `.agent-knowledge/static/templates/` and project architecture. Complete ISA-95 Level 0–4 coverage, production compose, systemd service, backup scripts, and rollback procedures documented.
- Follow-up: Strictly preserve non-destructive git policy (await user authorization)

## UAT (User Acceptance Test) Verification

| # | Test | Result |
| --- | --- | --- |
| 1 | Network topology conforms to ISA-95 manufacturing security zones | PASS |
| 2 | Port mapping covers all services (HTTP 80/443, MQTT 1883, Modbus 502/1502, MSSQL 1433) | PASS |
| 3 | Deployment guide includes production compose and systemd automation | PASS |
| 4 | Database backup and disaster recovery runbooks documented | PASS |
