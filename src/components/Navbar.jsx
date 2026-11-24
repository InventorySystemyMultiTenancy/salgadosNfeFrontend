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
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/selfmachine-wide.png" alt="SelfMachine" />
      </div>

      <nav className="sidebar-nav">
        <span className="sidebar-section">Operação</span>
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
            <span className="sidebar-section">Gestão</span>
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

            <span className="sidebar-section">Configurações</span>
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

      <div className="sidebar-user">
        <img src="/selfmachine-icon.png" alt="" className="sidebar-user-mark" />
        <span className="sidebar-user-text">
          {user.name}
          <small>{ROLE_LABEL[user.role] || user.role}</small>
        </span>
        <button type="button" onClick={logout} title="Sair" aria-label="Sair">
          <IconLogout />
        </button>
      </div>
    </aside>
  );
}
