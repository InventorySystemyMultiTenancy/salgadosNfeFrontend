import { useEffect, useState } from "react";
import * as stockService from "../../services/stock.service";
import { formatDateTime } from "../../utils/format";
import { FilterBar, PeriodFilter, SearchFilter, SelectFilter } from "../../components/Filters";
import { matchesSearch, PERIOD_OPTIONS, periodRange } from "../../utils/filters";

const MOVEMENT_LABEL = {
  ENTRY: "Entrada",
  LOSS: "Perda",
  COUNT: "Conferência",
  ADJUSTMENT: "Ajuste no cadastro",
  SALE: "Venda",
  SALE_CANCEL: "Venda cancelada",
};

const MOVEMENT_PILL = {
  ENTRY: "status-pill-success",
  LOSS: "status-pill-danger",
  COUNT: "status-pill-warning",
  ADJUSTMENT: "status-pill-neutral",
  SALE: "status-pill-navy",
  SALE_CANCEL: "status-pill-neutral",
};

// O histórico de estoque sempre tem limite de período no servidor (até 1 ano), então sem "Tudo".
const PERIODS = PERIOD_OPTIONS.filter((option) => option.value !== "all");
const EMPTY_FILTERS = { period: "7d", custom: { from: "", to: "" }, productId: "", type: "", q: "" };

const LIMIT = 300;

export default function StockHistory({ products }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [movements, setMovements] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const range = periodRange(filters.period, filters.custom);
    // Datas personalizadas pela metade: espera a outra ponta.
    if (!range || !range.from || !range.to) return;
    setError("");
    stockService
      .fetchStockMovements({ productId: filters.productId, type: filters.type, ...range })
      .then(setMovements)
      .catch((err) => setError(err.response?.data?.error || "Erro ao carregar o histórico."));
  }, [filters.period, filters.custom, filters.productId, filters.type]);

  const set = (changes) => setFilters({ ...filters, ...changes });
  const visibleMovements = (movements ?? []).filter((m) =>
    matchesSearch(filters.q, m.reason, m.user?.name, m.orderId ? `#${m.orderId}` : "", m.orderId),
  );

  // Totais por tipo no período — mostra rápido quanto entrou, vendeu e se perdeu.
  const totals = visibleMovements.reduce((acc, m) => {
    acc[m.type] = (acc[m.type] ?? 0) + m.quantity;
    return acc;
  }, {});

  return (
    <>
      <FilterBar
        summary={movements && `${visibleMovements.length} movimentação(ões)`}
        canClear={JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS)}
        onClear={() => setFilters(EMPTY_FILTERS)}
      >
        <PeriodFilter
          value={filters.period}
          onChange={(period) => set({ period })}
          custom={filters.custom}
          onCustomChange={(custom) => set({ custom })}
          options={PERIODS}
        />
        <SelectFilter
          label="Produto"
          value={filters.productId}
          onChange={(productId) => set({ productId })}
          options={products.map((product) => ({ value: String(product.id), label: product.name }))}
        />
        <SelectFilter
          label="Tipo"
          value={filters.type}
          onChange={(type) => set({ type })}
          options={Object.entries(MOVEMENT_LABEL).map(([value, label]) => ({ value, label }))}
        />
        <SearchFilter
          value={filters.q}
          onChange={(q) => set({ q })}
          label="Motivo / usuário / pedido"
          placeholder="Ex: vencido, Maria, #120..."
          wide={false}
        />
      </FilterBar>

      {error && <p className="form-error">{error}</p>}
      {!movements && !error && <p className="cart-empty">Carregando...</p>}

      {movements && (
        <>
          <div className="stat-grid stat-grid-compact">
            {[
              ["ENTRY", "Entradas"],
              ["SALE", "Vendas"],
              ["LOSS", "Perdas"],
              ["COUNT", "Ajustes de conferência"],
            ].map(([key, label]) => (
              <div key={key} className="stat-tile">
                <span>{label}</span>
                <strong>
                  {(totals[key] ?? 0) > 0 ? "+" : ""}
                  {totals[key] ?? 0}
                </strong>
                <small>unidades no período</small>
              </div>
            ))}
          </div>

          {movements.length >= LIMIT && (
            <p className="field-hint">
              Mostrando as {LIMIT} movimentações mais recentes — filtre por produto ou período para ver o resto.
            </p>
          )}

          <div className="table-scroll">
            <table className="product-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Produto</th>
                  <th>Movimento</th>
                  <th>Qtd.</th>
                  <th>Saldo</th>
                  <th>Detalhe</th>
                  <th>Usuário</th>
                </tr>
              </thead>
              <tbody>
                {visibleMovements.map((m) => (
                  <tr key={m.id}>
                    <td>{formatDateTime(m.createdAt)}</td>
                    <td>{m.product.name}</td>
                    <td>
                      <span className={`status-pill ${MOVEMENT_PILL[m.type]}`}>{MOVEMENT_LABEL[m.type]}</span>
                    </td>
                    <td className={m.quantity > 0 ? "stock-qty-in" : "stock-qty-out"}>
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </td>
                    <td>
                      <strong>{m.balanceAfter}</strong>
                    </td>
                    <td className="stock-history-detail">
                      {m.orderId ? `Pedido #${m.orderId}` : ""}
                      {m.orderId && m.reason ? " · " : ""}
                      {m.reason}
                    </td>
                    <td>{m.user?.name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visibleMovements.length === 0 && <p className="cart-empty">Nenhuma movimentação no período.</p>}
        </>
      )}
    </>
  );
}
