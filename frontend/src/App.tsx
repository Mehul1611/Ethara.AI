import type { ReactElement, ReactNode } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import LoginPage from "./pages/LoginPage";
import ProjectPage from "./pages/ProjectPage";
import ProjectsPage from "./pages/ProjectsPage";
import RegisterPage from "./pages/RegisterPage";

function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  return (
    <>
      <div className="topbar">
        <div className="topbar-inner">
          <div className="row">
            <span className="brand">Team Tasks</span>
            {user ? <Link to="/projects">Projects</Link> : null}
          </div>
        {user ? (
          <div className="row">
            <span className="muted">{user.email}</span>
            <button className="btn" type="button" onClick={logout}>
              Log out
            </button>
          </div>
        ) : (
          <div className="row">
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </div>
        )}
        </div>
      </div>
      {children}
    </>
  );
}

function RequireAuth({ children }: { children: ReactElement }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? "/projects" : "/login"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Shell>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/projects"
              element={
                <RequireAuth>
                  <ProjectsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/projects/:projectId"
              element={
                <RequireAuth>
                  <ProjectPage />
                </RequireAuth>
              }
            />
            <Route path="/" element={<HomeRedirect />} />
            <Route path="*" element={<HomeRedirect />} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </AuthProvider>
  );
}
