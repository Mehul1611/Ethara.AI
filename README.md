# Ethara — Team Task Manager

Full-stack app: **FastAPI** (REST + JWT + PostgreSQL) and **Vite + React** UI. Production build serves the SPA from the same process as the API (no CORS issues when deployed as one service).

## Live URL

After you deploy to Railway, put your public URL here: `https://YOUR_APP.up.railway.app`

## RBAC

- **Admin:** project creator starts as admin. Admins add/remove members and create/delete/reassign tasks.
- **Member:** can see project members and **all** tasks on the project (read-only visibility). They may **only PATCH** tasks where they are the assignee (title, description, due date, priority, status). Reassigning tasks is admin-only.

## Local development

### 1. PostgreSQL

Point `DATABASE_URL` at a Postgres instance (local Docker, cloud, etc.). Example:

`postgresql://postgres:postgres@localhost:5432/ethara`

### 2. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Edit `.env` with your `DATABASE_URL` and a strong `JWT_SECRET`.

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Run this from the `backend` folder so the `app` package resolves. Tables are created on startup (`create_all`).

### 3. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The dev server proxies `/api`, `/docs`, `/openapi.json`, and `/health` to `http://127.0.0.1:8000`.

## API docs

With the backend running: `http://127.0.0.1:8000/docs`

## Docker (single image)

From the repo root:

```powershell
docker build -t ethara .
docker run --rm -p 8000:8000 -e DATABASE_URL=postgresql://... -e JWT_SECRET=... ethara
```

`PORT` is honored (Railway sets it). The image copies the Vite build into `backend/static` inside the container so `GET /` serves the UI.

## Railway

1. Create a **PostgreSQL** plugin and copy its connection string into `DATABASE_URL` for the web service.
2. Set `JWT_SECRET` to a long random value.
3. Optional: `JWT_EXPIRE_MINUTES` (default `1440`), `CORS_ORIGINS` (comma-separated; for this single-service Docker layout you can use your public app URL or leave defaults for local-style values if you split services later).
4. Deploy from GitHub using the **Dockerfile** at the repo root (or set root directory accordingly).
5. Ensure the web service **public networking** is enabled and note the **HTTPS URL** for submission.

## Repository layout

- `backend/app` — FastAPI app, SQLAlchemy models, routers under `/api/v1`
- `frontend` — React SPA
- `Dockerfile` — multi-stage Node build + Python runtime
