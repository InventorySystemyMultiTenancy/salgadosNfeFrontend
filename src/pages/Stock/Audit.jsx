import { useEffect, useState } from "react";
import * as orderService from "../../services/order.service";
import * as userService from "../../services/user.service";
import { FilterBar, PeriodFilter, SearchFilter, SelectFilter } from "../../components/Filters";
import { matchesSearch, periodParams } from "../../utils/filters";

const EMPTY_FILTERS = { period: "30d", custom: { from: "", to: "" }, sellerId: "", q: "" };

// Quanto cada operador baixou de cada produto em vendas (aba "Por operador" da tela de Estoque).
export default function Audit() {
  const [audit, setAudit] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [error, setError] = useState("");

  useEffect(() => {
    userService
      .listUsers()
      .then(setUsers)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setError("");
    orderService
      .fetchStockAudit({ sellerId: filters.sellerId || undefined, ...periodParams(filters.period, filters.custom) })
      .then(setAudit)
      .catch((err) => setError(err.response?.data?.error || "Erro ao carregar a auditoria."));
  }, [filters.period, filters.custom, filters.sellerId]);

  const visible = audit.filter((row) => matchesSearch(filters.q, row.productName));
  const totalUnits = visible.reduce((sum, row) => sum + row.totalQuantity, 0);

  return (
    <>
      <FilterBar
        summary={`${visible.length} linha(s) · ${totalUnits} unidade(s) vendidas`}
        canClear={JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS)}
        onClear={() => setFilters(EMPTY_FILTERS)}
      >
        <PeriodFilter
          value={filters.period}
          onChange={(period) => setFilters({ ...filters, period })}
          custom={filters.custom}
          onCustomChange={(custom) => setFilters({ ...filters, custom })}
        />
        <SelectFilter
          label="Operador"
          value={filters.sellerId}
          onChange={(sellerId) => setFilters({ ...filters, sellerId })}
          options={users.map((u) => ({ value: String(u.id), label: u.name }))}
        />
        <SearchFilter
          value={filters.q}
          onChange={(q) => setFilters({ ...filters, q })}
          label="Produto"
          placeholder="Nome do produto..."
          wide={false}
        />
      </FilterBar>
      {error && <p className="form-error">{error}</p>}

      <div className="table-scroll">
        <table className="product-table">
          <thead>
            <tr>
              <th>Operador</th>
              <th>Produto</th>
              <th>Quantidade baixada</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={`${row.sellerId}-${row.productId}`}>
                <td>{row.sellerName}</td>
                <td>{row.productName}</td>
                <td>{row.totalQuantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visible.length === 0 && <p className="cart-empty">Nenhuma venda com esses filtros.</p>}
    </>
  );
}
