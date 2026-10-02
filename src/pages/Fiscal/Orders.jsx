import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import * as orderService from "../../services/order.service";
import * as fiscalService from "../../services/fiscal.service";
import * as clientService from "../../services/client.service";
import { IconChevronDown } from "../../components/icons";
import { printReceipt } from "../../utils/receiptPrint";
import { printReceiptEscPos } from "../../utils/qzPrint";
import { formatDateTime, formatMoney } from "../../utils/format";

const STATUS_LABEL = {
  NOT_EMITTED: "Não emitido",
  PENDING: "Pendente de confirmação",
  AUTHORIZED: "Autorizado",
  REJECTED: "Rejeitado",
};
const PAYMENT_LABEL = { CASH: "Dinheiro", DEBIT: "Débito", CREDIT: "Crédito", PIX: "Pix", TAB: "Fiado" };
const FISCAL_TYPE_LABEL = { NFCE: "NFC-e", NFE: "NF-e" };

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const clientId = searchParams.get("clientId") || "";
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [errors, setErrors] = useState({});
  const [companyInfo, setCompanyInfo] = useState({});
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [canceling, setCanceling] = useState(false);

  async function load() {
    const data = await orderService.fetchOrders({ clientId: clientId || undefined });
    setOrders(data);
  }

  useEffect(() => {
    clientService.listClients().then(setClients);
    fiscalService.fetchFiscalSettings().then(setCompanyInfo).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [clientId]);

  function handleClientFilterChange(value) {
    if (value) {
      setSearchParams({ clientId: value });
    } else {
      setSearchParams({});
    }
  }

  async function handleEmit(orderId, emitFn) {
    setErrors((current) => ({ ...current, [orderId]: "" }));
    try {
      await emitFn(orderId);
      await load();
    } catch (err) {
      setErrors((current) => ({ ...current, [orderId]: err.response?.data?.error || "Erro ao emitir." }));
    }
  }

  async function handlePrintReceipt(order) {
    try {
      await printReceiptEscPos(order, companyInfo);
    } catch {
      // QZ Tray não instalado/rodando na máquina — cai pro print via navegador como alternativa.
      printReceipt(order, companyInfo);
    }
  }

  function openCancel(order) {
    setCancelTarget(order);
    setCancelReason("");
    setCancelError("");
  }

  async function handleCancel(event) {
    event.preventDefault();
    setCanceling(true);
    setCancelError("");
    try {
      await orderService.cancelOrder(cancelTarget.id, cancelReason);
      setCancelTarget(null);
      await load();
    } catch (err) {
      setCancelError(err.response?.data?.error || "Erro ao cancelar o pedido.");
    } finally {
      setCanceling(false);
    }
  }

  const selectedClient = clients.find((c) => String(c.id) === clientId);

  return (
    <div className="page">
      <h1>Pedidos</h1>

      <div className="form-row">
        <div>
          <label htmlFor="client-filter">Cliente</label>
          <div className="select-wrap">
            <select id="client-filter" value={clientId} onChange={(e) => handleClientFilterChange(e.target.value)}>
              <option value="">Todos os pedidos</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} {client.cnpj ? `(CNPJ ${client.cnpj})` : client.cpf ? `(CPF ${client.cpf})` : ""}
                </option>
              ))}
            </select>
            <IconChevronDown />
          </div>
        </div>
        <div />
      </div>
      {clientId && !selectedClient && <p className="cart-empty">Carregando cliente...</p>}
      {selectedClient && !selectedClient.cnpj && !selectedClient.cpf && (
        <p className="form-error">
          Esse cliente não tem CPF/CNPJ cadastrado — a emissão de nota fiscal em nome dele será recusada.
        </p>
      )}

      <div className="table-scroll">
        <table className="product-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Data</th>
              <th>Cliente</th>
              <th>Pagamento</th>
              <th>Total</th>
              <th>Tipo</th>
              <th>Status fiscal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className={order.canceledAt ? "order-canceled-row" : undefined}>
                <td>
                  #{order.id}
                  {order.canceledAt && <span className="status-pill status-pill-danger">Cancelado</span>}
                </td>
                <td>{formatDateTime(order.createdAt)}</td>
                <td>{order.client?.name || "Não identificado"}</td>
                <td>{PAYMENT_LABEL[order.paymentMethod]}</td>
                <td className="order-total-cell">{formatMoney(order.totalAmount)}</td>
                <td>{order.fiscalType ? FISCAL_TYPE_LABEL[order.fiscalType] : "-"}</td>
                <td style={{ maxWidth: 280, overflowWrap: "break-word" }}>
                  {STATUS_LABEL[order.fiscalStatus]}
                  {order.fiscalStatus === "REJECTED" && order.fiscalError && (
                    <div className="form-error">{order.fiscalError}</div>
                  )}
                  {order.fiscalStatus === "PENDING" && order.fiscalError && (
                    <div className="cart-empty">{order.fiscalError}</div>
                  )}
                  {order.fiscalKey && <div className="cart-empty">Chave: {order.fiscalKey}</div>}
                  {order.fiscalDanfeUrl && (
                    <div>
                      <a href={order.fiscalDanfeUrl} target="_blank" rel="noreferrer">
                        Ver DANFE
                      </a>
                      {order.fiscalXmlUrl && (
                        <>
                          {" · "}
                          <a href={order.fiscalXmlUrl} target="_blank" rel="noreferrer">
                            XML
                          </a>
                        </>
                      )}
                    </div>
                  )}
                </td>
                <td className="table-actions">
                  {order.canceledAt ? (
                    <div className="order-cancel-info">
                      Cancelado por {order.canceledBy?.name ?? "—"} em {formatDateTime(order.canceledAt)}
                      <br />
                      Motivo: {order.cancelReason}
                    </div>
                  ) : (
                    <>
                      <button type="button" onClick={() => handleEmit(order.id, fiscalService.emitFiscal)}>
                        Emitir NFC-e
                      </button>
                      <button type="button" onClick={() => handleEmit(order.id, fiscalService.emitFiscalNFe)}>
                        Emitir NF-e
                      </button>
                      <button type="button" onClick={() => handlePrintReceipt(order)}>
                        Imprimir Cupom
                      </button>
                      {order.fiscalStatus !== "AUTHORIZED" && order.fiscalStatus !== "PENDING" && (
                        <button type="button" className="danger" onClick={() => openCancel(order)}>
                          Cancelar
                        </button>
                      )}
                    </>
                  )}
                  {errors[order.id] && <div className="form-error">{errors[order.id]}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {orders.length === 0 && <p className="cart-empty">Nenhum pedido registrado ainda.</p>}

      {cancelTarget && (
        <div className="checkout-modal-overlay" onClick={() => !canceling && setCancelTarget(null)}>
          <form className="checkout-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleCancel}>
            <h2>Cancelar pedido #{cancelTarget.id}</h2>
            <div className="checkout-modal-total">
              <span>{PAYMENT_LABEL[cancelTarget.paymentMethod]}</span>
              <strong>{formatMoney(cancelTarget.totalAmount)}</strong>
            </div>
            <ul className="cancel-effects">
              <li>Os itens voltam para o estoque.</li>
              {cancelTarget.paymentMethod === "TAB" && (
                <li>O valor sai do saldo devedor de {cancelTarget.client?.name}.</li>
              )}
              <li>O pedido sai dos relatórios e do fechamento de caixa.</li>
              {cancelTarget.terminalPayment && (
                <li className="cancel-effects-warn">
                  Foi pago na maquininha: faça o estorno no aparelho/app do banco. O sistema não estorna sozinho.
                </li>
              )}
              {cancelTarget.paymentMethod === "CASH" && (
                <li className="cancel-effects-warn">Se devolver o dinheiro ao cliente, registre uma sangria no Caixa.</li>
              )}
            </ul>
            <label htmlFor="cancel-reason">Motivo</label>
            <input
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ex: lançado em duplicidade, cliente desistiu..."
              autoFocus
              required
            />
            {cancelError && <p className="form-error">{cancelError}</p>}
            <div className="checkout-modal-actions">
              <button type="button" className="secondary" onClick={() => setCancelTarget(null)} disabled={canceling}>
                Voltar
              </button>
              <button type="submit" className="checkout-button danger-button" disabled={canceling}>
                {canceling ? "Cancelando..." : "Confirmar cancelamento"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
