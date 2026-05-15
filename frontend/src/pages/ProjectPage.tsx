import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import ProjectNav from "../components/ProjectNav";
import * as api from "../api";
import { useAuth } from "../AuthContext";
import type { Dashboard, Project, ProjectMember, Task, TaskPriority, TaskStatus } from "../types";

const STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];
const PRIOS: TaskPriority[] = ["low", "medium", "high"];
const TABS = ["dashboard", "users", "tasks"] as const;

export default function ProjectPage() {
  const { projectId, tab } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [due, setDue] = useState("");
  const [prio, setPrio] = useState<TaskPriority>("medium");
  const [assignee, setAssignee] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"admin" | "member">("member");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pid = projectId ?? "";
  const activeTab = tab && TABS.includes(tab as (typeof TABS)[number]) ? tab : "dashboard";

  const myRole = useMemo(() => {
    if (!user) return null;
    return members.find((x) => x.user_id === user.id)?.role ?? null;
  }, [members, user]);

  const isAdmin = myRole === "admin";
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  const reload = useCallback(async () => {
    if (!pid) return;
    setErr(null);
    const [p, m, t, d] = await Promise.all([
      api.getProject(pid),
      api.listMembers(pid),
      api.listTasks(pid),
      api.getDashboard(pid),
    ]);
    setProject(p);
    setMembers(m);
    setTasks(t);
    setDash(d);
  }, [pid]);

  useEffect(() => {
    if (!pid) return;
    reload().catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"));
  }, [pid, reload]);

  useEffect(() => {
    if (selectedTaskId && !tasks.some((t) => t.id === selectedTaskId)) {
      setSelectedTaskId(null);
    }
  }, [tasks, selectedTaskId]);

  if (tab && !TABS.includes(tab as (typeof TABS)[number])) {
    return <Navigate to={`/projects/${pid}/dashboard`} replace />;
  }

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
      const created = await api.createTask(pid, {
        title,
        description: taskDesc.trim() ? taskDesc : null,
        due_date: due || null,
        priority: prio,
        assignee_id: assignee || null,
      });
      setTitle("");
      setTaskDesc("");
      setDue("");
      setPrio("medium");
      setAssignee("");
      await reload();
      setSelectedTaskId(created.id);
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function patchTask(t: Task, patch: Parameters<typeof api.updateTask>[1]) {
    setErr(null);
    try {
      const updated = await api.updateTask(t.id, patch);
      await reload();
      setSelectedTaskId(updated.id);
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Failed");
    }
  }

  async function onDeleteTask(t: Task) {
    if (!confirm("Delete this task?")) return;
    setErr(null);
    try {
      await api.deleteTask(t.id);
      if (selectedTaskId === t.id) setSelectedTaskId(null);
      await reload();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Failed");
    }
  }

  async function onRemoveMember(uid: string) {
    if (!pid || !confirm("Remove this member?")) return;
    setErr(null);
    try {
      await api.removeMember(pid, uid);
      await reload();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Failed");
    }
  }

  function openTask(taskId: string) {
    navigate(`/projects/${pid}/tasks`);
    setSelectedTaskId(taskId);
  }

  const canChangeStatus = (t: Task) => isAdmin || (user != null && t.assignee_id === user.id);

  function memberName(userId: string | null) {
    if (!userId) return "Unassigned";
    return members.find((m) => m.user_id === userId)?.user.name ?? "—";
  }

  return (
    <div className="app-shell">
      <ProjectNav />
      <div className="main-panel layout">
        <p className="muted link-back">
          <Link to="/projects">← All projects</Link>
        </p>
        <h1 className="page-title">{project?.name ?? "Project"}</h1>
        {myRole ? <p className="muted mb-sm">Your role: {myRole}</p> : null}
        {err ? <div className="err mb-sm">{err}</div> : null}
        <div className="row mb-sm">
          <button className="btn" type="button" onClick={() => reload()}>
            Refresh
          </button>
        </div>

        {activeTab === "dashboard" && dash ? (
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
                      <button type="button" className="link-btn" onClick={() => openTask(t.id)}>
                        {t.title}
                      </button>{" "}
                      (due {t.due_date})
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === "users" ? (
          isAdmin ? (
            <div className="card">
              <h2 className="subtitle">Users</h2>
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
              <h2 className="subtitle">Users</h2>
              <ul className="project-list">
                {members.map((m) => (
                  <li key={m.user_id}>
                    {m.user.name} ({m.role})
                  </li>
                ))}
              </ul>
            </div>
          )
        ) : null}

        {activeTab === "tasks" ? (
          <>
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
                    rows={3}
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
                        <option value="">Unassigned</option>
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
              <p className="muted mb-sm">Click a task to view details. Members may only change status on assigned tasks.</p>
              <div className="tasks-layout">
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Due</th>
                      <th>Assignee</th>
                      {isAdmin ? <th /> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t) => (
                      <tr
                        key={t.id}
                        className={selectedTaskId === t.id ? "task-row selected" : "task-row"}
                        onClick={() => setSelectedTaskId(t.id)}
                      >
                        <td>{t.title}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {canChangeStatus(t) ? (
                            <select
                              className="inp"
                              value={t.status}
                              onChange={(e) => void patchTask(t, { status: e.target.value as TaskStatus })}
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
                        <td onClick={(e) => e.stopPropagation()}>
                          {isAdmin ? (
                            <select
                              className="inp"
                              value={t.priority}
                              onChange={(e) => void patchTask(t, { priority: e.target.value as TaskPriority })}
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
                        <td onClick={(e) => e.stopPropagation()}>
                          {isAdmin ? (
                            <input
                              className="inp"
                              type="date"
                              value={t.due_date ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                void patchTask(t, { due_date: v ? v : null });
                              }}
                            />
                          ) : (
                            (t.due_date ?? "—")
                          )}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {isAdmin ? (
                            <select
                              className="inp"
                              value={t.assignee_id ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                void patchTask(t, { assignee_id: v ? v : null });
                              }}
                            >
                              <option value="">Unassigned</option>
                              {members.map((m) => (
                                <option key={m.user_id} value={m.user_id}>
                                  {m.user.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            memberName(t.assignee_id)
                          )}
                        </td>
                        {isAdmin ? (
                          <td onClick={(e) => e.stopPropagation()}>
                            <button className="btn danger" type="button" onClick={() => onDeleteTask(t)}>
                              Delete
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {selectedTask ? (
                  <aside className="task-detail">
                    <div className="task-detail-head">
                      <h3>{selectedTask.title}</h3>
                      <button type="button" className="btn" onClick={() => setSelectedTaskId(null)}>
                        Close
                      </button>
                    </div>
                    <div className="task-detail-block">
                      <span className="muted">Description</span>
                      <p className="task-detail-desc">
                        {selectedTask.description?.trim() ? selectedTask.description : "No description"}
                      </p>
                    </div>
                    <div className="task-detail-meta">
                      <div>
                        <span className="muted">Status</span>
                        <div>{selectedTask.status}</div>
                      </div>
                      <div>
                        <span className="muted">Priority</span>
                        <div>{selectedTask.priority}</div>
                      </div>
                      <div>
                        <span className="muted">Due</span>
                        <div>{selectedTask.due_date ?? "—"}</div>
                      </div>
                      <div>
                        <span className="muted">Assignee</span>
                        <div>{memberName(selectedTask.assignee_id)}</div>
                      </div>
                    </div>
                    {isAdmin ? (
                      <div className="stack section-gap">
                        <label className="stack">
                          <span className="muted">Edit title</span>
                          <input
                            className="inp"
                            defaultValue={selectedTask.title}
                            key={selectedTask.id + selectedTask.title}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v && v !== selectedTask.title) void patchTask(selectedTask, { title: v });
                            }}
                          />
                        </label>
                        <label className="stack">
                          <span className="muted">Edit description</span>
                          <textarea
                            className="inp"
                            rows={4}
                            defaultValue={selectedTask.description ?? ""}
                            key={selectedTask.id + (selectedTask.description ?? "")}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              const next = v || null;
                              if (next !== (selectedTask.description ?? null)) {
                                void patchTask(selectedTask, { description: next });
                              }
                            }}
                          />
                        </label>
                      </div>
                    ) : null}
                  </aside>
                ) : (
                  <aside className="task-detail task-detail-empty">
                    <p className="muted">Select a task to view its description and details.</p>
                  </aside>
                )}
              </div>
              {tasks.length === 0 ? <p className="muted">No tasks yet.</p> : null}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
