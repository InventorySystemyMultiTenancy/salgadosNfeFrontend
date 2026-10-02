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
  IconCard,
  IconLogout,
  IconCaixa,
  IconChart,
  IconCalendar,
} from "./icons";

export default function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const initial = user.name?.trim()?.[0]?.toUpperCase() || "?";

  return (
    <header className="navbar">
      <span className="navbar-brand">
        <img src="/logo-icon.png" alt="" className="navbar-brand-mark" />
        Sabor da Hora
      </span>
      <nav className="navbar-links">
        {(user.role === "ADMIN" || user.role === "SELLER") && (
          <NavLink to="/" end>
            <IconPDV /> PDV
          </NavLink>
        )}
        {(user.role === "ADMIN" || user.role === "SELLER") && (
          <>
            <NavLink to="/caixa">
              <IconCaixa /> Caixa
            </NavLink>
            <NavLink to="/encomendas">
              <IconCalendar /> Encomendas
            </NavLink>
          </>
        )}
        {(user.role === "ADMIN" || user.role === "KITCHEN") && (
          <NavLink to="/cozinha">
            <IconCozinha /> Cozinha
          </NavLink>
        )}
        <NavLink to="/estoque">
          <IconEstoque /> Estoque
        </NavLink>
        {user.role === "ADMIN" && (
          <>
            <NavLink to="/relatorios">
              <IconChart /> Relatórios
            </NavLink>
            <NavLink to="/produtos">
              <IconProdutos /> Produtos
            </NavLink>
            <NavLink to="/clientes">
              <IconClientes /> Clientes
            </NavLink>
            <NavLink to="/cobranca">
              <IconCobranca /> Cobrança
            </NavLink>
            <NavLink to="/usuarios">
              <IconUsuarios /> Usuários
            </NavLink>
            <NavLink to="/fiscal/pedidos">
              <IconFiscal /> Pedidos
            </NavLink>
            <NavLink to="/fiscal/config">
              <IconConfig /> Config. Fiscal
            </NavLink>
            <NavLink to="/pagamentos/config">
              <IconCard /> Config. Pagamento
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
