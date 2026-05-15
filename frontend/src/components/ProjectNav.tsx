import { NavLink, useParams } from "react-router-dom";

const tabs = [
  { to: "dashboard", label: "Dashboard" },
  { to: "users", label: "Users" },
  { to: "tasks", label: "Tasks" },
] as const;

export default function ProjectNav() {
  const { projectId } = useParams();
  const base = `/projects/${projectId}`;

  return (
    <nav className="side-nav">
      <NavLink to="/projects" className="side-nav-link" end>
        Projects
      </NavLink>
      {tabs.map((t) => (
        <NavLink key={t.to} to={`${base}/${t.to}`} className={({ isActive }) => `side-nav-link${isActive ? " active" : ""}`}>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
