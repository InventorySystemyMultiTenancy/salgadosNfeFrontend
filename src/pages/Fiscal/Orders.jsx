import { useEffect, useState } from "react";
import * as orderService from "../../services/order.service";
import * as fiscalService from "../../services/fiscal.service";

const STATUS_LABEL = { NOT_EMITTED: "Não emitido", AUTHORIZED: "Autorizado", REJECTED: "Rejeitado" };
const PAYMENT_LABEL = { CASH: "Dinheiro", DEBIT: "Débito", CREDIT: "Crédito", PIX: "Pix", TAB: "Fiado" };

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [errors, setErrors] = useState({});

  async function load() {
    const data = await orderService.fetchOrders();
    setOrders(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleEmit(orderId) {
    setErrors((current) => ({ ...current, [orderId]: "" }));
    try {
      await fiscalService.emitFiscal(orderId);
      await load();
    } catch (err) {
      setErrors((current) => ({ ...current, [orderId]: err.response?.data?.error || "Erro ao emitir." }));
    }
  }

  return (
    <div className="page">
      <h1>Fiscal — Pedidos</h1>

      <table className="product-table">
        <thead>
          <tr>
            <th>Pedido</th>
            <th>Pagamento</th>
            <th>Total</th>
            <th>Status fiscal</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>#{order.id}</td>
              <td>{PAYMENT_LABEL[order.paymentMethod]}</td>
              <td>R$ {Number(order.totalAmount).toFixed(2)}</td>
              <td>
                {STATUS_LABEL[order.fiscalStatus]}
                {order.fiscalStatus === "REJECTED" && order.fiscalError && (
                  <div className="form-error">{order.fiscalError}</div>
                )}
                {order.fiscalKey && <div className="cart-empty">Chave: {order.fiscalKey}</div>}
              </td>
              <td className="table-actions">
                <button type="button" onClick={() => handleEmit(order.id)}>
                  Emitir NFC-e
                </button>
                {errors[order.id] && <div className="form-error">{errors[order.id]}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {orders.length === 0 && <p className="cart-empty">Nenhum pedido registrado ainda.</p>}
    </div>
  );
}
