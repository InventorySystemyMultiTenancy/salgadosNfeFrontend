import { useState } from "react";
import * as stockService from "../../services/stock.service";
import { IconSearch } from "../../components/icons";

const REASONS = {
  ENTRY: ["Produção do dia", "Compra de fornecedor", "Devolução"],
  LOSS: ["Vencido / passou do ponto", "Queimou / quebrou", "Consumo interno", "Doação"],
};

function groupByCategory(products) {
  return products.reduce((groups, product) => {
    groups[product.category] ??= [];
    groups[product.category].push(product);
    return groups;
  }, {});
}

// Lançamento em lote: digita a quantidade só nos produtos que entraram (ou se perderam) e grava
// tudo de uma vez, com um motivo só.
export default function StockEntries({ products, onSaved }) {
  const [type, setType] = useState("ENTRY");
  const [reason, setReason] = useState(REASONS.ENTRY[0]);
  const [quantities, setQuantities] = useState({});
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  const isLoss = type === "LOSS";
  const term = search.trim().toLowerCase();
  const visible = products.filter((p) => !term || p.name.toLowerCase().includes(term) || String(p.id) === term);
  const filled = Object.entries(quantities).filter(([, value]) => Number(value) > 0);
  const totalUnits = filled.reduce((sum, [, value]) => sum + Number(value), 0);

  function switchType(next) {
    setType(next);
    setReason(REASONS[next][0]);
    setError("");
    setFeedback("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setFeedback("");
    setSaving(true);
    try {
      await stockService.createStockEntries({
        type,
        reason,
        items: filled.map(([productId, quantity]) => ({ productId: Number(productId), quantity: Number(quantity) })),
      });
      setQuantities({});
      setFeedback(
        `${isLoss ? "Saída" : "Entrada"} de ${totalUnits} unidade(s) em ${filled.length} produto(s) registrada.`,
      );
      await onSaved();
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao registrar o lançamento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="product-form stock-entry-form" onSubmit={handleSubmit}>
      <div className="stock-type-toggle" role="radiogroup" aria-label="Tipo de lançamento">
        <button
          type="button"
          role="radio"
          aria-checked={!isLoss}
          className={!isLoss ? "active entry" : ""}
          onClick={() => switchType("ENTRY")}
        >
          <strong>+ Entrada</strong>
          <small>Produção, compra</small>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={isLoss}
          className={isLoss ? "active loss" : ""}
          onClick={() => switchType("LOSS")}
        >
          <strong>− Saída / perda</strong>
          <small>Vencido, quebra, consumo</small>
        </button>
      </div>

      <label htmlFor="entry-reason">Motivo</label>
      <div className="reason-chips">
        {REASONS[type].map((preset) => (
          <button
            key={preset}
            type="button"
            className={reason === preset ? "active" : ""}
            onClick={() => setReason(preset)}
          >
            {preset}
          </button>
        ))}
      </div>
      <input id="entry-reason" value={reason} onChange={(e) => setReason(e.target.value)} required />

      <div className="pos-search stock-search">
        <IconSearch />
        <input
          type="text"
          placeholder="Filtrar produto por nome ou código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {Object.entries(groupByCategory(visible)).map(([category, items]) => (
        <section key={category} className="stock-entry-group">
          <h3>{category}</h3>
          <ul className="stock-entry-list">
            {items.map((product) => {
              const value = quantities[product.id] ?? "";
              const over = isLoss && Number(value) > product.stockQuantity;
              return (
                <li key={product.id} className={Number(value) > 0 ? "has-value" : undefined}>
                  <span className="stock-entry-info">
                    <span className="stock-entry-name" title={product.name}>
                      <span className="product-code-inline">#{product.id}</span>
                      {product.name}
                    </span>
                    <span className="stock-entry-current">Estoque: {product.stockQuantity}</span>
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    placeholder="0"
                    aria-label={`Quantidade de ${product.name}`}
                    className={over ? "input-invalid" : undefined}
                    value={value}
                    onChange={(e) => setQuantities({ ...quantities, [product.id]: e.target.value })}
                  />
                  {Number(value) > 0 && (
                    <span className={`stock-entry-after${over ? " is-invalid" : ""}`}>
                      → {product.stockQuantity + (isLoss ? -1 : 1) * Number(value)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {visible.length === 0 && <p className="cart-empty">Nenhum produto encontrado.</p>}

      {error && <p className="form-error">{error}</p>}
      {feedback && <p className="form-success">{feedback}</p>}

      <div className="stock-entry-footer">
        <span>
          {filled.length > 0
            ? `${filled.length} produto(s) · ${totalUnits} unidade(s)`
            : "Digite a quantidade nos produtos"}
        </span>
        <button
          type="submit"
          className={`checkout-button${isLoss ? " danger-button" : ""}`}
          disabled={saving || filled.length === 0}
        >
          {saving ? "Salvando..." : isLoss ? "Registrar saída" : "Registrar entrada"}
        </button>
      </div>
    </form>
  );
}
