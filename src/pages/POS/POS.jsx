import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as productService from "../../services/product.service";
import * as orderService from "../../services/order.service";
import * as clientService from "../../services/client.service";
import * as fiscalService from "../../services/fiscal.service";
import * as paymentService from "../../services/payment.service";
import * as cashService from "../../services/cash.service";
import { useCart } from "../../contexts/CartContext";
import { useCustomerDisplay } from "../../hooks/useCustomerDisplay";
import { printReceipt } from "../../utils/receiptPrint";
import { printReceiptEscPos } from "../../utils/qzPrint";
import {
  IconPlus,
  IconMinus,
  IconClose,
  IconBox,
  IconReceipt,
  IconUtensils,
  IconChevronDown,
  IconSearch,
} from "../../components/icons";

const PAYMENT_METHODS = [
  { value: "CASH", label: "Dinheiro" },
  { value: "DEBIT", label: "Cartão de Débito" },
  { value: "CREDIT", label: "Cartão de Crédito" },
  { value: "PIX", label: "Pix" },
  { value: "TAB", label: "Fiado (Caderneta)" },
];

const CHARGE_POLL_MS = 2500;

function matchesSearch(product, term) {
  if (!term) return true;
  return product.name.toLowerCase().includes(term) || String(product.id) === term;
}

export default function POS() {
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [clientId, setClientId] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [companyInfo, setCompanyInfo] = useState({});
  // Formas que a maquininha integrada aceita (Config. Pagamento) — vazio = sem maquininha.
  const [terminalMethods, setTerminalMethods] = useState([]);
  const [useTerminal, setUseTerminal] = useState(true);
  // Cobrança atual na maquininha. Fica guardada depois de aprovada até a venda ser registrada,
  // pra poder tentar registrar de novo sem cobrar o cliente duas vezes.
  const [charge, setCharge] = useState(null);
  // null = ainda não sabe; false = caixa fechado (mostra aviso, mas não bloqueia a venda).
  const [cashOpen, setCashOpen] = useState(null);
  const registeringRef = useRef(false);
  const { items, addItem, decreaseItem, removeItem, clearCart, total } = useCart();
  const display = useCustomerDisplay();
  const searchInputRef = useRef(null);

  useEffect(() => {
    productService.listProducts().then(setProducts);
    clientService.listClients().then(setClients);
    fiscalService.fetchPublicFiscalSettings().then(setCompanyInfo).catch(() => {});
    paymentService
      .fetchPublicPaymentSettings()
      .then((settings) => setTerminalMethods(settings.methods ?? []))
      .catch(() => {});
    cashService
      .fetchCurrentCash()
      .then((session) => setCashOpen(Boolean(session)))
      .catch(() => {});
  }, []);

  // Atalhos de busca rápida: Ctrl+K ou F2 focam o campo, de qualquer lugar da tela.
  useEffect(() => {
    function handleGlobalKeyDown(e) {
      if (isCheckoutOpen) return;
      if (e.key === "F2" || (e.ctrlKey && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isCheckoutOpen]);

  const chargePending = charge?.status === "PENDING";

  useEffect(() => {
    if (!isCheckoutOpen || chargePending) return;
    function handleEscape(e) {
      if (e.key === "Escape") setIsCheckoutOpen(false);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isCheckoutOpen, chargePending]);

  const isTab = paymentMethod === "TAB";
  const isCash = paymentMethod === "CASH";
  const terminalAvailable = terminalMethods.includes(paymentMethod);
  const willUseTerminal = terminalAvailable && useTerminal;
  const receivedValue = cashReceived === "" ? null : Number(cashReceived);
  const troco = receivedValue != null ? receivedValue - total : null;

  // Mantém o display de cliente atualizado: total durante a montagem do pedido, e
  // pagar/troco só quando o operador está de fato fechando a venda em dinheiro.
  useEffect(() => {
    if (!display.isConnected) return;

    if (isCheckoutOpen && isCash && troco != null) {
      if (troco >= 0) display.sendAmount(troco, "troco");
      else display.sendAmount(total, "pagar");
    } else {
      display.sendAmount(total, "total");
    }
  }, [display.isConnected, total, isCheckoutOpen, isCash, troco]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredProducts = products.filter((product) => matchesSearch(product, normalizedSearch));
  const productsByCategory = filteredProducts.reduce((groups, product) => {
    groups[product.category] ??= [];
    groups[product.category].push(product);
    return groups;
  }, {});

  function handleSearchKeyDown(e) {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const term = searchTerm.trim();
    if (!term) return;

    const match = /^\d+$/.test(term)
      ? products.find((product) => product.id === Number(term))
      : filteredProducts.length === 1
        ? filteredProducts[0]
        : null;

    if (match && match.stockQuantity > 0) {
      addItem(match);
      setSearchTerm("");
    }
  }

  function openCheckout() {
    if (items.length === 0) return;
    setError("");
    setFeedback("");
    setLastOrder(null);
    setIsCheckoutOpen(true);
  }

  async function handleCheckout() {
    if (items.length === 0) return;
    if (isTab && !clientId) {
      setError("Selecione o cliente para venda fiado.");
      return;
    }

    if (charge?.status === "APPROVED") {
      await registerOrder(charge.id);
    } else if (willUseTerminal) {
      await startCharge();
    } else {
      await registerOrder();
    }
  }

  async function startCharge() {
    setSubmitting(true);
    setError("");
    try {
      setCharge(await paymentService.createCharge(total, paymentMethod));
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao enviar a cobrança para a maquininha.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleChargeUpdate(updated) {
    setCharge(updated);
    if (updated.status === "APPROVED") {
      registerOrder(updated.id);
    } else if (updated.status !== "PENDING") {
      setCharge(null);
      setError(
        updated.status === "CANCELED"
          ? "Cobrança cancelada. Nada foi cobrado do cliente."
          : "Pagamento recusado na maquininha. Tente de novo ou use outra forma de pagamento.",
      );
    }
  }

  async function handleCancelCharge() {
    setSubmitting(true);
    setError("");
    try {
      handleChargeUpdate(await paymentService.cancelCharge(charge.id));
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao cancelar a cobrança.");
    } finally {
      setSubmitting(false);
    }
  }

  async function registerOrder(terminalPaymentId) {
    // Polling e "Cancelar cobrança" podem voltar APPROVED quase juntos — registra uma vez só.
    if (registeringRef.current) return;
    registeringRef.current = true;
    setSubmitting(true);
    setError("");

    try {
      const order = await orderService.createOrder({
        paymentMethod,
        clientId: clientId ? Number(clientId) : undefined,
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        terminalPaymentId,
      });
      clearCart();
      setClientId("");
      setCashReceived("");
      setCharge(null);
      display.clear();
      setIsCheckoutOpen(false);
      setFeedback("Venda registrada com sucesso!");
      setLastOrder(order);
      productService.listProducts().then(setProducts);
    } catch (err) {
      const message = err.response?.data?.error || "Erro ao registrar a venda.";
      setError(
        terminalPaymentId
          ? `Pagamento aprovado na maquininha, mas a venda não foi registrada: ${message}`
          : message,
      );
    } finally {
      registeringRef.current = false;
      setSubmitting(false);
    }
  }

  // Acompanha a cobrança na maquininha até o cliente pagar ou cancelar no aparelho.
  useEffect(() => {
    if (!chargePending) return;
    const timer = setTimeout(async () => {
      try {
        handleChargeUpdate(await paymentService.fetchCharge(charge.id));
      } catch {
        setCharge({ ...charge }); // falha de rede: tenta de novo no próximo ciclo
      }
    }, CHARGE_POLL_MS);
    return () => clearTimeout(timer);
  }, [charge, chargePending]);

  async function handlePrintReceipt() {
    if (!lastOrder) return;
    try {
      await printReceiptEscPos(lastOrder, companyInfo);
    } catch {
      // QZ Tray não instalado/rodando na máquina — cai pro print via navegador como alternativa.
      printReceipt(lastOrder, companyInfo);
    }
  }

  return (
    <div className="pos-page">
      <div className="pos-products">
        {cashOpen === false && (
          <div className="pos-cash-warning">
            <span>
              <strong>Caixa fechado.</strong> Abra o caixa com o troco inicial para o fechamento do dia bater.
            </span>
            <Link to="/caixa">Abrir caixa</Link>
          </div>
        )}
        <div className="pos-search">
          <IconSearch />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar por nome ou código do item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <span className="pos-search-hint">Ctrl+K / F2</span>
        </div>

        {filteredProducts.length === 0 && (
          <p className="pos-search-empty">Nenhum item encontrado para &quot;{searchTerm}&quot;.</p>
        )}

        {Object.entries(productsByCategory).map(([category, categoryProducts]) => (
          <section key={category}>
            <h2>{category}</h2>
            <div className="product-grid">
              {categoryProducts.map((product) => {
                const lowStock =
                  product.minStockAlert != null && product.stockQuantity <= product.minStockAlert;
                return (
                  <button
                    type="button"
                    key={product.id}
                    className={`product-card${lowStock ? " product-card-low-stock" : ""}`}
                    onClick={() => addItem(product)}
                    disabled={product.stockQuantity <= 0}
                  >
                    <span className="product-card-photo">
                      <span className="product-code">#{product.id}</span>
                      {product.imageUrl ? <img src={product.imageUrl} alt="" /> : <IconUtensils />}
                      <span className="product-card-add">
                        <IconPlus />
                      </span>
                    </span>
                    <span className="product-card-body">
                      <span className="product-name">{product.name}</span>
                      <span className="product-price">R$ {Number(product.price).toFixed(2)}</span>
                      <span className="product-stock">
                        <IconBox />
                        Estoque: {product.stockQuantity}
                        {lowStock && <span className="low-stock-badge"> baixo</span>}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <aside className="cart">
        <h2>Comanda</h2>

        {display.isSupported ? (
          <div className="display-panel">
            <span className="display-panel-status">
              <span className={`display-panel-dot${display.isConnected ? " connected" : ""}`} />
              {display.isConnected ? "Display do cliente conectado" : "Display do cliente desconectado"}
            </span>
            <button type="button" onClick={display.isConnected ? display.disconnect : display.connect}>
              {display.isConnected ? "Desconectar" : "Conectar Display"}
            </button>
          </div>
        ) : (
          <p className="display-panel-status">
            Display de cliente indisponível: use Google Chrome ou Microsoft Edge.
          </p>
        )}
        {display.error && <p className="form-error">{display.error.message}</p>}

        {items.length === 0 && (
          <div className="cart-empty-state">
            <IconReceipt />
            <span className="cart-empty">Nenhum item adicionado.</span>
          </div>
        )}
        <ul className="cart-items">
          {items.map((item) => (
            <li key={item.productId}>
              <span className="cart-item-thumb">
                {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <IconUtensils size={20} />}
              </span>
              <span className="cart-item-info">
                <span className="cart-item-name">{item.name}</span>
                <span className="cart-item-unit">R$ {item.unitPrice.toFixed(2)} cada</span>
              </span>
              <div className="cart-item-controls">
                <button type="button" onClick={() => decreaseItem(item.productId)}>
                  <IconMinus />
                </button>
                <span>{item.quantity}</span>
                <button
                  type="button"
                  onClick={() =>
                    addItem({ id: item.productId, name: item.name, price: item.unitPrice, imageUrl: item.imageUrl })
                  }
                >
                  <IconPlus size={11} strokeWidth="2.6" />
                </button>
              </div>
              <span className="cart-item-line-total">R$ {(item.unitPrice * item.quantity).toFixed(2)}</span>
              <button type="button" className="remove-item" onClick={() => removeItem(item.productId)}>
                <IconClose />
              </button>
            </li>
          ))}
        </ul>

        <div className="cart-total">
          <span>Total</span>
          <strong>R$ {total.toFixed(2)}</strong>
        </div>

        {feedback && (
          <div className="pos-checkout-feedback">
            <p className="form-success">{feedback}</p>
            {lastOrder && (
              <button type="button" className="secondary" onClick={handlePrintReceipt}>
                <IconReceipt size={16} /> Imprimir Cupom Fiscal
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          className="checkout-button"
          onClick={openCheckout}
          disabled={items.length === 0}
        >
          Cobrar / Fechar Pedido
        </button>
      </aside>

      {isCheckoutOpen && (
        <div
          className="checkout-modal-overlay"
          onClick={() => !submitting && !chargePending && setIsCheckoutOpen(false)}
        >
          <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Fechar Pedido</h2>

            <div className="checkout-modal-total">
              <span>Total</span>
              <strong>R$ {total.toFixed(2)}</strong>
            </div>

            <label htmlFor="payment-method">Forma de pagamento</label>
            <div className="select-wrap">
              <select
                id="payment-method"
                value={paymentMethod}
                disabled={Boolean(charge)}
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  setCashReceived("");
                }}
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
              <IconChevronDown />
            </div>

            {isCash && (
              <>
                <label htmlFor="cash-received">Valor recebido</label>
                <input
                  id="cash-received"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  autoFocus
                />
                {troco != null && (
                  <p className={troco >= 0 ? "form-success" : "form-error"}>
                    {troco >= 0 ? `Troco: R$ ${troco.toFixed(2)}` : `Faltam R$ ${Math.abs(troco).toFixed(2)}`}
                  </p>
                )}
              </>
            )}

            {terminalAvailable && !charge && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={useTerminal}
                  onChange={(e) => setUseTerminal(e.target.checked)}
                />
                Cobrar na maquininha integrada
              </label>
            )}

            <label htmlFor="client">Cliente{isTab ? "" : " (opcional, pra nota fiscal)"}</label>
            <div className="select-wrap">
              <select id="client" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">{isTab ? "Selecione..." : "Consumidor não identificado"}</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {isTab
                      ? `${client.name} (saldo R$ ${Number(client.currentBalance).toFixed(2)} / limite R$ ${Number(client.creditLimit).toFixed(2)})`
                      : `${client.name}${client.cnpj ? ` — CNPJ ${client.cnpj}` : client.cpf ? ` — CPF ${client.cpf}` : ""}`}
                  </option>
                ))}
              </select>
              <IconChevronDown />
            </div>

            {chargePending && (
              <div className="terminal-waiting">
                <span className="terminal-spinner" />
                <div>
                  <strong>Aguardando pagamento na maquininha</strong>
                  <small>Peça para o cliente passar o cartão ou pagar com Pix no aparelho.</small>
                </div>
              </div>
            )}
            {charge?.status === "APPROVED" && (
              <p className="form-success">Pagamento aprovado na maquininha.</p>
            )}

            {error && <p className="form-error">{error}</p>}

            <div className="checkout-modal-actions">
              {chargePending ? (
                <button type="button" className="secondary" onClick={handleCancelCharge} disabled={submitting}>
                  {submitting ? "Cancelando..." : "Cancelar cobrança"}
                </button>
              ) : (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setIsCheckoutOpen(false)}
                  disabled={submitting}
                >
                  Cancelar
                </button>
              )}
              <button
                type="button"
                className="checkout-button"
                onClick={handleCheckout}
                disabled={submitting || chargePending}
              >
                {chargePending
                  ? "Aguardando maquininha..."
                  : submitting
                    ? willUseTerminal && !charge
                      ? "Enviando..."
                      : "Finalizando..."
                    : charge?.status === "APPROVED"
                      ? "Registrar Venda"
                      : willUseTerminal
                        ? "Cobrar na Maquininha"
                        : "Finalizar Venda"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
