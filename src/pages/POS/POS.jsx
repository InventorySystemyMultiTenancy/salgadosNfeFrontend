import { useEffect, useState } from "react";
import * as productService from "../../services/product.service";
import * as orderService from "../../services/order.service";
import * as clientService from "../../services/client.service";
import { useCart } from "../../contexts/CartContext";
import { IconPlus, IconMinus, IconClose, IconBox, IconReceipt, IconUtensils, IconChevronDown } from "../../components/icons";

const PAYMENT_METHODS = [
  { value: "CASH", label: "Dinheiro" },
  { value: "DEBIT", label: "Cartão de Débito" },
  { value: "CREDIT", label: "Cartão de Crédito" },
  { value: "PIX", label: "Pix" },
  { value: "TAB", label: "Fiado (Caderneta)" },
];

export default function POS() {
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [clientId, setClientId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { items, addItem, decreaseItem, removeItem, clearCart, total } = useCart();

  useEffect(() => {
    productService.listProducts().then(setProducts);
    clientService.listClients().then(setClients);
  }, []);

  const isTab = paymentMethod === "TAB";

  const productsByCategory = products.reduce((groups, product) => {
    groups[product.category] ??= [];
    groups[product.category].push(product);
    return groups;
  }, {});

  async function handleCheckout() {
    if (items.length === 0) return;
    if (isTab && !clientId) {
      setError("Selecione o cliente para venda fiado.");
      return;
    }

    setSubmitting(true);
    setError("");
    setFeedback("");

    try {
      await orderService.createOrder({
        paymentMethod,
        clientId: clientId ? Number(clientId) : undefined,
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      });
      clearCart();
      setClientId("");
      setFeedback("Venda registrada com sucesso!");
      productService.listProducts().then(setProducts);
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao registrar a venda.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pos-page">
      <div className="pos-products">
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

        <label htmlFor="payment-method">Forma de pagamento</label>
        <div className="select-wrap">
          <select id="payment-method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
          <IconChevronDown />
        </div>

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

        {error && <p className="form-error">{error}</p>}
        {feedback && <p className="form-success">{feedback}</p>}

        <button
          type="button"
          className="checkout-button"
          onClick={handleCheckout}
          disabled={items.length === 0 || submitting}
        >
          {submitting ? "Finalizando..." : "Finalizar Venda"}
        </button>
      </aside>
    </div>
  );
}
