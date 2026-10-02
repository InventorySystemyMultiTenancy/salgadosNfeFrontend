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

// "Urgente": pedido do balcão esperando há mais disso, ou encomenda atrasada / vencendo em breve.
const URGENT_ORDER_MINUTES = 10;
const URGENT_PREORDER_HOURS = 2;
const MINUTE_MS = 60 * 1000;

// Filtros ficam salvos no aparelho — cada tablet da cozinha costuma cuidar de uma estação.
const FILTERS_STORAGE_KEY = "kitchen.filters";
const DEFAULT_FILTERS = { show: "all", stage: "all", hiddenCategories: [], urgentOnly: false, order: "oldest" };

function loadSavedFilters() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(FILTERS_STORAGE_KEY));
    return saved ? { ...DEFAULT_FILTERS, ...saved } : DEFAULT_FILTERS;
  } catch {
    return DEFAULT_FILTERS;
  }
}

function saveFilters(filters) {
  try {
    window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    /* sem localStorage (modo privado etc.): os filtros só não ficam lembrados */
  }
}

function countActive(filters) {
  return [
    filters.show !== "all",
    filters.stage !== "all",
    filters.hiddenCategories.length > 0,
    filters.urgentOnly,
    filters.order !== "oldest",
  ].filter(Boolean).length;
}

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

function waitingLabel(minutes) {
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  return `há ${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
}

// Grupo de botões grandes (fácil de tocar no tablet), um selecionado por vez.
function ChoiceGroup({ label, value, options, onChange }) {
  return (
    <div className="kitchen-filter-group">
      <span>{label}</span>
      <div className="kitchen-chips">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={value === option.value ? "active" : ""}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Kitchen() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [preorders, setPreorders] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(loadSavedFilters);
  // Relógio da tela: atualiza o "há X min" e quem virou urgente sem precisar recarregar.
  const [now, setNow] = useState(() => Date.now());
  const socket = useSocket();

  function loadPreorders() {
    preorderService
      .fetchProductionQueue()
      .then(setPreorders)
      .catch(() => {});
  }

  useEffect(() => {
    loadPreorders();
    const timer = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => clearInterval(timer);
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

  function updateFilters(changes) {
    const next = { ...filters, ...changes };
    setFilters(next);
    saveFilters(next);
  }

  function toggleCategory(category) {
    const hidden = filters.hiddenCategories.includes(category)
      ? filters.hiddenCategories.filter((c) => c !== category)
      : [...filters.hiddenCategories, category];
    updateFilters({ hiddenCategories: hidden });
  }

  const categories = useMemo(() => {
    const all = new Set();
    for (const order of orders) for (const item of order.items) all.add(item.product.category);
    for (const preorder of preorders) for (const item of preorder.items) all.add(item.product.category);
    for (const category of filters.hiddenCategories) all.add(category); // continua aparecendo pra poder religar
    return [...all].filter(Boolean).sort();
  }, [orders, preorders, filters.hiddenCategories]);

  const keepItem = (item) => !filters.hiddenCategories.includes(item.product.category);
  const sortByTime = (getTime) => (a, b) =>
    filters.order === "oldest" ? getTime(a) - getTime(b) : getTime(b) - getTime(a);

  // Cards sem nenhum item das categorias visíveis somem; os que sobram mostram só esses itens.
  const visibleOrders =
    filters.show === "preorders"
      ? []
      : orders
          .map((order) => ({
            ...order,
            items: order.items.filter(keepItem),
            waitingMinutes: Math.floor((now - new Date(order.createdAt).getTime()) / MINUTE_MS),
          }))
          .filter((order) => order.items.length > 0)
          .filter(
            (order) =>
              filters.stage === "all" ||
              (filters.stage === "pending" ? order.kitchenStatus === "PENDING" : order.kitchenStatus === "PREPARING"),
          )
          .filter((order) => !filters.urgentOnly || order.waitingMinutes >= URGENT_ORDER_MINUTES)
          .sort(sortByTime((order) => new Date(order.createdAt).getTime()));

  const visiblePreorders =
    filters.show === "orders"
      ? []
      : preorders
          .map((preorder) => ({ ...preorder, items: preorder.items.filter(keepItem) }))
          .filter((preorder) => preorder.items.length > 0)
          .filter(
            (preorder) =>
              filters.stage === "all" ||
              (filters.stage === "pending" ? preorder.status === "PENDING" : preorder.status === "IN_PRODUCTION"),
          )
          .filter(
            (preorder) =>
              !filters.urgentOnly ||
              new Date(preorder.deliveryAt).getTime() - now <= URGENT_PREORDER_HOURS * 60 * MINUTE_MS,
          )
          .sort(sortByTime((preorder) => new Date(preorder.deliveryAt).getTime()));

  const consolidatedCounts = new Map();
  for (const order of visibleOrders) {
    for (const item of order.items) {
      consolidatedCounts.set(item.product.name, (consolidatedCounts.get(item.product.name) || 0) + item.quantity);
    }
  }
  const consolidated = Array.from(consolidatedCounts.entries()).sort((a, b) => b[1] - a[1]);

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

  const activeCount = countActive(filters);
  const hiddenByFilters = orders.length + preorders.length - (visibleOrders.length + visiblePreorders.length);

  return (
    <div className="page kitchen-page">
      <div className="page-heading">
        <h1>Painel da Cozinha</h1>
        <button
          type="button"
          className={`kitchen-filter-toggle${filtersOpen ? " open" : ""}${activeCount ? " has-active" : ""}`}
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          Filtros
          {activeCount > 0 && <span className="kitchen-filter-count">{activeCount}</span>}
        </button>
      </div>

      {filtersOpen && (
        <section className="kitchen-filters" aria-label="Filtros da cozinha">
          <ChoiceGroup
            label="Mostrar"
            value={filters.show}
            onChange={(show) => updateFilters({ show })}
            options={[
              { value: "all", label: "Tudo" },
              { value: "orders", label: "Pedidos do balcão" },
              { value: "preorders", label: "Encomendas" },
            ]}
          />
          <ChoiceGroup
            label="Situação"
            value={filters.stage}
            onChange={(stage) => updateFilters({ stage })}
            options={[
              { value: "all", label: "Todas" },
              { value: "pending", label: "A fazer" },
              { value: "preparing", label: "Em preparo" },
            ]}
          />
          {categories.length > 0 && (
            <div className="kitchen-filter-group">
              <span>Categorias desta estação</span>
              <div className="kitchen-chips">
                {categories.map((category) => {
                  const shown = !filters.hiddenCategories.includes(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      className={shown ? "active" : "off"}
                      aria-pressed={shown}
                      onClick={() => toggleCategory(category)}
                    >
                      {shown ? "✓ " : ""}
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <ChoiceGroup
            label="Prioridade"
            value={filters.urgentOnly ? "urgent" : "all"}
            onChange={(value) => updateFilters({ urgentOnly: value === "urgent" })}
            options={[
              { value: "all", label: "Todos" },
              {
                value: "urgent",
                label: `Só urgentes (+${URGENT_ORDER_MINUTES} min / encomenda em ${URGENT_PREORDER_HOURS}h)`,
              },
            ]}
          />
          <ChoiceGroup
            label="Ordem"
            value={filters.order}
            onChange={(order) => updateFilters({ order })}
            options={[
              { value: "oldest", label: "Mais antigos primeiro" },
              { value: "newest", label: "Mais novos primeiro" },
            ]}
          />
          <div className="kitchen-filters-footer">
            <span>Os filtros ficam salvos neste aparelho.</span>
            {activeCount > 0 && (
              <button type="button" className="link-button" onClick={() => updateFilters(DEFAULT_FILTERS)}>
                Limpar filtros
              </button>
            )}
          </div>
        </section>
      )}

      {!filtersOpen && activeCount > 0 && hiddenByFilters > 0 && (
        <p className="kitchen-hidden-note">
          {hiddenByFilters} pedido(s)/encomenda(s) escondido(s) pelos filtros.{" "}
          <button type="button" className="link-button" onClick={() => updateFilters(DEFAULT_FILTERS)}>
            Mostrar tudo
          </button>
        </p>
      )}

      {visiblePreorders.length > 0 && (
        <section className="kitchen-preorders">
          <h2>Encomendas — próximas 48h</h2>
          <div className="kitchen-queue">
            {visiblePreorders.map((preorder) => (
              <div
                key={preorder.id}
                className={`kitchen-card kitchen-card-preorder${new Date(preorder.deliveryAt) < new Date(now) ? " kitchen-card-late" : ""}`}
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
        {!error && orders.length === 0 && filters.show !== "preorders" && (
          <p className="cart-empty">Nenhum pedido na fila.</p>
        )}
        {!error && orders.length > 0 && visibleOrders.length === 0 && filters.show !== "preorders" && (
          <p className="cart-empty">Nenhum pedido com esses filtros.</p>
        )}
        {visibleOrders.map((order) => (
          <div
            key={order.id}
            className={`kitchen-card kitchen-card-${order.kitchenStatus.toLowerCase()}${order.waitingMinutes >= URGENT_ORDER_MINUTES ? " kitchen-card-late" : ""}`}
          >
            <header>
              <span>Pedido #{order.id}</span>
              <span className="kitchen-status-badge">{STATUS_LABEL[order.kitchenStatus]}</span>
            </header>
            <div className={`kitchen-waiting${order.waitingMinutes >= URGENT_ORDER_MINUTES ? " is-late" : ""}`}>
              {waitingLabel(order.waitingMinutes)}
            </div>
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
