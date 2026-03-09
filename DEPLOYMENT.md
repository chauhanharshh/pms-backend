# Deployment Guide - Multi-Hotel PMS Backend

## Production Deployment Checklist

### 1. Environment Configuration

#### Required Environment Variables
```bash
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database - Use connection pooling
DATABASE_URL="postgresql://username:password@host:5432/database?schema=public&connection_limit=20"

# Security - MUST CHANGE
JWT_SECRET=<generate-strong-random-secret-256-bits>
JWT_EXPIRES_IN=7d

# CORS - Your frontend domain
CORS_ORIGIN=https://your-frontend-domain.com

# Logging
LOG_LEVEL=info
```

#### Generate Secure JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Database Setup

#### PostgreSQL Production Configuration

**Recommended Settings:**
```sql
-- Create database
CREATE DATABASE pms_production;

-- Create user with limited permissions
CREATE USER pms_app WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE pms_production TO pms_app;
GRANT USAGE ON SCHEMA public TO pms_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pms_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO pms_app;

-- Enable connection pooling
ALTER DATABASE pms_production SET max_connections = 100;
```

#### Run Migrations
```bash
# Production migration
npm run prisma:migrate:prod

# Generate Prisma client
npm run prisma:generate
```

### 3. Build Application

```bash
# Install production dependencies
npm ci --only=production

# Build TypeScript
npm run build

# Verify build
ls -la dist/
```

### 4. Process Manager (PM2)

#### Install PM2
```bash
npm install -g pm2
```

#### Create ecosystem.config.js
```javascript
module.exports = {
  apps: [{
    name: 'pms-backend',
    script: './dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

#### Start with PM2
```bash
# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Setup PM2 startup script
pm2 startup

# Monitor
pm2 monit
```

### 5. Nginx Reverse Proxy

#### Install Nginx
```bash
sudo apt update
sudo apt install nginx
```

#### Configure Nginx
Create `/etc/nginx/sites-available/pms-backend`:

```nginx
upstream pms_backend {
    least_conn;
    server 127.0.0.1:5000;
}

server {
    listen 80;
    server_name api.your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Request limits
    client_max_body_size 10M;
    client_body_buffer_size 128k;

    # Timeouts
    proxy_connect_timeout 90;
    proxy_send_timeout 90;
    proxy_read_timeout 90;

    location / {
        proxy_pass http://pms_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://pms_backend;
    }
}
```

#### Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/pms-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.your-domain.com

# Auto-renewal (runs twice daily)
sudo systemctl enable certbot.timer
```

### 7. Firewall Configuration

```bash
# UFW firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Allow only internal PostgreSQL access
sudo ufw allow from 127.0.0.1 to any port 5432
```

### 8. Automated Backups

#### Create Backup Script
Already provided in `scripts/backup.js`

#### Setup Cron Job
```bash
# Edit crontab
crontab -e

# Add nightly backup at 2 AM
0 2 * * * cd /path/to/pms-backend && /usr/bin/node scripts/backup.js >> /var/log/pms-backup.log 2>&1

# Weekly backup verification
0 3 * * 0 cd /path/to/pms-backend && /usr/bin/node scripts/verify-backup.js
```

### 9. Monitoring & Logging

#### Application Logs
```bash
# PM2 logs
pm2 logs pms-backend

# View errors
pm2 logs pms-backend --err

# Clear logs
pm2 flush
```

#### System Monitoring
```bash
# Install monitoring tools
npm install -g pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

#### Health Monitoring Script
Create `scripts/health-check.sh`:
```bash
#!/bin/bash
HEALTH_URL="https://api.your-domain.com/health"
ALERT_EMAIL="admin@your-domain.com"

response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $response -ne 200 ]; then
    echo "Health check failed: HTTP $response" | mail -s "PMS API Down" $ALERT_EMAIL
    pm2 restart pms-backend
fi
```

### 10. Database Optimization

#### Connection Pooling
Update `DATABASE_URL`:
```
postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10
```

#### Indexes Verification
```sql
-- Check slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;

-- Verify all indexes are used
SELECT schemaname, tablename, indexname, idx_scan 
FROM pg_stat_user_indexes 
WHERE idx_scan = 0;
```

### 11. Security Hardening

#### Rate Limiting (Express)
Install and configure:
```bash
npm install express-rate-limit
```

Add to `server.ts`:
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

#### Helmet Configuration
Already included with recommended settings.

#### Environment Variables Security
```bash
# Never commit .env file
# Use secrets manager in cloud (AWS Secrets Manager, Azure Key Vault)
# Or use encrypted environment variables
```

### 12. Cloud Deployment Options

#### AWS EC2
1. Launch Ubuntu 20.04 LTS instance
2. Configure security groups (22, 80, 443)
3. Install Node.js, PostgreSQL, Nginx
4. Follow steps above
5. Use RDS for managed PostgreSQL
6. Use S3 for backup storage

#### AWS Elastic Beanstalk
1. Create `.ebextensions/` folder
2. Add nginx configuration
3. Deploy with: `eb init && eb create && eb deploy`

#### Docker + Kubernetes
See `Dockerfile.production` (below)

#### DigitalOcean
1. Create droplet (Ubuntu)
2. Install dependencies
3. Configure firewall
4. Follow steps above
5. Use managed database

### 13. Docker Production Setup

#### Dockerfile.production
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --production

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

EXPOSE 5000

CMD ["node", "dist/server.js"]
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_USER: pms_user
      POSTGRES_PASSWORD: secure_password
      POSTGRES_DB: pms_production
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build:
      context: .
      dockerfile: Dockerfile.production
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://pms_user:secure_password@postgres:5432/pms_production
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  postgres_data:
```

### 14. CI/CD Pipeline

#### GitHub Actions Example
`.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build
      run: npm run build
    
    - name: Deploy to server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /path/to/pms-backend
          git pull
          npm ci --only=production
          npm run build
          pm2 restart pms-backend
```

### 15. Performance Optimization

#### Enable Compression
```typescript
import compression from 'compression';
app.use(compression());
```

#### Caching Strategy
```typescript
// Redis for session/cache
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);
```

#### Database Connection Pooling
Already configured in Prisma with `connection_limit`.

### 16. Disaster Recovery

#### Backup Strategy
- Daily automated backups (2 AM)
- Weekly offsite backup copy
- Monthly full system snapshot
- Test restore quarterly

#### Recovery Steps
1. Provision new server
2. Install dependencies
3. Restore database from backup
4. Configure environment
5. Start services
6. Verify health checks

### 17. Post-Deployment Verification

```bash
# Check health endpoint
curl https://api.your-domain.com/health

# Test authentication
curl -X POST https://api.your-domain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Check logs
pm2 logs pms-backend --lines 100

# Monitor system resources
pm2 monit

# Check database connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"
```

### 18. Maintenance Windows

Schedule regular maintenance:
- **Weekly:** Security updates
- **Monthly:** Database optimization
- **Quarterly:** Full system audit
- **Annually:** DR test

### 19. Scaling Considerations

#### Horizontal Scaling
- Use PM2 cluster mode (already configured)
- Add load balancer (nginx/ALB)
- Replicate database (read replicas)

#### Vertical Scaling
- Increase server resources
- Optimize database queries
- Add Redis caching layer

### 20. Rollback Plan

```bash
# If deployment fails:
cd /path/to/pms-backend
git checkout <previous-commit>
npm ci
npm run build
pm2 restart pms-backend

# Database rollback (if needed)
prisma migrate resolve --rolled-back <migration-name>
```

---

## Production Support Contacts

- **System Admin:** admin@your-domain.com
- **Database Admin:** dba@your-domain.com
- **On-call:** +1-XXX-XXX-XXXX

## Emergency Procedures

1. **API Down:** Check PM2, restart if needed
2. **Database Issue:** Check connections, restart PostgreSQL
3. **High Load:** Scale horizontally, check for attacks
4. **Data Corruption:** Restore from last backup

---

**Remember:** Always test in staging before production deployment!
