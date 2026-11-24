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

const ROLE_LABEL = {
  ADMIN: "Administrador",
  SELLER: "Vendedor",
  KITCHEN: "Cozinha",
};

export default function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const isAdmin = user.role === "ADMIN";
  const sells = isAdmin || user.role === "SELLER";
  const cooks = isAdmin || user.role === "KITCHEN";

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <img src="/selfmachine-wide.png" alt="SelfMachine" />
      </div>

      <nav className="topbar-nav">
        {sells && (
          <NavLink to="/" end>
            <IconPDV /> PDV
          </NavLink>
        )}
        {sells && (
          <>
            <NavLink to="/caixa">
              <IconCaixa /> Caixa
            </NavLink>
            <NavLink to="/encomendas">
              <IconCalendar /> Encomendas
            </NavLink>
          </>
        )}
        {cooks && (
          <NavLink to="/cozinha">
            <IconCozinha /> Cozinha
          </NavLink>
        )}
        <NavLink to="/estoque">
          <IconEstoque /> Estoque
        </NavLink>

        {isAdmin && (
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
            <NavLink to="/fiscal/pedidos">
              <IconFiscal /> Pedidos
            </NavLink>
            <NavLink to="/usuarios">
              <IconUsuarios /> Usuários
            </NavLink>
            <NavLink to="/fiscal/config">
              <IconConfig /> Fiscal
            </NavLink>
            <NavLink to="/pagamentos/config">
              <IconCard /> Pagamento
            </NavLink>
          </>
        )}
      </nav>

      <div className="topbar-user">
        <img src="/selfmachine-icon.png" alt="" className="topbar-user-mark" />
        <span className="topbar-user-text">
          {user.name}
          <small>{ROLE_LABEL[user.role] || user.role}</small>
        </span>
        <button type="button" onClick={logout} title="Sair" aria-label="Sair">
          <IconLogout />
        </button>
      </div>
    </header>
  );
}
