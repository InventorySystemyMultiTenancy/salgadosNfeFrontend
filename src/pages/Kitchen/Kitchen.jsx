import { useEffect, useMemo, useState } from "react";
import * as orderService from "../../services/order.service";
import * as preorderService from "../../services/preorder.service";
import { formatDateTime } from "../../utils/format";
import { useSocket } from "../../contexts/SocketContext";

const STATUS_LABEL = { PENDING: "Pendente", PREPARING: "Em Preparo", READY: "Pronto" };
const NEXT_STATUS = { PENDING: "PREPARING", PREPARING: "READY" };
const NEXT_LABEL = { PENDING: "Iniciar preparo", PREPARING: "Marcar pronto" };
const PREORDER_STATUS_LABEL = { PENDING: "A produzir", IN_PRODUCTION: "Em produção", READY: "Pronta" };
const PREORDER_NEXT = { PENDING: "IN_PRODUCTION", IN_PRODUCTION: "READY" };
const PREORDER_NEXT_LABEL = { PENDING: "Iniciar produção", IN_PRODUCTION: "Marcar pronta" };

function deliveryLabel(deliveryAt) {
  const date = new Date(deliveryAt);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (date < today) return `Atrasada (${formatDateTime(deliveryAt)})`;
  if (date.toDateString() === today.toDateString()) return `Hoje às ${time}`;
  if (date.toDateString() === tomorrow.toDateString()) return `Amanhã às ${time}`;
  return formatDateTime(deliveryAt);
}

export default function Kitchen() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [preorders, setPreorders] = useState([]);
  const socket = useSocket();

  function loadPreorders() {
    preorderService.fetchProductionQueue().then(setPreorders).catch(() => {});
  }

  useEffect(() => {
    loadPreorders();
  }, []);

  useEffect(() => {
    orderService
      .fetchKitchenQueue()
      .then(setOrders)
      .catch((err) => {
        setError(err.response?.data?.error || "Erro ao carregar a fila da cozinha.");
      });
  }, []);

  useEffect(() => {
    if (!socket) return;

    function handleCreated(order) {
      setOrders((current) => [...current, order]);
    }

    function handleUpdated(order) {
      setOrders((current) => {
        if (order.kitchenStatus === "READY" || order.canceledAt) {
          return current.filter((item) => item.id !== order.id);
        }
        return current.map((item) => (item.id === order.id ? order : item));
      });
    }

    socket.on("order:created", handleCreated);
    socket.on("order:updated", handleUpdated);
    socket.on("preorder:updated", loadPreorders);

    return () => {
      socket.off("order:created", handleCreated);
      socket.off("order:updated", handleUpdated);
      socket.off("preorder:updated", loadPreorders);
    };
  }, [socket]);

  const consolidated = useMemo(() => {
    const counts = new Map();
    for (const order of orders) {
      for (const item of order.items) {
        counts.set(item.product.name, (counts.get(item.product.name) || 0) + item.quantity);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [orders]);

  async function advanceStatus(order) {
    const next = NEXT_STATUS[order.kitchenStatus];
    if (!next) return;
    const updated = await orderService.updateKitchenStatus(order.id, next);
    if (updated.kitchenStatus === "READY") {
      setOrders((current) => current.filter((item) => item.id !== order.id));
    } else {
      setOrders((current) => current.map((item) => (item.id === order.id ? updated : item)));
    }
  }

  async function advancePreorder(preorder) {
    const next = PREORDER_NEXT[preorder.status];
    if (!next) return;
    const updated = await preorderService.setPreorderStatus(preorder.id, next);
    setPreorders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  return (
    <div className="page kitchen-page">
      <h1>Painel da Cozinha</h1>

      {preorders.length > 0 && (
        <section className="kitchen-preorders">
          <h2>Encomendas — próximas 48h</h2>
          <div className="kitchen-queue">
            {preorders.map((preorder) => (
              <div
                key={preorder.id}
                className={`kitchen-card kitchen-card-preorder${new Date(preorder.deliveryAt) < new Date() ? " kitchen-card-late" : ""}`}
              >
                <header>
                  <span>{preorder.customerName}</span>
                  <span className="kitchen-status-badge">{PREORDER_STATUS_LABEL[preorder.status]}</span>
                </header>
                <div className="kitchen-delivery">{deliveryLabel(preorder.deliveryAt)}</div>
                <ul>
                  {preorder.items.map((item) => (
                    <li key={item.id}>
                      <strong>{item.quantity}x</strong> {item.product.name}
                    </li>
                  ))}
                </ul>
                {preorder.notes && <p className="kitchen-notes">{preorder.notes}</p>}
                <footer>
                  <span className="kitchen-seller">Encomenda #{preorder.id}</span>
                  {PREORDER_NEXT[preorder.status] && (
                    <button type="button" onClick={() => advancePreorder(preorder)}>
                      {PREORDER_NEXT_LABEL[preorder.status]}
                    </button>
                  )}
                </footer>
              </div>
            ))}
          </div>
        </section>
      )}

      {consolidated.length > 0 && (
        <section className="kitchen-consolidated">
          <h2>Total a produzir</h2>
          <div className="consolidated-grid">
            {consolidated.map(([name, quantity]) => (
              <div key={name} className="consolidated-item">
                <strong>{quantity}x</strong> {name}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="kitchen-queue">
        {error && <p className="form-error">{error}</p>}
        {!error && orders.length === 0 && <p className="cart-empty">Nenhum pedido na fila.</p>}
        {orders.map((order) => (
          <div key={order.id} className={`kitchen-card kitchen-card-${order.kitchenStatus.toLowerCase()}`}>
            <header>
              <span>Pedido #{order.id}</span>
              <span className="kitchen-status-badge">{STATUS_LABEL[order.kitchenStatus]}</span>
            </header>
            <ul>
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.quantity}x {item.product.name}
                </li>
              ))}
            </ul>
            <footer>
              <span className="kitchen-seller">Operador: {order.seller?.name}</span>
              {NEXT_STATUS[order.kitchenStatus] && (
                <button type="button" onClick={() => advanceStatus(order)}>
                  {NEXT_LABEL[order.kitchenStatus]}
                </button>
              )}
            </footer>
          </div>
        ))}
      </div>
    </div>
  );
}
