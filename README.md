# TaskFlow — Team Task Manager

A modern, full-stack task management application designed for teams. Collaborate seamlessly with real-time task updates, role-based access control, and an intuitive interface.

## 🚀 Live Demo

**[https://taskflow-production-7521.up.railway.app/](https://taskflow-production-7521.up.railway.app/)**

Try it out by creating an account and inviting team members to a project.

---

## ✨ Features

### User Management
- **Authentication:** Secure JWT-based login and registration
- **Project Ownership:** Create projects and manage team membership
- **Role-Based Access Control (RBAC):**
  - **Admin:** Full control — create/edit/delete tasks, manage team members, reassign work
  - **Member:** View all tasks and edit only their assigned tasks

### Task Management
- **Full Task Lifecycle:** Create, assign, update, and track tasks
- **Rich Task Details:** 
  - Title, description, priority levels
  - Due dates and status tracking
  - Task assignment to team members
- **Permission-Based Editing:** Members can only modify tasks assigned to them
- **Team Visibility:** See all project members and their assigned work at a glance

### Project Collaboration
- **Multi-Member Projects:** Add team members and collaborate in real-time
- **Organized Workspace:** Separate projects keep tasks organized
- **Admin Controls:** Admins manage who can access the project

---

## 🛠️ Tech Stack

### Backend
- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL
- **Authentication:** JWT tokens
- **ORM:** SQLAlchemy

### Frontend
- **Framework:** React + Vite
- **Styling:** Modern UI with responsive design
- **Dev Server:** Built-in proxy to backend API

### Deployment
- **Docker:** Single containerized image
- **Host:** Railway (PostgreSQL + Web Service)
- **Architecture:** Full-stack SPA served from the same process

---

## 🎯 How It Works

1. **Sign up** and create your first project
2. **Invite team members** by adding them to your project
3. **Create tasks** and assign them to yourself or teammates
4. **Update task status** as work progresses (members can edit their own tasks)
5. **Stay organized** with priority levels, due dates, and descriptions

---

## 📋 API Endpoints

The application includes comprehensive REST APIs under `/api/v1`:

- **Auth:** `POST /register`, `POST /login`
- **Projects:** `GET`, `POST`, `PATCH`, `DELETE` projects
- **Members:** Manage project team members
- **Tasks:** Create, read, update tasks with proper permission checks
- **Health:** `GET /health` for deployment verification

**Swagger Docs:** Available at `/docs` when the app is running

## 🚢 Deployment

TaskFlow is already live on Railway. To deploy your own version:

1. Push to GitHub
2. Connect to Railway
3. Set `DATABASE_URL` and `JWT_SECRET` environment variables
4. Done — Railway builds and deploys automatically from the Dockerfile

---

## 📝 License

MIT
