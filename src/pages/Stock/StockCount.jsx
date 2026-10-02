import { useEffect, useState } from "react";
import * as stockService from "../../services/stock.service";
import { IconSearch } from "../../components/icons";
import { formatDateTime } from "../../utils/format";
import * as userService from "../../services/user.service";
import { FilterBar, PeriodFilter, SelectFilter } from "../../components/Filters";
import { periodParams } from "../../utils/filters";

const EMPTY_HISTORY_FILTERS = { period: "30d", custom: { from: "", to: "" }, userId: "", onlyDiff: "" };

function DiffBadge({ value }) {
  if (value === 0) return <span className="stock-diff stock-diff-ok">OK</span>;
  return (
    <span className={`stock-diff ${value > 0 ? "stock-diff-over" : "stock-diff-short"}`}>
      {value > 0 ? `+${value}` : value}
    </span>
  );
}

function CountItemsTable({ items }) {
  return (
    <div className="table-scroll">
      <table className="product-table">
        <thead>
          <tr>
            <th>Produto</th>
            <th>Sistema</th>
            <th>Contado</th>
            <th>Diferença</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.product.name}</td>
              <td>{item.expected}</td>
              <td>{item.counted}</td>
              <td>
                <DiffBadge value={item.difference} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Conferência: conta o que tem fisicamente e o sistema corrige o estoque pra bater. Campo em
// branco = não conferido (o estoque desse produto não é mexido).
export default function StockCount({ products, onSaved, canSeeHistory }) {
  const [counts, setCounts] = useState({});
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [historyFilters, setHistoryFilters] = useState(EMPTY_HISTORY_FILTERS);
  const [users, setUsers] = useState([]);

  function loadHistory() {
    if (!canSeeHistory) return;
    stockService
      .fetchStockCounts({
        userId: historyFilters.userId || undefined,
        ...periodParams(historyFilters.period, historyFilters.custom),
      })
      .then(setHistory);
  }

  useEffect(() => {
    if (canSeeHistory)
      userService
        .listUsers()
        .then(setUsers)
        .catch(() => {});
  }, [canSeeHistory]);

  useEffect(() => {
    loadHistory();
  }, [canSeeHistory, historyFilters.period, historyFilters.custom, historyFilters.userId]);

  const visibleHistory = history.filter((count) => !historyFilters.onlyDiff || count.productsWithDifference > 0);

  const term = search.trim().toLowerCase();
  const visible = products.filter((p) => !term || p.name.toLowerCase().includes(term) || String(p.id) === term);
  const filled = Object.entries(counts).filter(([, value]) => value !== "");
  const withDifference = filled.filter(([productId, value]) => {
    const product = products.find((p) => String(p.id) === productId);
    return product && Number(value) !== product.stockQuantity;
  });

  async function handleSubmit(event) {
    event.preventDefault();
    const message =
      withDifference.length > 0
        ? `Confirmar a conferência? ${withDifference.length} produto(s) com diferença terão o estoque corrigido para o valor contado.`
        : "Confirmar a conferência? Tudo o que foi contado bate com o sistema.";
    if (!window.confirm(message)) return;

    setError("");
    setSaving(true);
    try {
      const saved = await stockService.applyStockCount({
        notes,
        items: filled.map(([productId, counted]) => ({ productId: Number(productId), counted: Number(counted) })),
      });
      setResult(saved);
      setCounts({});
      setNotes("");
      await onSaved();
      loadHistory();
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao registrar a conferência.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {result && (
        <section className="product-form stock-count-result">
          <h3>
            Conferência registrada — {result.items.filter((i) => i.difference !== 0).length} produto(s) com diferença
          </h3>
          <CountItemsTable items={result.items} />
          <div className="form-actions">
            <button type="button" className="secondary" onClick={() => setResult(null)}>
              Fazer outra conferência
            </button>
          </div>
        </section>
      )}

      {!result && (
        <form className="product-form" onSubmit={handleSubmit}>
          <p className="field-hint stock-count-hint">
            Conte o que tem na vitrine/estoque e digite a quantidade. Deixe em branco o que não conferir. Se alguém
            vender durante a contagem, a diferença é calculada com o estoque do momento em que você confirmar.
          </p>

          <div className="pos-search stock-search">
            <IconSearch />
            <input
              type="text"
              placeholder="Filtrar produto por nome ou código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="table-scroll">
            <table className="product-table stock-count-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>No sistema</th>
                  <th>Contado</th>
                  <th>Diferença</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((product) => {
                  const value = counts[product.id] ?? "";
                  const difference = value === "" ? null : Number(value) - product.stockQuantity;
                  return (
                    <tr key={product.id}>
                      <td>
                        <span className="product-code-inline">#{product.id}</span>
                        {product.name}
                        <div className="field-hint">{product.category}</div>
                      </td>
                      <td>{product.stockQuantity}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          aria-label={`Contagem de ${product.name}`}
                          value={value}
                          onChange={(e) => setCounts({ ...counts, [product.id]: e.target.value })}
                        />
                      </td>
                      <td>
                        {difference === null ? <span className="field-hint">—</span> : <DiffBadge value={difference} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <label htmlFor="count-notes">Observações (opcional)</label>
          <input
            id="count-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: conferência do fechamento da noite"
          />

          {error && <p className="form-error">{error}</p>}
          <div className="stock-entry-footer">
            <span>
              {filled.length > 0
                ? `${filled.length} conferido(s) · ${withDifference.length} com diferença`
                : "Nenhum produto conferido ainda"}
            </span>
            <button type="submit" className="checkout-button" disabled={saving || filled.length === 0}>
              {saving ? "Salvando..." : "Confirmar conferência"}
            </button>
          </div>
        </form>
      )}

      {canSeeHistory && (
        <section className="mt-lg">
          <h2 className="section-title">Conferências anteriores</h2>
          <FilterBar
            summary={`${visibleHistory.length} conferência(s)`}
            canClear={JSON.stringify(historyFilters) !== JSON.stringify(EMPTY_HISTORY_FILTERS)}
            onClear={() => setHistoryFilters(EMPTY_HISTORY_FILTERS)}
          >
            <PeriodFilter
              value={historyFilters.period}
              onChange={(period) => setHistoryFilters({ ...historyFilters, period })}
              custom={historyFilters.custom}
              onCustomChange={(custom) => setHistoryFilters({ ...historyFilters, custom })}
            />
            <SelectFilter
              label="Responsável"
              value={historyFilters.userId}
              onChange={(userId) => setHistoryFilters({ ...historyFilters, userId })}
              options={users.map((u) => ({ value: String(u.id), label: u.name }))}
            />
            <SelectFilter
              label="Resultado"
              value={historyFilters.onlyDiff}
              onChange={(onlyDiff) => setHistoryFilters({ ...historyFilters, onlyDiff })}
              allLabel="Todas"
              options={[{ value: "yes", label: "Só com diferença" }]}
            />
          </FilterBar>
          {visibleHistory.length === 0 && <p className="cart-empty">Nenhuma conferência com esses filtros.</p>}
          <div className="table-scroll">
            <table className="product-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Responsável</th>
                  <th>Conferidos</th>
                  <th>Com diferença</th>
                  <th>Saldo da diferença</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleHistory.map((count) => (
                  <tr key={count.id}>
                    <td>
                      {formatDateTime(count.createdAt)}
                      {count.notes && <div className="field-hint">{count.notes}</div>}
                    </td>
                    <td>{count.user?.name}</td>
                    <td>{count.productsCounted}</td>
                    <td>{count.productsWithDifference}</td>
                    <td>
                      <DiffBadge value={count.netDifference} />
                    </td>
                    <td className="table-actions">
                      <button type="button" onClick={() => stockService.fetchStockCount(count.id).then(setSelected)}>
                        Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selected && (
        <div className="checkout-modal-overlay" onClick={() => setSelected(null)}>
          <div className="checkout-modal checkout-modal-wide" onClick={(e) => e.stopPropagation()}>
            <h2>
              Conferência de {formatDateTime(selected.createdAt)} — {selected.user?.name}
            </h2>
            {selected.notes && <p className="field-hint">{selected.notes}</p>}
            <CountItemsTable items={selected.items} />
            <div className="checkout-modal-actions">
              <button type="button" className="secondary" onClick={() => setSelected(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
