# HRMS Deployment Configuration

## 🌐 Deployment URLs

- **Frontend (Vercel)**: https://hrms-frontend-phi.vercel.app
- **Backend (Railway)**: https://hrms-production-ed39.up.railway.app

---

## 🔧 Backend Configuration (Railway)

### Environment Variables to Set in Railway Dashboard

Navigate to your Railway project → Backend Service → Variables tab and add:

```env
# Django Settings
SECRET_KEY=your-super-secret-key-here-change-in-production-hrms-2025
DEBUG=False
ALLOWED_HOSTS=hrms-production-ed39.up.railway.app,*.railway.app,localhost,127.0.0.1

# Database (Neon)
DB_NAME=neondb
DB_USER=neondb_owner
DB_PASSWORD=npg_kiW2lJnVcsu8
DB_HOST=ep-lingering-block-a1olkbv3-pooler.ap-southeast-1.aws.neon.tech
DB_PORT=5432
DB_OPTIONS={"sslmode": "require", "channel_binding": "require"}

# CORS Configuration
CORS_ALLOWED_ORIGINS=https://hrms-frontend-phi.vercel.app,http://localhost:5173,http://localhost:3000
CORS_ALLOW_ALL_ORIGINS=False

# Frontend URL
FRONTEND_URL=https://hrms-frontend-phi.vercel.app

# Tenant Domain
TENANT_DOMAIN=hrms-production-ed39.up.railway.app

# Email Configuration
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=Team.Sniperthink@gmail.com
EMAIL_HOST_PASSWORD=sucf esxk namx mtwa
DEFAULT_FROM_EMAIL=Team.Sniperthink@gmail.com

# Redis (if using)
REDIS_URL=redis://redis.railway.internal:6379

# Celery
CELERY_ENABLED=False
```

### Important Notes:
- ✅ Logging is now configured to work in Railway (console-only in production)
- ✅ ALLOWED_HOSTS includes your Railway domain
- ✅ CORS is configured to allow requests from Vercel frontend

---

## 🎨 Frontend Configuration (Vercel)

### Environment Variables to Set in Vercel Dashboard

Navigate to your Vercel project → Settings → Environment Variables and add:

```env
VITE_API_BASE_URL=https://hrms-production-ed39.up.railway.app
VITE_APP_ENV=production
```

### Code Changes Made:
- ✅ Updated `src/config/apiConfig.ts` to point to Railway backend when on Vercel
- ✅ Created `.env` file with production settings
- ✅ API will automatically use Railway backend when deployed on Vercel

---

## 🚀 Deployment Steps

### Backend (Railway)
1. Push your code changes to GitHub
2. Railway will automatically deploy
3. Set the environment variables in Railway dashboard (listed above)
4. Monitor the logs to ensure no errors
5. Test the health endpoint: `https://hrms-production-ed39.up.railway.app/health`

### Frontend (Vercel)
1. Push your code changes to GitHub
2. Vercel will automatically deploy
3. Set the environment variables in Vercel dashboard (listed above)
4. The app should automatically connect to Railway backend

---

## 🔍 Troubleshooting

### Backend Issues:

**DisallowedHost Error**:
- Ensure `ALLOWED_HOSTS` in Railway includes your domain
- Format: `hrms-production-ed39.up.railway.app,*.railway.app`

**CORS Error**:
- Ensure `CORS_ALLOWED_ORIGINS` includes Vercel frontend URL
- Format: `https://hrms-frontend-phi.vercel.app`

**Logging Errors**:
- ✅ Already fixed - now uses console logging in production

### Frontend Issues:

**Cannot Connect to Backend**:
- Check `VITE_API_BASE_URL` in Vercel environment variables
- Verify the URL is: `https://hrms-production-ed39.up.railway.app`
- Check browser console for CORS errors

**Environment Variables Not Working**:
- In Vercel, redeploy after adding environment variables
- Ensure variables start with `VITE_` prefix

---

## 📝 Local Development

### Backend:
```bash
cd backend-tally-dashboard
python manage.py runserver
```
Uses: `http://127.0.0.1:8000`

### Frontend:
```bash
cd frontend-tally-dashboard
npm run dev
```
Uses: `http://localhost:5173`
API calls will go to: `http://127.0.0.1:8000`

---

## ✅ Checklist

- [x] Backend `.env` configured with Railway domain
- [x] Backend CORS allows Vercel frontend
- [x] Backend logging fixed for Railway
- [x] Frontend `apiConfig.ts` updated with Railway backend
- [x] Frontend `.env` created with production settings
- [ ] Environment variables set in Railway dashboard
- [ ] Environment variables set in Vercel dashboard
- [ ] Test deployment and verify connection

---

**Last Updated**: October 22, 2025
