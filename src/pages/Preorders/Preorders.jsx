import { useEffect, useMemo, useState } from "react";
import * as preorderService from "../../services/preorder.service";
import * as productService from "../../services/product.service";
import * as clientService from "../../services/client.service";
import { useSocket } from "../../contexts/SocketContext";
import { IconChevronDown, IconClose, IconPlus } from "../../components/icons";
import { MONEY_METHODS, PAYMENT_LABEL, formatMoney, formatTime } from "../../utils/format";

const STATUS_LABEL = {
  PENDING: "A produzir",
  IN_PRODUCTION: "Em produção",
  READY: "Pronta",
  DELIVERED: "Entregue",
  CANCELED: "Cancelada",
};
const STATUS_PILL = {
  PENDING: "status-pill-neutral",
  IN_PRODUCTION: "status-pill-warning",
  READY: "status-pill-success",
  DELIVERED: "status-pill-navy",
  CANCELED: "status-pill-danger",
};
const NEXT_STATUS = { PENDING: "IN_PRODUCTION", IN_PRODUCTION: "READY" };
const NEXT_LABEL = { PENDING: "Iniciar produção", IN_PRODUCTION: "Marcar pronta" };
const OPEN_STATUSES = ["PENDING", "IN_PRODUCTION", "READY"];

const EMPTY_FORM = {
  clientId: "",
  customerName: "",
  customerPhone: "",
  deliveryAt: "",
  notes: "",
  items: [{ productId: "", quantity: "", unitPrice: "" }],
  depositAmount: "",
  depositMethod: "PIX",
};

// <input type="datetime-local"> trabalha com horário local sem fuso: "2026-10-02T15:30".
function toLocalInput(value) {
  const date = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function dayHeading(date) {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return "Hoje";
  if (date.toDateString() === tomorrow.toDateString()) return "Amanhã";
  const label = date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function whatsappLink(preorder) {
  const phone = (preorder.customerPhone || "").replace(/\D/g, "");
  if (!phone) return null;
  const balance = Number(preorder.totalAmount) - Number(preorder.depositAmount);
  const lines = [
    `Olá, ${preorder.customerName}! Confirmando sua encomenda na Sabor da Hora:`,
    ...preorder.items.map((item) => `• ${item.quantity}x ${item.product.name}`),
    `Entrega: ${new Date(preorder.deliveryAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`,
    `Total: ${formatMoney(preorder.totalAmount)}`,
    Number(preorder.depositAmount) > 0 ? `Sinal pago: ${formatMoney(preorder.depositAmount)}` : null,
    balance > 0 ? `Falta pagar na entrega: ${formatMoney(balance)}` : "Encomenda já quitada.",
  ].filter(Boolean);
  const number = phone.length <= 11 ? `55${phone}` : phone;
  return `https://wa.me/${number}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export default function Preorders() {
  const [scope, setScope] = useState("open");
  const [preorders, setPreorders] = useState([]);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [delivering, setDelivering] = useState(null);
  const [balanceMethod, setBalanceMethod] = useState("CASH");
  const socket = useSocket();

  async function load(currentScope = scope) {
    try {
      setPreorders(await preorderService.listPreorders(currentScope));
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao carregar encomendas.");
    }
  }

  useEffect(() => {
    productService.listProducts().then(setProducts);
    clientService.listClients().then(setClients);
  }, []);

  useEffect(() => {
    load(scope);
  }, [scope]);

  // A cozinha também muda status — mantém a lista em dia sem precisar recarregar.
  useEffect(() => {
    if (!socket) return;
    const refresh = () => load(scope);
    socket.on("preorder:updated", refresh);
    return () => socket.off("preorder:updated", refresh);
  }, [socket, scope]);

  const grouped = useMemo(() => {
    const groups = new Map();
    for (const preorder of preorders) {
      const date = new Date(preorder.deliveryAt);
      const key = date.toDateString();
      if (!groups.has(key)) groups.set(key, { heading: dayHeading(date), items: [] });
      groups.get(key).items.push(preorder);
    }
    return Array.from(groups.values());
  }, [preorders]);

  const formTotal = form
    ? form.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0)
    : 0;

  function openNew() {
    setEditingId(null);
    setFormError("");
    setForm(EMPTY_FORM);
  }

  function openEdit(preorder) {
    setEditingId(preorder.id);
    setFormError("");
    setForm({
      clientId: preorder.clientId ? String(preorder.clientId) : "",
      customerName: preorder.customerName,
      customerPhone: preorder.customerPhone || "",
      deliveryAt: toLocalInput(preorder.deliveryAt),
      notes: preorder.notes || "",
      items: preorder.items.map((item) => ({
        productId: String(item.productId),
        quantity: String(item.quantity),
        unitPrice: String(Number(item.unitPrice)),
      })),
      depositAmount: String(Number(preorder.depositAmount)),
      depositMethod: preorder.depositMethod || "PIX",
    });
  }

  function updateItem(index, changes) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, i) => (i === index ? { ...item, ...changes } : item)),
    }));
  }

  function handleProductChange(index, productId) {
    const product = products.find((p) => String(p.id) === productId);
    updateItem(index, { productId, unitPrice: product ? String(Number(product.price)) : "" });
  }

  function handleClientChange(clientId) {
    const client = clients.find((c) => String(c.id) === clientId);
    setForm((current) => ({
      ...current,
      clientId,
      customerName: client ? client.name : current.customerName,
      customerPhone: client ? client.phone || "" : current.customerPhone,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    const payload = {
      clientId: form.clientId ? Number(form.clientId) : null,
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      deliveryAt: new Date(form.deliveryAt).toISOString(),
      notes: form.notes,
      items: form.items
        .filter((item) => item.productId)
        .map((item) => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity),
          unitPrice: item.unitPrice === "" ? undefined : Number(item.unitPrice),
        })),
    };
    try {
      if (editingId) {
        await preorderService.updatePreorder(editingId, payload);
      } else {
        await preorderService.createPreorder({
          ...payload,
          depositAmount: Number(form.depositAmount) || 0,
          depositMethod: form.depositMethod,
        });
      }
      setForm(null);
      await load();
    } catch (err) {
      setFormError(err.response?.data?.error || "Erro ao salvar a encomenda.");
    } finally {
      setSaving(false);
    }
  }

  async function act(action) {
    setError("");
    try {
      await action();
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao atualizar a encomenda.");
    }
  }

  function handleCancel(preorder) {
    const deposit = Number(preorder.depositAmount);
    const message =
      deposit > 0
        ? `Cancelar a encomenda de ${preorder.customerName}? O sinal de ${formatMoney(deposit)} não é devolvido automaticamente — se devolver em dinheiro, registre uma sangria no Caixa.`
        : `Cancelar a encomenda de ${preorder.customerName}?`;
    if (window.confirm(message)) act(() => preorderService.cancelPreorder(preorder.id));
  }

  async function handleDeliver(event) {
    event.preventDefault();
    await act(() => preorderService.deliverPreorder(delivering.id, balanceMethod));
    setDelivering(null);
  }

  const deliveringBalance = delivering ? Number(delivering.totalAmount) - Number(delivering.depositAmount) : 0;

  return (
    <div className="page">
      <h1>Encomendas</h1>

      <div className="page-toolbar">
        <div className="segmented" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={scope === "open"}
            className={scope === "open" ? "active" : ""}
            onClick={() => setScope("open")}
          >
            Em aberto
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={scope === "recent"}
            className={scope === "recent" ? "active" : ""}
            onClick={() => setScope("recent")}
          >
            Todas (últimos 30 dias)
          </button>
        </div>
        <div className="form-actions toolbar-actions">
          <button type="button" onClick={openNew}>
            <IconPlus size={15} /> Nova encomenda
          </button>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      {preorders.length === 0 && !error && (
        <p className="cart-empty">
          {scope === "open" ? "Nenhuma encomenda em aberto." : "Nenhuma encomenda nos últimos 30 dias."}
        </p>
      )}

      {grouped.map((group) => (
        <section key={group.heading} className="preorder-day">
          <h2 className="section-title">{group.heading}</h2>
          <div className="preorder-grid">
            {group.items.map((preorder) => {
              const balance = Number(preorder.totalAmount) - Number(preorder.depositAmount);
              const isOpen = OPEN_STATUSES.includes(preorder.status);
              const late = isOpen && new Date(preorder.deliveryAt) < new Date();
              const wa = whatsappLink(preorder);
              return (
                <article
                  key={preorder.id}
                  className={`preorder-card${late ? " preorder-card-late" : ""}${isOpen ? "" : " preorder-card-closed"}`}
                >
                  <header>
                    <div>
                      <span className="preorder-time">{formatTime(preorder.deliveryAt)}</span>
                      <strong>{preorder.customerName}</strong>
                      {preorder.customerPhone && <small>{preorder.customerPhone}</small>}
                    </div>
                    <span className={`status-pill ${STATUS_PILL[preorder.status]}`}>
                      {late ? "Atrasada" : STATUS_LABEL[preorder.status]}
                    </span>
                  </header>
                  <ul className="preorder-items">
                    {preorder.items.map((item) => (
                      <li key={item.id}>
                        <span>
                          <strong>{item.quantity}x</strong> {item.product.name}
                        </span>
                        <span>{formatMoney(item.quantity * Number(item.unitPrice))}</span>
                      </li>
                    ))}
                  </ul>
                  {preorder.notes && <p className="preorder-notes">{preorder.notes}</p>}
                  <dl className="preorder-money">
                    <div>
                      <dt>Total</dt>
                      <dd>{formatMoney(preorder.totalAmount)}</dd>
                    </div>
                    <div>
                      <dt>Sinal</dt>
                      <dd>
                        {formatMoney(preorder.depositAmount)}
                        {preorder.depositMethod && <small> ({PAYMENT_LABEL[preorder.depositMethod]})</small>}
                      </dd>
                    </div>
                    <div>
                      <dt>{preorder.status === "DELIVERED" ? "Saldo pago" : "Falta pagar"}</dt>
                      <dd className={balance > 0 && isOpen ? "preorder-balance-due" : undefined}>
                        {formatMoney(balance)}
                        {preorder.balanceMethod && <small> ({PAYMENT_LABEL[preorder.balanceMethod]})</small>}
                      </dd>
                    </div>
                  </dl>
                  {isOpen && (
                    <div className="table-actions preorder-actions">
                      {NEXT_STATUS[preorder.status] && (
                        <button
                          type="button"
                          onClick={() => act(() => preorderService.setPreorderStatus(preorder.id, NEXT_STATUS[preorder.status]))}
                        >
                          {NEXT_LABEL[preorder.status]}
                        </button>
                      )}
                      <button
                        type="button"
                        className="primary"
                        onClick={() => {
                          setBalanceMethod("CASH");
                          setDelivering(preorder);
                        }}
                      >
                        Entregar
                      </button>
                      <button type="button" onClick={() => openEdit(preorder)}>
                        Editar
                      </button>
                      {wa && (
                        <a href={wa} target="_blank" rel="noreferrer">
                          WhatsApp
                        </a>
                      )}
                      <button type="button" className="danger" onClick={() => handleCancel(preorder)}>
                        Cancelar
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {form && (
        <div className="checkout-modal-overlay" onClick={() => !saving && setForm(null)}>
          <form className="checkout-modal checkout-modal-wide" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <h2>{editingId ? `Editar encomenda #${editingId}` : "Nova encomenda"}</h2>

            <label htmlFor="po-client">Cliente cadastrado (opcional)</label>
            <div className="select-wrap">
              <select id="po-client" value={form.clientId} onChange={(e) => handleClientChange(e.target.value)}>
                <option value="">Cliente avulso</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <IconChevronDown />
            </div>

            <div className="form-row">
              <div>
                <label htmlFor="po-name">Nome</label>
                <input
                  id="po-name"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="po-phone">Telefone / WhatsApp</label>
                <input
                  id="po-phone"
                  value={form.customerPhone}
                  onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <label htmlFor="po-delivery">Data e hora da entrega</label>
            <input
              id="po-delivery"
              type="datetime-local"
              value={form.deliveryAt}
              onChange={(e) => setForm({ ...form, deliveryAt: e.target.value })}
              required
            />

            <label>Itens</label>
            <div className="preorder-form-items">
              {form.items.map((item, index) => (
                <div key={index} className="preorder-form-item">
                  <div className="select-wrap">
                    <select
                      aria-label="Produto"
                      value={item.productId}
                      onChange={(e) => handleProductChange(index, e.target.value)}
                      required
                    >
                      <option value="">Produto...</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                    <IconChevronDown />
                  </div>
                  <input
                    aria-label="Quantidade"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Qtd"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: e.target.value })}
                    required
                  />
                  <input
                    aria-label="Preço unitário"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="R$ un."
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
                  />
                  <button
                    type="button"
                    className="remove-item"
                    aria-label="Remover item"
                    disabled={form.items.length === 1}
                    onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== index) })}
                  >
                    <IconClose />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="link-button"
                onClick={() =>
                  setForm({ ...form, items: [...form.items, { productId: "", quantity: "", unitPrice: "" }] })
                }
              >
                + Adicionar item
              </button>
              <span className="field-hint">O preço unitário vem do cadastro, mas pode ser ajustado (ex: preço de cento).</span>
            </div>

            <div className="checkout-modal-total">
              <span>Total da encomenda</span>
              <strong>{formatMoney(formTotal)}</strong>
            </div>

            {!editingId && (
              <div className="form-row">
                <div>
                  <label htmlFor="po-deposit">Sinal pago agora (R$)</label>
                  <input
                    id="po-deposit"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={form.depositAmount}
                    onChange={(e) => setForm({ ...form, depositAmount: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="po-deposit-method">Forma do sinal</label>
                  <div className="select-wrap">
                    <select
                      id="po-deposit-method"
                      value={form.depositMethod}
                      onChange={(e) => setForm({ ...form, depositMethod: e.target.value })}
                    >
                      {MONEY_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {PAYMENT_LABEL[method]}
                        </option>
                      ))}
                    </select>
                    <IconChevronDown />
                  </div>
                </div>
              </div>
            )}
            {editingId && Number(form.depositAmount) > 0 && (
              <p className="field-hint">Sinal já pago: {formatMoney(form.depositAmount)} (não é alterado na edição).</p>
            )}

            <label htmlFor="po-notes">Observações</label>
            <input
              id="po-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Ex: metade frito, metade congelado; retirar no balcão"
            />

            {formError && <p className="form-error">{formError}</p>}
            <div className="checkout-modal-actions">
              <button type="button" className="secondary" onClick={() => setForm(null)} disabled={saving}>
                Voltar
              </button>
              <button type="submit" className="checkout-button" disabled={saving}>
                {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Registrar encomenda"}
              </button>
            </div>
          </form>
        </div>
      )}

      {delivering && (
        <div className="checkout-modal-overlay" onClick={() => setDelivering(null)}>
          <form className="checkout-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleDeliver}>
            <h2>Entregar encomenda de {delivering.customerName}</h2>
            <div className="checkout-modal-total">
              <span>{deliveringBalance > 0 ? "Receber agora" : "Já quitada"}</span>
              <strong>{formatMoney(Math.max(deliveringBalance, 0))}</strong>
            </div>
            {deliveringBalance > 0 && (
              <>
                <label htmlFor="balance-method">Forma de pagamento do saldo</label>
                <div className="select-wrap">
                  <select id="balance-method" value={balanceMethod} onChange={(e) => setBalanceMethod(e.target.value)}>
                    {MONEY_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {PAYMENT_LABEL[method]}
                      </option>
                    ))}
                  </select>
                  <IconChevronDown />
                </div>
              </>
            )}
            <div className="checkout-modal-actions">
              <button type="button" className="secondary" onClick={() => setDelivering(null)}>
                Voltar
              </button>
              <button type="submit" className="checkout-button">
                Confirmar entrega
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
