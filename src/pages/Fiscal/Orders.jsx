import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import * as orderService from "../../services/order.service";
import * as fiscalService from "../../services/fiscal.service";
import * as clientService from "../../services/client.service";
import * as userService from "../../services/user.service";
import { FilterBar, Pagination, PeriodFilter, SearchFilter, SelectFilter } from "../../components/Filters";
import { periodParams } from "../../utils/filters";
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
const PAGE_SIZE = 50;
const EMPTY_FILTERS = {
  q: "",
  period: "30d",
  custom: { from: "", to: "" },
  paymentMethod: "",
  fiscalStatus: "",
  status: "",
  sellerId: "",
};
const toOptions = (labels) => Object.entries(labels).map(([value, label]) => ({ value, label }));

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const clientId = searchParams.get("clientId") || "";
  const [result, setResult] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  // Busca digitada só vai pro servidor depois de uma pausa, não a cada tecla.
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [loadError, setLoadError] = useState("");
  const [clients, setClients] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [errors, setErrors] = useState({});
  const [companyInfo, setCompanyInfo] = useState({});
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [canceling, setCanceling] = useState(false);

  async function load() {
    setLoadError("");
    try {
      const data = await orderService.fetchOrders({
        clientId: clientId || undefined,
        q: debouncedQ || undefined,
        paymentMethod: filters.paymentMethod || undefined,
        fiscalStatus: filters.fiscalStatus || undefined,
        status: filters.status || undefined,
        sellerId: filters.sellerId || undefined,
        ...periodParams(filters.period, filters.custom),
        page,
        pageSize: PAGE_SIZE,
      });
      setResult(data);
    } catch (err) {
      setLoadError(err.response?.data?.error || "Erro ao carregar pedidos.");
    }
  }

  useEffect(() => {
    clientService.listClients().then(setClients);
    userService
      .listUsers()
      .then(setSellers)
      .catch(() => {});
    fiscalService
      .fetchFiscalSettings()
      .then(setCompanyInfo)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(filters.q.trim()), 350);
    return () => clearTimeout(timer);
  }, [filters.q]);

  useEffect(() => {
    load();
  }, [
    clientId,
    debouncedQ,
    filters.paymentMethod,
    filters.fiscalStatus,
    filters.status,
    filters.sellerId,
    filters.period,
    filters.custom,
    page,
  ]);

  // Qualquer filtro novo volta pra primeira página.
  function updateFilter(changes) {
    setFilters((current) => ({ ...current, ...changes }));
    setPage(1);
  }

  function handleClientFilterChange(value) {
    setPage(1);
    if (value) {
      setSearchParams({ clientId: value });
    } else {
      setSearchParams({});
    }
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setPage(1);
    setSearchParams({});
  }

  const orders = result?.orders ?? [];
  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;
  const hasActiveFilters = Boolean(clientId) || JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

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

      <FilterBar
        canClear={hasActiveFilters}
        onClear={clearFilters}
        summary={result && `${result.total} pedido(s) · ${formatMoney(result.totalAmount)} em vendas válidas`}
      >
        <SearchFilter
          value={filters.q}
          onChange={(q) => updateFilter({ q })}
          placeholder="Nº do pedido, nome do cliente, CPF ou CNPJ..."
        />
        <PeriodFilter
          value={filters.period}
          onChange={(period) => updateFilter({ period })}
          custom={filters.custom}
          onCustomChange={(custom) => updateFilter({ custom })}
        />
        <SelectFilter
          label="Cliente"
          value={clientId}
          onChange={handleClientFilterChange}
          allLabel="Todos os clientes"
          options={clients.map((client) => ({ value: String(client.id), label: client.name }))}
        />
        <SelectFilter
          label="Pagamento"
          value={filters.paymentMethod}
          onChange={(paymentMethod) => updateFilter({ paymentMethod })}
          options={toOptions(PAYMENT_LABEL)}
        />
        <SelectFilter
          label="Nota fiscal"
          value={filters.fiscalStatus}
          onChange={(fiscalStatus) => updateFilter({ fiscalStatus })}
          options={toOptions(STATUS_LABEL)}
        />
        <SelectFilter
          label="Situação"
          value={filters.status}
          onChange={(status) => updateFilter({ status })}
          options={[
            { value: "active", label: "Válidos" },
            { value: "canceled", label: "Cancelados" },
          ]}
        />
        <SelectFilter
          label="Vendedor"
          value={filters.sellerId}
          onChange={(sellerId) => updateFilter({ sellerId })}
          options={sellers.map((seller) => ({ value: String(seller.id), label: seller.name }))}
        />
      </FilterBar>
      {loadError && <p className="form-error">{loadError}</p>}
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
      {result && orders.length === 0 && (
        <p className="cart-empty">
          {hasActiveFilters ? "Nenhum pedido com esses filtros." : "Nenhum pedido registrado ainda."}
        </p>
      )}
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

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
                <li className="cancel-effects-warn">
                  Se devolver o dinheiro ao cliente, registre uma sangria no Caixa.
                </li>
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
