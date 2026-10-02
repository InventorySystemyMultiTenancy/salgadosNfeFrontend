import { useEffect, useState } from "react";
import * as cashService from "../../services/cash.service";
import { useAuth } from "../../contexts/AuthContext";
import { IconChevronDown } from "../../components/icons";
import * as userService from "../../services/user.service";
import { FilterBar, PeriodFilter, SelectFilter } from "../../components/Filters";
import { periodParams } from "../../utils/filters";

const EMPTY_HISTORY_FILTERS = { period: "30d", custom: { from: "", to: "" }, userId: "", situation: "" };
import { MONEY_METHODS, PAYMENT_LABEL, formatDateTime, formatMoney, formatTime } from "../../utils/format";

const MOVEMENT_LABEL = { SUPPLY: "Suprimento", WITHDRAWAL: "Sangria" };

function Difference({ value }) {
  if (Math.abs(value) < 0.005) return <span className="cash-diff cash-diff-ok">Bateu certinho</span>;
  return (
    <span className={`cash-diff ${value > 0 ? "cash-diff-over" : "cash-diff-short"}`}>
      {value > 0 ? "Sobra" : "Falta"} de {formatMoney(Math.abs(value))}
    </span>
  );
}

// Resumo do turno — usado tanto no caixa aberto quanto no histórico de caixas fechados.
function CashSummary({ summary }) {
  return (
    <>
      <div className="stat-grid">
        <div className="stat-tile stat-tile-hero">
          <span>Dinheiro esperado na gaveta</span>
          <strong>{formatMoney(summary.expectedCash)}</strong>
          <small>Abertura {formatMoney(summary.openingAmount)} + entradas em dinheiro + suprimentos − sangrias</small>
        </div>
        <div className="stat-tile">
          <span>Vendas no turno</span>
          <strong>{formatMoney(summary.salesTotal)}</strong>
          <small>{summary.ordersCount} pedidos</small>
        </div>
        <div className="stat-tile">
          <span>Vendido no fiado</span>
          <strong>{formatMoney(summary.sales.TAB)}</strong>
          <small>A receber na caderneta</small>
        </div>
        <div className="stat-tile">
          <span>Cancelados</span>
          <strong>{summary.canceledCount}</strong>
          <small>{formatMoney(summary.canceledTotal)}</small>
        </div>
      </div>

      <div className="table-scroll">
        <table className="product-table cash-table">
          <thead>
            <tr>
              <th>Forma</th>
              <th>Vendas</th>
              <th>Fiado recebido</th>
              <th>Encomendas</th>
              <th>Total recebido</th>
            </tr>
          </thead>
          <tbody>
            {MONEY_METHODS.map((method) => (
              <tr key={method}>
                <td>
                  <strong>{PAYMENT_LABEL[method]}</strong>
                </td>
                <td>{formatMoney(summary.sales[method])}</td>
                <td>{formatMoney(summary.tabReceipts[method])}</td>
                <td>{formatMoney(summary.preorderReceipts[method])}</td>
                <td>
                  <strong>{formatMoney(summary.receivedByMethod[method])}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="field-hint">
        Pix, débito e crédito não ficam na gaveta: confira esses totais com o extrato da maquininha e do banco.
      </p>
    </>
  );
}

function MovementList({ movements }) {
  if (!movements?.length) return <p className="cart-empty">Nenhum suprimento ou sangria neste turno.</p>;
  return (
    <ul className="cash-movements">
      {movements.map((movement) => (
        <li key={movement.id}>
          <span className={`status-pill ${movement.type === "SUPPLY" ? "status-pill-success" : "status-pill-danger"}`}>
            {MOVEMENT_LABEL[movement.type]}
          </span>
          <span className="cash-movement-reason">
            {movement.reason}
            <small>
              {formatTime(movement.createdAt)} · {movement.user?.name}
            </small>
          </span>
          <strong>
            {movement.type === "SUPPLY" ? "+" : "−"}
            {formatMoney(movement.amount)}
          </strong>
        </li>
      ))}
    </ul>
  );
}

export default function Cash() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [session, setSession] = useState(undefined);
  const [history, setHistory] = useState([]);
  const [historyFilters, setHistoryFilters] = useState(EMPTY_HISTORY_FILTERS);
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [closedResult, setClosedResult] = useState(null);
  const [openingAmount, setOpeningAmount] = useState("");
  const [movement, setMovement] = useState({ type: "WITHDRAWAL", amount: "", reason: "" });
  const [countedCash, setCountedCash] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadHistory(filters = historyFilters) {
    if (!isAdmin) return;
    setHistory(
      await cashService.fetchCashSessions({
        userId: filters.userId || undefined,
        ...periodParams(filters.period, filters.custom),
      }),
    );
  }

  async function load() {
    setSession(await cashService.fetchCurrentCash());
  }

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.error || "Erro ao carregar o caixa."));
    if (isAdmin)
      userService
        .listUsers()
        .then(setUsers)
        .catch(() => {});
  }, []);

  useEffect(() => {
    loadHistory(historyFilters).catch((err) => setError(err.response?.data?.error || "Erro ao carregar o histórico."));
  }, [historyFilters.period, historyFilters.custom, historyFilters.userId]);

  async function run(action) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  function handleOpen(event) {
    event.preventDefault();
    run(async () => {
      setClosedResult(null);
      setSession(await cashService.openCash(Number(openingAmount) || 0));
      setOpeningAmount("");
    });
  }

  function handleMovement(event) {
    event.preventDefault();
    run(async () => {
      setSession(await cashService.addCashMovement({ ...movement, amount: Number(movement.amount) }));
      setMovement({ type: movement.type, amount: "", reason: "" });
    });
  }

  function handleClose(event) {
    event.preventDefault();
    if (!window.confirm("Fechar o caixa agora? Depois de fechado, o turno não pode ser reaberto.")) return;
    run(async () => {
      const closed = await cashService.closeCash({ countedCash: Number(countedCash), notes });
      setClosedResult(closed);
      setSession(null);
      setCountedCash("");
      setNotes("");
      await loadHistory();
    });
  }

  async function openHistory(id) {
    setSelected(await cashService.fetchCashSession(id));
  }

  if (session === undefined) {
    return (
      <div className="page">
        <h1>Caixa</h1>
        {error ? <p className="form-error">{error}</p> : <p className="cart-empty">Carregando...</p>}
      </div>
    );
  }

  const countedValue = countedCash === "" ? null : Number(countedCash);
  const visibleHistory = history.filter((item) => {
    const difference = item.closedAt ? Number(item.countedCash) - Number(item.expectedCash) : null;
    switch (historyFilters.situation) {
      case "open":
        return !item.closedAt;
      case "diff":
        return difference !== null && Math.abs(difference) >= 0.005;
      case "short":
        return difference !== null && difference <= -0.005;
      case "ok":
        return difference !== null && Math.abs(difference) < 0.005;
      default:
        return true;
    }
  });

  return (
    <div className="page">
      <h1>Caixa</h1>
      {error && <p className="form-error">{error}</p>}

      {closedResult && (
        <section className="product-form cash-closed-result">
          <h3>Caixa fechado às {formatTime(closedResult.closedAt)}</h3>
          <p>
            Esperado {formatMoney(closedResult.expectedCash)} · Contado {formatMoney(closedResult.countedCash)} ·{" "}
            <Difference value={Number(closedResult.countedCash) - Number(closedResult.expectedCash)} />
          </p>
        </section>
      )}

      {!session ? (
        <form className="product-form cash-open-form" onSubmit={handleOpen}>
          <h3>Caixa fechado</h3>
          <p className="field-hint">Abra o caixa no começo do turno informando o troco que está na gaveta.</p>
          <label htmlFor="opening-amount">Troco inicial (R$)</label>
          <input
            id="opening-amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            value={openingAmount}
            onChange={(e) => setOpeningAmount(e.target.value)}
            autoFocus
          />
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              Abrir caixa
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="cash-session-meta">
            <span className="status-pill status-pill-success">Aberto</span>
            por {session.openedBy?.name} em {formatDateTime(session.openedAt)}
          </p>

          <CashSummary summary={session.summary} />

          <div className="cash-columns">
            <section className="product-form">
              <h3>Suprimento e sangria</h3>
              <MovementList movements={session.movements} />
              <form onSubmit={handleMovement}>
                <div className="form-row">
                  <div>
                    <label htmlFor="movement-type">Tipo</label>
                    <div className="select-wrap">
                      <select
                        id="movement-type"
                        value={movement.type}
                        onChange={(e) => setMovement({ ...movement, type: e.target.value })}
                      >
                        <option value="WITHDRAWAL">Sangria (tirar dinheiro)</option>
                        <option value="SUPPLY">Suprimento (colocar dinheiro)</option>
                      </select>
                      <IconChevronDown />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="movement-amount">Valor (R$)</label>
                    <input
                      id="movement-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={movement.amount}
                      onChange={(e) => setMovement({ ...movement, amount: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <label htmlFor="movement-reason">Motivo</label>
                <input
                  id="movement-reason"
                  placeholder="Ex: levado ao cofre, troco extra, pagamento de fornecedor..."
                  value={movement.reason}
                  onChange={(e) => setMovement({ ...movement, reason: e.target.value })}
                  required
                />
                <div className="form-actions">
                  <button type="submit" disabled={busy}>
                    Registrar
                  </button>
                </div>
              </form>
            </section>

            <form className="product-form" onSubmit={handleClose}>
              <h3>Fechar caixa</h3>
              <p className="field-hint">Conte o dinheiro da gaveta e informe o valor abaixo.</p>
              <label htmlFor="counted-cash">Dinheiro contado (R$)</label>
              <input
                id="counted-cash"
                type="number"
                step="0.01"
                min="0"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                required
              />
              {countedValue != null && (
                <p>
                  <Difference value={countedValue - session.summary.expectedCash} />
                </p>
              )}
              <label htmlFor="close-notes">Observações (opcional)</label>
              <input id="close-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <div className="form-actions">
                <button type="submit" disabled={busy}>
                  Fechar caixa
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {isAdmin && (
        <section className="mt-lg">
          <h2 className="section-title">Histórico de caixas</h2>
          <FilterBar
            summary={`${visibleHistory.length} caixa(s)`}
            canClear={JSON.stringify(historyFilters) !== JSON.stringify(EMPTY_HISTORY_FILTERS)}
            onClear={() => setHistoryFilters(EMPTY_HISTORY_FILTERS)}
          >
            <PeriodFilter
              value={historyFilters.period}
              onChange={(period) => setHistoryFilters({ ...historyFilters, period })}
              custom={historyFilters.custom}
              onCustomChange={(custom) => setHistoryFilters({ ...historyFilters, custom })}
            />
            <SelectFilter
              label="Operador (abriu ou fechou)"
              value={historyFilters.userId}
              onChange={(userId) => setHistoryFilters({ ...historyFilters, userId })}
              options={users.map((u) => ({ value: String(u.id), label: u.name }))}
            />
            <SelectFilter
              label="Situação"
              value={historyFilters.situation}
              onChange={(situation) => setHistoryFilters({ ...historyFilters, situation })}
              options={[
                { value: "open", label: "Aberto" },
                { value: "diff", label: "Fechado com diferença" },
                { value: "short", label: "Fechado com falta" },
                { value: "ok", label: "Fechado sem diferença" },
              ]}
            />
          </FilterBar>
          {visibleHistory.length === 0 && <p className="cart-empty">Nenhum caixa com esses filtros.</p>}
          <div className="table-scroll">
            <table className="product-table">
              <thead>
                <tr>
                  <th>Abertura</th>
                  <th>Fechamento</th>
                  <th>Esperado</th>
                  <th>Contado</th>
                  <th>Diferença</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleHistory.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {formatDateTime(item.openedAt)}
                      <div className="field-hint">{item.openedBy?.name}</div>
                    </td>
                    <td>
                      {item.closedAt ? (
                        formatDateTime(item.closedAt)
                      ) : (
                        <span className="status-pill status-pill-success">Aberto</span>
                      )}
                      {item.closedBy && <div className="field-hint">{item.closedBy.name}</div>}
                    </td>
                    <td>{item.expectedCash != null ? formatMoney(item.expectedCash) : "—"}</td>
                    <td>{item.countedCash != null ? formatMoney(item.countedCash) : "—"}</td>
                    <td>
                      {item.closedAt ? (
                        <Difference value={Number(item.countedCash) - Number(item.expectedCash)} />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="table-actions">
                      <button type="button" onClick={() => openHistory(item.id)}>
                        Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selected && (
        <div className="checkout-modal-overlay" onClick={() => setSelected(null)}>
          <div className="checkout-modal checkout-modal-wide" onClick={(e) => e.stopPropagation()}>
            <h2>
              Caixa de {formatDateTime(selected.openedAt)}
              {selected.closedAt && ` até ${formatTime(selected.closedAt)}`}
            </h2>
            <CashSummary summary={selected.summary} />
            <h3>Suprimentos e sangrias</h3>
            <MovementList movements={selected.movements} />
            {selected.notes && <p className="field-hint">Observações: {selected.notes}</p>}
            <div className="checkout-modal-actions">
              <button type="button" className="secondary" onClick={() => setSelected(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
