import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  IconPDV,
  IconCozinha,
  IconProdutos,
  IconClientes,
  IconCobranca,
  IconEstoque,
  IconUsuarios,
  IconFiscal,
  IconConfig,
  IconLogout,
} from "./icons";

export default function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const initial = user.name?.trim()?.[0]?.toUpperCase() || "?";

  return (
    <header className="navbar">
      <span className="navbar-brand">
        <span className="navbar-brand-mark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 10c0-3 2.5-6 6-6s6 3 6 6c0 4-3 5-3 8a3 3 0 0 1-6 0c0-3-3-4-3-8Z"
              fill="currentColor"
            />
          </svg>
        </span>
        Salgaderia
      </span>
      <nav className="navbar-links">
        {(user.role === "ADMIN" || user.role === "SELLER") && (
          <NavLink to="/" end>
            <IconPDV /> PDV
          </NavLink>
        )}
        {(user.role === "ADMIN" || user.role === "KITCHEN") && (
          <NavLink to="/cozinha">
            <IconCozinha /> Cozinha
          </NavLink>
        )}
        {user.role === "ADMIN" && (
          <>
            <NavLink to="/produtos">
              <IconProdutos /> Produtos
            </NavLink>
            <NavLink to="/clientes">
              <IconClientes /> Clientes
            </NavLink>
            <NavLink to="/cobranca">
              <IconCobranca /> Cobrança
            </NavLink>
            <NavLink to="/estoque">
              <IconEstoque /> Estoque
            </NavLink>
            <NavLink to="/usuarios">
              <IconUsuarios /> Usuários
            </NavLink>
            <NavLink to="/fiscal/pedidos">
              <IconFiscal /> Fiscal
            </NavLink>
            <NavLink to="/fiscal/config">
              <IconConfig /> Config. Fiscal
            </NavLink>
          </>
        )}
      </nav>
      <div className="navbar-user">
        <div className="navbar-user-info">
          <span className="navbar-avatar">{initial}</span>
          <span className="navbar-user-text">
            {user.name}
            <small>{user.role}</small>
          </span>
        </div>
        <button type="button" onClick={logout}>
          <IconLogout /> Sair
        </button>
      </div>
    </header>
  );
}
