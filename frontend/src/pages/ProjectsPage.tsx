import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as api from "../api";
import type { Project } from "../types";

export default function ProjectsPage() {
  const [items, setItems] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setErr(null);
    const list = await api.listProjects();
    setItems(list);
  }

  useEffect(() => {
    refresh().catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api.createProject(name, description.trim() ? description : null);
      setName("");
      setDescription("");
      await refresh();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="layout">
      <h1 className="page-title">Projects</h1>
      <div className="card">
        <h2 className="subtitle">New project</h2>
        <form className="stack" onSubmit={onCreate}>
          <div className="row">
            <input className="inp" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <button className="btn primary" type="submit" disabled={busy}>
              Create
            </button>
          </div>
          <textarea
            className="inp"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </form>
      </div>
      {err ? <div className="err">{err}</div> : null}
      <div className="card">
        <h2 className="subtitle">Your projects</h2>
        {items.length === 0 ? (
          <p className="muted">No projects yet.</p>
        ) : (
          <ul className="project-list">
            {items.map((p) => (
              <li key={p.id}>
                <Link to={`/projects/${p.id}`}>{p.name}</Link>
                {p.description ? <span className="muted"> — {p.description}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
