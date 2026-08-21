import { useEffect, useMemo, useState } from "react";
import * as orderService from "../../services/order.service";
import { useSocket } from "../../contexts/SocketContext";

const STATUS_LABEL = { PENDING: "Pendente", PREPARING: "Em Preparo", READY: "Pronto" };
const NEXT_STATUS = { PENDING: "PREPARING", PREPARING: "READY" };
const NEXT_LABEL = { PENDING: "Iniciar preparo", PREPARING: "Marcar pronto" };

export default function Kitchen() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const socket = useSocket();

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
        if (order.kitchenStatus === "READY") {
          return current.filter((item) => item.id !== order.id);
        }
        return current.map((item) => (item.id === order.id ? order : item));
      });
    }

    socket.on("order:created", handleCreated);
    socket.on("order:updated", handleUpdated);

    return () => {
      socket.off("order:created", handleCreated);
      socket.off("order:updated", handleUpdated);
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

  return (
    <div className="page kitchen-page">
      <h1>Painel da Cozinha</h1>

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
