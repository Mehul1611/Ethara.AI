import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await login(email, password);
      nav("/projects", { replace: true });
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="layout">
      <div className="card auth-card">
        <h1>Login</h1>
        <form className="stack" onSubmit={onSubmit}>
          <label className="stack">
            <span>Email</span>
            <input className="inp" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="stack">
            <span>Password</span>
            <input
              className="inp"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {err ? <div className="err">{err}</div> : null}
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? "…" : "Login"}
          </button>
        </form>
        <p className="muted">
          No account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
