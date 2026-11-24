import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { IconMail, IconLock, IconEye, IconEyeOff } from "../../components/icons";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Email ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <aside className="login-brand">
        <img src="/selfmachine-logo-t.png" alt="SelfMachine" className="login-brand-logo" />
        <p>PDV, estoque, cozinha, caderneta e nota fiscal em um só sistema.</p>
      </aside>

      <main className="login-main">
        <form className="login-card" onSubmit={handleSubmit}>
          <img src="/selfmachine-icon.png" alt="SelfMachine" className="login-mobile-logo" />
          <h1>Bem-vindo de volta</h1>
          <p className="login-subtitle">Entre com seu usuário para acessar o sistema.</p>

          <label htmlFor="email">Email</label>
          <div className="login-field">
            <IconMail />
            <input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <label htmlFor="password">Senha</label>
          <div className="login-field">
            <IconLock />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="login-toggle-password"
              onClick={() => setShowPassword((show) => !show)}
              aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
            >
              {showPassword ? <IconEyeOff /> : <IconEye />}
            </button>
          </div>

          {error && <p className="form-error login-error">{error}</p>}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </main>
    </div>
  );
}
