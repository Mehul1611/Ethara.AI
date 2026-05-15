import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await register(name, email, password);
      nav("/projects", { replace: true });
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Register failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="layout">
      <div className="card auth-card">
        <h1>Register</h1>
        <form className="stack" onSubmit={onSubmit}>
          <label className="stack">
            <span>Name</span>
            <input className="inp" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="stack">
            <span>Email</span>
            <input className="inp" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="stack">
            <span>Password (min 6)</span>
            <input
              className="inp"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </label>
          {err ? <div className="err">{err}</div> : null}
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? "…" : "Create account"}
          </button>
        </form>
        <p className="muted">
          Have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
