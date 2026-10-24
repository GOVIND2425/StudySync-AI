# StudySync AI – Comprehensive Online Deployment Guide

> **Project**: StudySync AI – Intelligent Personalised Study Planner  
> **Deployment Architecture**:  
> • **Frontend**: Vercel (React 19 + Vite 8 SPA)  
> • **Backend**: Render (FastAPI + Uvicorn + SQLite / Ephemeral & Persistent)  
> • **Source Control**: GitHub  

---

## 1. Pre-Deployment Configuration Summary

The repository has been fully configured for cloud deployment:
- **Configurable Backend API URL**: Frontend uses `VITE_API_BASE_URL` in production (defined in [api.js](file:///c:/Users/govin/OneDrive/Desktop/StudySync-AI/frontend/src/api.js)), falling back to `/api` with Vite proxy for local development.
- **Configurable SQLite Database**: Backend database path is customizable via `DATABASE_URL` or `SQLITE_DB_PATH` in [database.py](file:///c:/Users/govin/OneDrive/Desktop/StudySync-AI/backend/database.py).
- **Production CORS**: Configured in [main.py](file:///c:/Users/govin/OneDrive/Desktop/StudySync-AI/backend/main.py) to read `FRONTEND_URL` and automatically support all `*.vercel.app` preview and production deployments.
- **Render Dynamic Port Binding**: Backend entrypoint reads the `PORT` environment variable provided by Render and binds to `0.0.0.0` with `--reload` disabled.
- **Health & Readiness Endpoint**: `/api/health` actively verifies database readiness and reports loaded demo personas.
- **Resilient Cold-Start Error UI**: If the backend is spinning up from idle sleep on Render's free tier, the frontend shows a diagnostic alert explaining the cold-start delay with a **Retry Connection** button.
- **SPA Routing Support**: Both [frontend/vercel.json](file:///c:/Users/govin/OneDrive/Desktop/StudySync-AI/frontend/vercel.json) and root [vercel.json](file:///c:/Users/govin/OneDrive/Desktop/StudySync-AI/vercel.json) configure catch-all rewrites to prevent 404s on browser reload.
- **Render Blueprint**: [render.yaml](file:///c:/Users/govin/OneDrive/Desktop/StudySync-AI/render.yaml) allows one-click infrastructure provisioning on Render.

---

## 2. Step 1: Upload Project to GitHub

1. Open your terminal in the project root (`c:\Users\govin\OneDrive\Desktop\StudySync-AI`).
2. Initialize git and inspect ignored files:
   ```bash
   git init
   git status
   ```
   *(Notice that `venv/`, `node_modules/`, `.pytest_cache/`, `*.backup`, and local `.env` files are excluded by [.gitignore](file:///c:/Users/govin/OneDrive/Desktop/StudySync-AI/.gitignore)).*

3. Add and commit all project files:
   ```bash
   git add .
   git commit -m "feat: prepare StudySync AI for Render and Vercel production deployment"
   ```

4. Create a new repository on [GitHub](https://github.com/new):
   - **Repository name**: `StudySync-AI` (or your preferred name)
   - **Visibility**: Public or Private
   - Do **not** initialize with README or .gitignore (these already exist in your project).

5. Link your local repository and push:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<your-username>/StudySync-AI.git
   git push -u origin main
   ```

---

## 3. Step 2: Deploy Backend on Render

You can deploy the backend using either **Method A (Blueprint / render.yaml)** or **Method B (Manual Dashboard)**.

### Method A: One-Click Blueprint (Recommended)
1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** > **Blueprint**.
3. Connect your GitHub repository `StudySync-AI`.
4. Render will detect [render.yaml](file:///c:/Users/govin/OneDrive/Desktop/StudySync-AI/render.yaml) and automatically configure the service, build command, start command, and health check.
5. Click **Apply**.

---

### Method B: Manual Web Service Setup
1. Go to [Render Dashboard](https://dashboard.render.com/) > **New +** > **Web Service**.
2. Connect your GitHub repository `StudySync-AI`.
3. Fill in the exact deployment settings:
   - **Name**: `studysync-ai-backend`
   - **Region**: Closest to you (e.g., `Singapore`, `Frankfurt`, or `Oregon`)
   - **Branch**: `main`
   - **Root Directory**: `.` *(leave empty or dot for repository root)*
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`

4. Click **Advanced** and configure:
   - **Health Check Path**: `/api/health`
   - **Auto-Deploy**: `Yes`

5. Add the following **Environment Variables**:
   | Variable | Recommended Value | Description |
   |---|---|---|
   | `PYTHON_VERSION` | `3.11.9` | Pins supported Python runtime |
   | `FRONTEND_URL` | `https://your-app.vercel.app` | Allowed CORS origin (can update after Vercel deploy) |
   | `DATABASE_URL` | `sqlite:///backend/studysync.db` | SQLite database location |

6. Click **Create Web Service**.
7. Once the build completes, copy your public backend URL (e.g., `https://studysync-ai-backend.onrender.com`).

---

## 4. Step 3: Deploy Frontend on Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** > **Project**.
3. Import your GitHub repository `StudySync-AI`.
4. In the **Configure Project** screen, configure the exact settings:
   - **Project Name**: `studysync-ai` (or your preferred name)
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click **Edit** and select `frontend`
   - **Build Command**: `npm run build` *(default)*
   - **Output Directory**: `dist` *(default)*

5. Expand **Environment Variables** and add:
   | Key | Value | Notes |
   |---|---|---|
   | `VITE_API_BASE_URL` | `https://studysync-ai-backend.onrender.com` | Replace with your exact Render backend URL |

   *(Note: Do not include trailing slashes; the app automatically formats `/api` endpoints).*

6. Click **Deploy**.
7. In ~60 seconds, your application will be live at a public URL (e.g., `https://studysync-ai.vercel.app`).

---

## 5. Step 4: Configure & Verify Inter-Service Communication

1. **Update Backend CORS**:
   - Go to your Render Dashboard > `studysync-ai-backend` > **Environment**.
   - Set `FRONTEND_URL` to your Vercel public URL (e.g. `https://studysync-ai.vercel.app`).
   - Save changes (Render will trigger a fast restart).
   - *(Note: Thanks to our regex middleware, any `*.vercel.app` domain is already accepted out of the box).*

2. **Verify Backend Readiness**:
   - Open your browser or run curl:
     ```bash
     curl https://<your-render-url>.onrender.com/api/health
     ```
   - Expected JSON response:
     ```json
     {
       "status": "healthy",
       "ready": true,
       "database": {
         "status": "connected",
         "profiles_loaded": 3,
         "error": null
       },
       "service": "StudySync AI Scheduling Engine",
       "version": "1.0.0"
     }
     ```

3. **Verify Frontend Application**:
   - Open your Vercel URL: `https://<your-app>.vercel.app`
   - Verify that all **3 Demo Personas** load cleanly:
     1. **Govind Innani** (Beginner – Core CS Foundation)
     2. **Lakshy Kesharwani** (Intermediate – AI & Data Engineering)
     3. **Adhiranshu Singh** (Advanced – Deep Learning & LLM Architecture)
   - Switch between personas using the top selector.
   - Click **Regenerate Schedule** and verify the adaptive scheduler updates sessions.
   - Toggle session completion and verify mastery progress updates.
   - Navigate across all tabs: **Dashboard**, **Planner Calendar**, **Curriculum Profile**, **AI Explainability**, **Analytics**, **Automated Tests**, and **Architecture Docs**.

---

## 6. Free-Tier Lifecycle & Database Persistence Notes

### Render Free Tier Spin-Down Behavior
- **15-Minute Inactivity Sleep**: Render free web services automatically spin down when no requests are received for 15 minutes.
- **Cold Start Delay**: When waking up from idle, Render takes approximately **45 to 60 seconds** to boot the container.
- **Frontend Resilience**: If a user visits the Vercel site while the backend is asleep, StudySync AI will display an informative connection alert explaining the spin-up process alongside a **Retry Connection** button.

### Ephemeral Filesystem on Free Tier
- **Disk Ephemerality**: Render's free tier uses an ephemeral filesystem. Any SQLite database file written to disk is reset whenever the service restarts, redeploys, or wakes up from sleep.
- **Automatic Seed Guarantee**: StudySync AI's startup event in [main.py](file:///c:/Users/govin/OneDrive/Desktop/StudySync-AI/backend/main.py) automatically checks and re-seeds all three demo personas and initial schedules if the database is newly initialized. Therefore, the demo application is **always fully functional and never breaks** upon reboot.
- **Production Persistence Options**:
  1. **Render Persistent Disk**: Upgrade to a paid Render instance ($7/mo) with an attached Persistent Disk mounted at `/data` (set `DATABASE_URL=sqlite:////data/studysync.db`).
  2. **Managed PostgreSQL**: Set `DATABASE_URL=postgresql://user:password@host:port/dbname` in Render environment variables (supported natively by SQLAlchemy).

---

## 7. Local Development Reference

To continue developing locally alongside the deployed version:

```bash
# Terminal 1: Backend (Port 8001)
venv\Scripts\python.exe -m uvicorn backend.main:app --port 8001 --reload

# Terminal 2: Frontend (Port 5173 with proxy to 8001)
cd frontend
npm run dev
```

Both environments remain completely isolated and functional.
