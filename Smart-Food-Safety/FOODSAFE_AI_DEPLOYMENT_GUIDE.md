# FoodSafe AI — Production Deployment & Operations Guide
**Platform Architecture:** React 19 + Vite 8.2 Frontend, Node.js + Express 5.x Backend, MySQL 8.0 Database  
**Author:** Principal DevOps & SRE Lead  
**Classification:** Production Standard Operating Procedure (SOP)

---

## 1. System Architecture Overview

```mermaid
graph TD
    User["Citizen / Admin / Authority Browser"] -->|HTTPS (443)| Proxy["Nginx Reverse Proxy / Cloudflare"]
    Proxy -->|SPA Static Files (HTTP 200 / index.html)| Static["Frontend Bundle (/dist)"]
    Proxy -->|REST API (/api/*)| Express["Node.js / Express Backend (:5000)"]
    Proxy -->|Health Checks (/health, /ready)| Express
    Express -->|SQL Connection Pool (Max: 10)| MySQL[("MySQL 8.0 Database (:3306)")]
    Express -->|Encrypted UUID Storage| Storage[("Persistent Evidence Volume (/uploads)")]
```

---

## 2. Production Prerequisites

| Component | Minimum Specification | Recommended Production Specification |
| :--- | :--- | :--- |
| **Compute / OS** | 1 vCPU, 2 GB RAM (Ubuntu 22.04 LTS or Debian 12) | 2 vCPU, 4 GB RAM (Linux or Container Host) |
| **Node.js** | Node.js v20.x LTS | Node.js v20.x or v22.x LTS |
| **Database** | MySQL 8.0 Community Server | Managed MySQL 8.0 (AWS RDS / GCP Cloud SQL / DigitalOcean) |
| **Web Server** | Nginx 1.22+ or Caddy | Nginx with TLS 1.3 & HTTP/2 |
| **SSL / TLS** | Let's Encrypt Certbot or Cloudflare SSL | Wildcard / Fully Managed TLS certificate |
| **Storage** | 10 GB SSD | 50+ GB Persistent Block Storage Mount for `/uploads` |

---

## 3. Environment Variable Configuration

### 3.1 Backend Environment Configuration (`backend/.env`)

```ini
# Server runtime configuration
NODE_ENV=production
PORT=5000

# Security: Cryptographically secure 256-bit JWT secret (generate via openssl rand -hex 64)
JWT_SECRET=8e6b12d59f7c3a01b2c4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6

# MySQL Database credentials
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=foodsafe_app
DB_PASSWORD=YOUR_STRONG_DATABASE_PASSWORD_HERE
DB_NAME=smart_food_safety

# Database Connection Pool
DB_POOL_MAX=10
DB_POOL_MIN=2
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000

# Reverse Proxy Setting (Set true when behind Nginx, Cloudflare, or AWS ALB)
TRUST_PROXY=true

# Allowed Frontend Origins (match your public domain)
FRONTEND_URL=https://foodsafe.yourdomain.com
```

### 3.2 Frontend Build Configuration (`frontend/.env.production`)

```ini
# Production API Gateway base URL
VITE_API_URL=https://foodsafe.yourdomain.com/api
```

---

## 4. Step-by-Step Deployment Procedure

### Step 4.1: Database Provisioning & Schema Initialization
1. Create database user and set appropriate privileges:
   ```sql
   CREATE DATABASE smart_food_safety CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
   CREATE USER 'foodsafe_app'@'127.0.0.1' IDENTIFIED BY 'YOUR_STRONG_DATABASE_PASSWORD_HERE';
   GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, ALTER, REFERENCES ON smart_food_safety.* TO 'foodsafe_app'@'127.0.0.1';
   FLUSH PRIVILEGES;
   ```
2. Import base schema:
   ```bash
   mysql -h 127.0.0.1 -u foodsafe_app -p smart_food_safety < frontend/database.sql
   ```

### Step 4.2: Backend Build & Process Management (PM2)
1. Install dependencies in production mode:
   ```bash
   cd backend
   npm ci --production
   ```
2. Verify uploads folder permissions:
   ```bash
   mkdir -p src/uploads
   chmod 750 src/uploads
   ```
3. Start service via PM2 process manager:
   ```bash
   npm install -g pm2
   pm2 start src/server.js --name "foodsafe-backend" --instances 2 --max-memory-restart 500M
   pm2 save
   pm2 startup
   ```

### Step 4.3: Frontend Production Compilation
1. Install dependencies and compile optimized bundle:
   ```bash
   cd ../frontend
   npm ci
   npm run build
   ```
2. Verify output in `frontend/dist/`:
   ```bash
   ls -la dist/
   # Expected files: index.html, assets/vendor-*.js, assets/index-*.js, assets/index-*.css
   ```
3. Copy `dist/` contents to web root:
   ```bash
   sudo mkdir -p /var/www/foodsafe
   sudo cp -r dist/* /var/www/foodsafe/
   sudo chown -R www-data:www-data /var/www/foodsafe/
   ```

---

## 5. Nginx Production Configuration

Save the following configuration to `/etc/nginx/sites-available/foodsafe`:

```nginx
# Upstream Node.js cluster
upstream foodsafe_api {
    server 127.0.0.1:5000;
    keepalive 32;
}

server {
    listen 80;
    server_name foodsafe.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name foodsafe.yourdomain.com;

    # SSL Certificates (managed via Certbot)
    ssl_certificate /etc/letsencrypt/live/foodsafe.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/foodsafe.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend Static Files
    root /var/www/foodsafe;
    index index.html;

    # SPA Fallback Routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static Assets Long-Term Caching
    location ~* \.(?:css|js|woff2?|svg|png|jpg|webp)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    # REST API Gateway Proxy
    location /api/ {
        proxy_pass http://foodsafe_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Upload limits
        client_max_body_size 10M;
        proxy_connect_timeout 15s;
        proxy_read_timeout 60s;
    }

    # System Health Endpoints
    location /health {
        proxy_pass http://foodsafe_api/health;
        access_log off;
    }

    location /ready {
        proxy_pass http://foodsafe_api/ready;
        access_log off;
    }
}
```

Enable site and test configuration:
```bash
sudo ln -s /etc/nginx/sites-available/foodsafe /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. Post-Deployment Verification Checklist

Execute these smoke checks immediately following release:

```bash
# 1. Verify Liveness Probe
curl -s -i https://foodsafe.yourdomain.com/health | grep "HTTP/2 200"

# 2. Verify Database Readiness Probe
curl -s -i https://foodsafe.yourdomain.com/ready | grep '"status":"READY"'

# 3. Test SPA Nested Route Direct Loading
curl -s -i https://foodsafe.yourdomain.com/login | grep "HTTP/2 200"

# 4. Check PM2 Status
pm2 status foodsafe-backend
```

---

## 7. Troubleshooting Guide

| Issue | Probable Cause | Corrective Action |
| :--- | :--- | :--- |
| **502 Bad Gateway on API** | Backend process crashed or not listening on port 5000 | Check `pm2 logs foodsafe-backend` and ensure MySQL credentials are valid. |
| **Database Connection Refused** | MySQL service stopped or incorrect host/port | Run `systemctl status mysql` and test connection via `mysql -u foodsafe_app -p`. |
| **Direct URL refresh returns 404** | Nginx missing SPA fallback rule | Ensure `try_files $uri $uri/ /index.html;` is present in Nginx `location /`. |
| **Evidence images missing after server redeploy** | Uploads saved to ephemeral container disk | Mount `backend/src/uploads` to a persistent volume or cloud storage. |
| **CORS Policy Error** | `FRONTEND_URL` in `.env` does not match public domain | Update `FRONTEND_URL` in `backend/.env` to match the exact protocol and domain (`https://foodsafe.yourdomain.com`). |
