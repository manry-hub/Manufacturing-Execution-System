# Deployment — {Server Name}

> **IMMUTABLE — AI TIDAK BOLEH mengubah file ini.**
>
> Gunakan file ini sebagai panduan struktur. Tulis atau perbarui hasilnya di `.agent-knowledge/dynamic/docs/prod/DEPLOYMENT.md`.

> **Terakhir diperbarui:** {YYYY-MM-DD}

---

## Overview

{Jelaskan strategi deployment yang digunakan di server ini tanpa memasukkan credential, token, private key, atau nilai secret.}

## Deployment Strategy

| Item | Value |
|------|-------|
| Strategy | `{pull-based / push-based / manual}` |
| Automation | `{systemd timer / cron / GitHub Actions}` |
| Frequency | `{frequency}` |
| Rollback | `{git checkout / docker tag / manual}` |
| Downtime | `{zero-downtime / brief downtime}` |

## Auto-Deploy Configuration

### Systemd Timer

```ini
[Unit]
Description=Auto Deploy Timer

[Timer]
OnBootSec=1min
OnUnitActiveSec=1min
Unit=auto-deploy.service

[Install]
WantedBy=timers.target
```

### Deploy Script

```bash
#!/bin/bash
{script_content}
```

### Enable, Disable, and Manual Trigger

```bash
systemctl status auto-deploy.timer
sudo systemctl enable --now auto-deploy.timer
sudo systemctl stop auto-deploy.timer
sudo systemctl disable auto-deploy.timer
sudo systemctl start auto-deploy.service
```

## Initial Server Setup

{Dokumentasikan prosedur pertama kali untuk git-based deploy, backup yang diverifikasi, clone repository, restore konfigurasi non-secret melalui prosedur aman, dan permission. Jangan menuliskan nilai .env, token, atau private key.}

### Git Authentication

{Nyatakan metode yang digunakan, misalnya deploy key atau credential manager, tanpa memasukkan key maupun token.}

### Setup Verification

```bash
cd /var/www/{app_name}
git fetch origin
git log --oneline -5
```

## Manual Deployment

### Application Deploy Steps

```bash
ssh {user}@{server}
cd /var/www/{app_name}
git pull origin main
docker compose build
docker compose up -d
docker ps
docker logs {container_name}
curl -f http://127.0.0.1:{port}/health
```

### Database Migration

```bash
docker exec -it {container_name} {migration_command}
docker exec -it {container_name} {verify_command}
docker exec -it {container_name} {rollback_command}
```

### Nginx Configuration Update

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -I https://{domain}
```

## Deployment Checklist

### Pre-Deployment

- [ ] Code tested in staging environment
- [ ] Database migrations reviewed and tested
- [ ] Backup database before deployment
- [ ] Notify team about deployment window
- [ ] Check disk space and resources

### During Deployment

- [ ] Pull approved code revision
- [ ] Build artifact or image successfully
- [ ] Run database migrations
- [ ] Restart or roll out services
- [ ] Verify application health

### Post-Deployment

- [ ] Test critical user flows
- [ ] Monitor logs and resource usage
- [ ] Verify monitoring alerts
- [ ] Write deployment report

## Rollback Procedures

### Application Rollback

```bash
cd /opt/{app_name}
docker compose down
git checkout {previous_commit}
docker compose build
docker compose up -d
```

### Database Rollback

{Jelaskan migration rollback atau restore backup yang sudah diverifikasi. Cantumkan otorisasi dan titik keputusan sebelum tindakan pemulihan yang merusak data.}

### Emergency Rollback

{Jelaskan pemilik keputusan, kondisi pemicu, komunikasi, prosedur restore, dan verifikasi pemulihan.}

## Blue-Green Deployment (if applicable)

{Jelaskan setup, health check, switch traffic, monitoring, dan rollback untuk blue-green deployment bila digunakan.}

## Canary Deployment (if applicable)

{Jelaskan traffic split, kriteria promosi, monitoring, dan rollback untuk canary deployment bila digunakan.}

## Environment Management

### Environment Variables and Secrets

{Jelaskan lokasi konfigurasi dan mekanisme secrets tanpa mencantumkan nilainya. Sertakan ownership, permissions, rotasi, dan backup terenkripsi bila berlaku.}

## Deployment Windows

| Window | Time | Purpose |
|--------|------|---------|
| Regular Deploy | `{time}` | Normal deployments |
| Maintenance Window | `{time}` | Major updates and migrations |
| Emergency Deploy | Anytime | Critical fixes |

## Monitoring During Deployment

### What to Monitor

- Application and reverse-proxy logs
- CPU, memory, disk, and container health
- Response time and error rate
- Deployment notifications and alerts

### Alerting

{Jelaskan alerting aktif selama deployment dan eskalasinya.}

## Common Deployment Issues

| Issue | Symptoms | Safe Response |
|-------|----------|---------------|
| Build failed | Build does not complete | Inspect build logs and disk capacity |
| Container will not start | Service exits | Inspect logs, configuration presence, and mounts |
| Migration failed | Application error after migration | Stop rollout and use approved rollback procedure |

## Deployment Scripts

{Cantumkan path, purpose, owner, invocation method, dan review requirement untuk script deploy. Jangan menyalin credential atau menjalankan perintah pembersihan yang merusak tanpa target dan otorisasi eksplisit.}

**Last Updated:** {YYYY-MM-DD}
**Maintained by:** DevOps Team
