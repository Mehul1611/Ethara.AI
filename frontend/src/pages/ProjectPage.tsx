import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import * as api from "../api";
import { useAuth } from "../AuthContext";
import type { Dashboard, ProjectMember, Task, TaskPriority, TaskStatus } from "../types";

const STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];
const PRIOS: TaskPriority[] = ["low", "medium", "high"];

export default function ProjectPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [title, setTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [due, setDue] = useState("");
  const [prio, setPrio] = useState<TaskPriority>("medium");
  const [assignee, setAssignee] = useState<string>("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"admin" | "member">("member");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pid = projectId ?? "";

  const myRole = useMemo(() => {
    if (!user) return null;
    const m = members.find((x) => x.user_id === user.id);
    return m?.role ?? null;
  }, [members, user]);

  const isAdmin = myRole === "admin";

  const reload = useCallback(async () => {
    if (!pid) return;
    setErr(null);
    const [m, t, d] = await Promise.all([
      api.listMembers(pid),
      api.listTasks(pid),
      api.getDashboard(pid),
    ]);
    setMembers(m);
    setTasks(t);
    setDash(d);
  }, [pid]);

  useEffect(() => {
    if (!pid) return;
    reload().catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"));
  }, [pid, reload]);

  async function onAddMember(e: FormEvent) {
    e.preventDefault();
    if (!pid) return;
    setBusy(true);
    setErr(null);
    try {
      await api.addMember(pid, memberEmail, memberRole);
      setMemberEmail("");
      await reload();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateTask(e: FormEvent) {
    e.preventDefault();
    if (!pid) return;
    setBusy(true);
    setErr(null);
    try {
      await api.createTask(pid, {
        title,
        description: taskDesc.trim() ? taskDesc : null,
        due_date: due ? due : null,
        priority: prio,
        assignee_id: assignee ? assignee : null,
      });
      setTitle("");
      setTaskDesc("");
      setDue("");
      setPrio("medium");
      setAssignee("");
      await reload();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function patchTask(t: Task, patch: Partial<Task>) {
    setErr(null);
    try {
      await api.updateTask(t.id, patch);
      await reload();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Failed");
    }
  }

  async function onDeleteTask(t: Task) {
    if (!confirm("Delete this task?")) return;
    setErr(null);
    try {
      await api.deleteTask(t.id);
      await reload();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Failed");
    }
  }

  async function onRemoveMember(uid: string) {
    if (!pid) return;
    if (!confirm("Remove this member?")) return;
    setErr(null);
    try {
      await api.removeMember(pid, uid);
      await reload();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Failed");
    }
  }

  const canEditTask = (t: Task) => isAdmin || (user && t.assignee_id === user.id);

  return (
    <div className="layout">
      <p className="muted link-back">
        <Link to="/projects">← Projects</Link>
      </p>
      <h1 className="page-title">Project</h1>
      {err ? <div className="err">{err}</div> : null}
      <div className="row mb-sm">
        <button className="btn" type="button" onClick={() => reload()}>
          Refresh
        </button>
        {myRole ? <span className="muted">Your role: {myRole}</span> : null}
      </div>

      {dash ? (
        <div className="card">
          <h2 className="subtitle">Dashboard</h2>
          <div className="grid2">
            <div>
              <div className="muted">Total tasks</div>
              <div className="stat">{dash.total_tasks}</div>
            </div>
            <div>
              <div className="muted">Overdue (not done)</div>
              <div className="stat">{dash.overdue_count}</div>
            </div>
          </div>
          <div className="section-gap">
            <div className="muted">By status</div>
            <div className="row" style={{ marginTop: "0.35rem" }}>
              {Object.entries(dash.tasks_by_status).map(([k, v]) => (
                <span key={k} className="chip">
                  {k}: <b>{v}</b>
                </span>
              ))}
            </div>
          </div>
          <div className="section-gap">
            <div className="muted">Tasks per assignee</div>
            <ul className="list-tight">
              {dash.tasks_per_user.map((r, i) => (
                <li key={i}>
                  {r.name}: {r.count}
                </li>
              ))}
            </ul>
          </div>
          {dash.overdue_tasks.length ? (
            <div className="section-gap">
              <div className="muted">Overdue tasks</div>
              <ul className="list-tight">
                {dash.overdue_tasks.map((t) => (
                  <li key={t.id}>
                    {t.title} (due {t.due_date})
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {isAdmin ? (
        <div className="card">
          <h2 className="subtitle">Members</h2>
          <form className="stack mb-sm" onSubmit={onAddMember}>
            <div className="row">
              <input
                className="inp"
                placeholder="Member email"
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                required
              />
              <select className="inp" value={memberRole} onChange={(e) => setMemberRole(e.target.value as "admin" | "member")}>
                <option value="member">member</option>
                <option value="admin">admin</option>
              </select>
              <button className="btn primary" type="submit" disabled={busy}>
                Add
              </button>
            </div>
          </form>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.user_id}>
                  <td>{m.user.name}</td>
                  <td>{m.user.email}</td>
                  <td>{m.role}</td>
                  <td>
                    <button className="btn danger" type="button" onClick={() => onRemoveMember(m.user_id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <h2 className="subtitle">Members</h2>
          <ul className="project-list">
            {members.map((m) => (
              <li key={m.user_id}>
                {m.user.name} ({m.role})
              </li>
            ))}
          </ul>
        </div>
      )}

      {isAdmin ? (
        <div className="card">
          <h2 className="subtitle">New task</h2>
          <form className="stack" onSubmit={onCreateTask}>
            <input className="inp" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <textarea
              className="inp"
              placeholder="Description"
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              rows={2}
            />
            <div className="row">
              <label className="row">
                Due
                <input className="inp" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
              </label>
              <label className="row">
                Priority
                <select className="inp" value={prio} onChange={(e) => setPrio(e.target.value as TaskPriority)}>
                  {PRIOS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="row">
                Assignee
                <select className="inp" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                  <option value="">—</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn primary" type="submit" disabled={busy}>
                Create task
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="card">
        <h2 className="subtitle">Tasks</h2>
        <div className="muted mb-sm">
          Members can update fields on tasks assigned to them. Admins manage all tasks.
        </div>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Due</th>
              <th>Assignee</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => {
              const assigneeName = members.find((m) => m.user_id === t.assignee_id)?.user.name ?? "—";
              return (
                <tr key={t.id}>
                  <td>
                    {canEditTask(t) ? (
                      <input
                        className="inp inp-block"
                        defaultValue={t.title}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== t.title) void patchTask(t, { title: v });
                        }}
                      />
                    ) : (
                      t.title
                    )}
                  </td>
                  <td>
                    {canEditTask(t) ? (
                      <select
                        className="inp"
                        defaultValue={t.status}
                        onChange={(e) => void patchTask(t, { status: e.target.value })}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      t.status
                    )}
                  </td>
                  <td>
                    {canEditTask(t) ? (
                      <select
                        className="inp"
                        defaultValue={t.priority}
                        onChange={(e) => void patchTask(t, { priority: e.target.value })}
                      >
                        {PRIOS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    ) : (
                      t.priority
                    )}
                  </td>
                  <td>
                    {canEditTask(t) ? (
                      <input
                        className="inp"
                        type="date"
                        defaultValue={t.due_date ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          void patchTask(t, { due_date: v ? v : null });
                        }}
                      />
                    ) : (
                      (t.due_date ?? "—") as string
                    )}
                  </td>
                  <td>{assigneeName}</td>
                  <td>
                    {isAdmin ? (
                      <div className="stack">
                        <select
                          className="inp"
                          defaultValue={t.assignee_id ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            void patchTask(t, { assignee_id: v ? v : null });
                          }}
                        >
                          <option value="">—</option>
                          {members.map((m) => (
                            <option key={m.user_id} value={m.user_id}>
                              {m.user.name}
                            </option>
                          ))}
                        </select>
                        <button className="btn danger" type="button" onClick={() => onDeleteTask(t)}>
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {tasks.length === 0 ? <p className="muted">No tasks yet.</p> : null}
      </div>
    </div>
  );
}
