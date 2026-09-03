import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import * as orderService from "../../services/order.service";
import * as fiscalService from "../../services/fiscal.service";
import * as clientService from "../../services/client.service";
import { IconChevronDown } from "../../components/icons";
import { printReceipt } from "../../utils/receiptPrint";

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

  const selectedClient = clients.find((c) => String(c.id) === clientId);

  return (
    <div className="page">
      <h1>Fiscal — Pedidos</h1>

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
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>{order.client?.name || "Não identificado"}</td>
                <td>{PAYMENT_LABEL[order.paymentMethod]}</td>
                <td>R$ {Number(order.totalAmount).toFixed(2)}</td>
                <td>{order.fiscalType ? FISCAL_TYPE_LABEL[order.fiscalType] : "-"}</td>
                <td>
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
                  <button type="button" onClick={() => handleEmit(order.id, fiscalService.emitFiscal)}>
                    Emitir NFC-e
                  </button>
                  <button type="button" onClick={() => handleEmit(order.id, fiscalService.emitFiscalNFe)}>
                    Emitir NF-e
                  </button>
                  <button type="button" onClick={() => printReceipt(order, companyInfo)}>
                    Imprimir Cupom
                  </button>
                  {errors[order.id] && <div className="form-error">{errors[order.id]}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {orders.length === 0 && <p className="cart-empty">Nenhum pedido registrado ainda.</p>}
    </div>
  );
}
