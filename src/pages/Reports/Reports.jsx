import { useEffect, useState } from "react";
import * as reportService from "../../services/report.service";
import { PAYMENT_LABEL, formatMoney } from "../../utils/format";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

// Períodos no fuso do navegador (o da loja); o backend recebe o offset pra agrupar igual.
const PRESETS = [
  { id: "today", label: "Hoje", range: () => [startOfDay(new Date()), new Date(startOfDay(new Date()).getTime() + DAY_MS)] },
  {
    id: "yesterday",
    label: "Ontem",
    range: () => [new Date(startOfDay(new Date()).getTime() - DAY_MS), startOfDay(new Date())],
  },
  {
    id: "7d",
    label: "7 dias",
    range: () => [new Date(startOfDay(new Date()).getTime() - 6 * DAY_MS), new Date(startOfDay(new Date()).getTime() + DAY_MS)],
  },
  {
    id: "30d",
    label: "30 dias",
    range: () => [new Date(startOfDay(new Date()).getTime() - 29 * DAY_MS), new Date(startOfDay(new Date()).getTime() + DAY_MS)],
  },
  {
    id: "month",
    label: "Este mês",
    range: () => {
      const start = startOfDay(new Date());
      start.setDate(1);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      return [start, end];
    },
  },
];

function shortDate(isoDay) {
  const [, month, day] = isoDay.split("-");
  return `${day}/${month}`;
}

// Gráfico de colunas de série única: uma cor só (a da marca), tooltip no hover, rótulos do eixo X
// espaçados pra não colidirem.
function ColumnChart({ data, labelEvery = 1, ariaLabel }) {
  const max = Math.max(...data.map((d) => d.value), 0);
  return (
    <div className="column-chart" role="img" aria-label={ariaLabel}>
      <div className="column-chart-max">{max > 0 ? formatMoney(max) : ""}</div>
      <div className="column-chart-plot">
        {data.map((d, index) => (
          <div key={d.key} className="column-chart-slot" tabIndex={0}>
            <div
              className={`column-chart-bar${d.value === 0 ? " is-empty" : ""}`}
              style={{ height: max > 0 ? `${Math.max((d.value / max) * 100, d.value > 0 ? 2 : 0)}%` : 0 }}
            />
            <div className="chart-tooltip">
              <strong>{d.tooltipTitle}</strong>
              <span>{formatMoney(d.value)}</span>
              <span>{d.count} pedidos</span>
            </div>
            <span className="column-chart-label">{index % labelEvery === 0 ? d.label : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Barras horizontais com rótulo direto (nome à esquerda, valor à direita) — lê sem depender de cor.
function BarList({ rows, formatValue, emptyText }) {
  if (!rows.length) return <p className="cart-empty">{emptyText}</p>;
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <ul className="bar-list">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="bar-list-head">
            <span>{row.label}</span>
            <strong>{formatValue(row.value)}</strong>
          </div>
          <div className="bar-list-track">
            <div className="bar-list-fill" style={{ width: `${max > 0 ? (row.value / max) * 100 : 0}%` }} />
          </div>
          {row.detail && <small>{row.detail}</small>}
        </li>
      ))}
    </ul>
  );
}

export default function Reports() {
  const [presetId, setPresetId] = useState("today");
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const preset = PRESETS.find((p) => p.id === presetId);
    const [from, to] = preset.range();
    setLoading(true);
    setError("");
    reportService
      .fetchSalesReport({ from, to })
      .then(setReport)
      .catch((err) => setError(err.response?.data?.error || "Erro ao carregar o relatório."))
      .finally(() => setLoading(false));
  }, [presetId]);

  const multiDay = report && report.byDay.length > 1;
  // Mostra o expediente típico (6h–22h), alargando se houve venda fora dele.
  const hoursWithSales = report?.byHour.filter((h) => h.count > 0).map((h) => h.hour) ?? [];
  const hourStart = Math.min(6, ...hoursWithSales);
  const hourEnd = Math.max(22, ...hoursWithSales);
  const peakHour = report?.byHour.reduce((best, h) => (h.total > best.total ? h : best), { hour: null, total: 0 });

  return (
    <div className="page reports-page">
      <h1>Painel de Vendas</h1>

      <div className="segmented" role="tablist">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            role="tab"
            aria-selected={presetId === preset.id}
            className={presetId === preset.id ? "active" : ""}
            onClick={() => setPresetId(preset.id)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {error && <p className="form-error">{error}</p>}
      {!report && !error && <p className="cart-empty">Carregando...</p>}

      {report && (
        <div className={loading ? "is-loading" : undefined}>
          <div className="stat-grid stat-grid-compact">
            <div className="stat-tile stat-tile-hero">
              <span>Faturamento</span>
              <strong>{formatMoney(report.revenue)}</strong>
              <small>{report.ordersCount} pedidos no balcão</small>
            </div>
            <div className="stat-tile">
              <span>Ticket médio</span>
              <strong>{formatMoney(report.averageTicket)}</strong>
              <small>por pedido</small>
            </div>
            <div className="stat-tile">
              <span>Itens vendidos</span>
              <strong>{report.itemsSold}</strong>
              <small>unidades</small>
            </div>
            <div className="stat-tile">
              <span>Horário de pico</span>
              <strong>{peakHour?.hour != null ? `${String(peakHour.hour).padStart(2, "0")}h` : "—"}</strong>
              <small>{peakHour?.hour != null ? formatMoney(peakHour.total) : "sem vendas"}</small>
            </div>
            <div className="stat-tile">
              <span>Encomendas</span>
              <strong>{formatMoney(report.preorders.deliveredTotal)}</strong>
              <small>
                {report.preorders.deliveredCount} entregues · {report.preorders.scheduledCount} agendadas
              </small>
            </div>
            <div className="stat-tile">
              <span>Cancelados</span>
              <strong>{report.canceledCount}</strong>
              <small>{formatMoney(report.canceledTotal)}</small>
            </div>
          </div>

          <div className="report-grid">
            {multiDay && (
              <section className="report-card report-card-wide">
                <h2>Faturamento por dia</h2>
                <ColumnChart
                  ariaLabel="Faturamento por dia"
                  labelEvery={Math.ceil(report.byDay.length / 10)}
                  data={report.byDay.map((d) => ({
                    key: d.date,
                    label: shortDate(d.date),
                    tooltipTitle: shortDate(d.date),
                    value: d.total,
                    count: d.count,
                  }))}
                />
              </section>
            )}

            <section className="report-card report-card-wide">
              <h2>Vendas por horário</h2>
              <p className="field-hint">Ajuda a decidir quanto deixar pronto antes de cada pico.</p>
              <ColumnChart
                ariaLabel="Faturamento por hora do dia"
                labelEvery={2}
                data={report.byHour.slice(hourStart, hourEnd + 1).map((h) => ({
                  key: h.hour,
                  label: `${h.hour}h`,
                  tooltipTitle: `${String(h.hour).padStart(2, "0")}:00 – ${String(h.hour).padStart(2, "0")}:59`,
                  value: h.total,
                  count: h.count,
                }))}
              />
            </section>

            <section className="report-card">
              <h2>Mais vendidos</h2>
              <BarList
                emptyText="Nenhum item vendido no período."
                formatValue={(v) => `${v} un.`}
                rows={report.topProducts.map((p) => ({
                  key: p.productId,
                  label: p.name,
                  value: p.quantity,
                  detail: formatMoney(p.total),
                }))}
              />
            </section>

            <section className="report-card">
              <h2>Formas de pagamento</h2>
              <BarList
                emptyText="Sem vendas no período."
                formatValue={formatMoney}
                rows={report.byMethod.map((m) => ({
                  key: m.method,
                  label: PAYMENT_LABEL[m.method],
                  value: m.total,
                  detail: `${m.count} pedidos · ${report.revenue > 0 ? Math.round((m.total / report.revenue) * 100) : 0}%`,
                }))}
              />
            </section>

            <section className="report-card">
              <h2>Por vendedor</h2>
              <BarList
                emptyText="Sem vendas no período."
                formatValue={formatMoney}
                rows={report.bySeller.map((s) => ({
                  key: s.sellerId,
                  label: s.name,
                  value: s.total,
                  detail: `${s.count} pedidos`,
                }))}
              />
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
