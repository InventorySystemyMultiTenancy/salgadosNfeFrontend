import { useEffect, useState } from "react";
import * as stockService from "../../services/stock.service";
import { IconChevronDown } from "../../components/icons";
import { formatDateTime } from "../../utils/format";

const DAY_MS = 24 * 60 * 60 * 1000;

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

const PERIODS = [
  { id: "1", label: "Hoje" },
  { id: "7", label: "7 dias" },
  { id: "30", label: "30 dias" },
  { id: "90", label: "90 dias" },
];

const LIMIT = 300;

function periodRange(days) {
  const end = new Date(Date.now() + 60 * 1000);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setTime(start.getTime() - (Number(days) - 1) * DAY_MS);
  return { from: start, to: end };
}

export default function StockHistory({ products }) {
  const [period, setPeriod] = useState("7");
  const [productId, setProductId] = useState("");
  const [type, setType] = useState("");
  const [movements, setMovements] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    stockService
      .fetchStockMovements({ productId, type, ...periodRange(period) })
      .then(setMovements)
      .catch((err) => setError(err.response?.data?.error || "Erro ao carregar o histórico."));
  }, [period, productId, type]);

  // Totais por tipo no período — mostra rápido quanto entrou, vendeu e se perdeu.
  const totals = (movements ?? []).reduce((acc, m) => {
    acc[m.type] = (acc[m.type] ?? 0) + m.quantity;
    return acc;
  }, {});

  return (
    <>
      <div className="stock-history-filters">
        <div className="segmented" role="tablist">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={period === p.id}
              className={period === p.id ? "active" : ""}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="select-wrap">
          <select aria-label="Produto" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Todos os produtos</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          <IconChevronDown />
        </div>
        <div className="select-wrap">
          <select aria-label="Tipo de movimentação" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Todos os tipos</option>
            {Object.entries(MOVEMENT_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <IconChevronDown />
        </div>
      </div>

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
                {movements.map((m) => (
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
          {movements.length === 0 && <p className="cart-empty">Nenhuma movimentação no período.</p>}
        </>
      )}
    </>
  );
}
