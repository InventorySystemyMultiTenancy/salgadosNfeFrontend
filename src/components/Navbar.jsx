import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="navbar">
      <span className="navbar-brand">Salgaderia</span>
      <nav className="navbar-links">
        {(user.role === "ADMIN" || user.role === "SELLER") && (
          <NavLink to="/" end>
            PDV
          </NavLink>
        )}
        {(user.role === "ADMIN" || user.role === "KITCHEN") && <NavLink to="/cozinha">Cozinha</NavLink>}
        {user.role === "ADMIN" && (
          <>
            <NavLink to="/produtos">Produtos</NavLink>
            <NavLink to="/clientes">Clientes</NavLink>
            <NavLink to="/cobranca">Cobrança</NavLink>
            <NavLink to="/estoque">Estoque</NavLink>
            <NavLink to="/usuarios">Usuários</NavLink>
            <NavLink to="/fiscal/pedidos">Fiscal</NavLink>
            <NavLink to="/fiscal/config">Config. Fiscal</NavLink>
          </>
        )}
      </nav>
      <div className="navbar-user">
        <span>
          {user.name} <small>({user.role})</small>
        </span>
        <button type="button" onClick={logout}>
          Sair
        </button>
      </div>
    </header>
  );
}
