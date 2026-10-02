import { Children, useState } from "react";
import { IconChevronDown, IconClose, IconSearch } from "./icons";
import { PERIOD_OPTIONS } from "../utils/filters";

// Barra de filtros padrão das listagens: controles numa linha e, embaixo, o resumo do resultado +
// "Limpar filtros". No celular só o primeiro filtro fica à mostra; o resto abre em "Mais filtros",
// senão a barra ocupa a tela inteira antes da lista.
export function FilterBar({ children, summary, onClear, canClear }) {
  const [expanded, setExpanded] = useState(false);
  const collapsible = Children.toArray(children).filter(Boolean).length > 1;

  return (
    <section className={`filter-bar${expanded ? " is-expanded" : ""}`} aria-label="Filtros">
      <div className="filter-bar-fields">{children}</div>
      {collapsible && (
        <button
          type="button"
          className="filter-bar-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Menos filtros" : `Mais filtros${canClear ? " (ativos)" : ""}`}
          <IconChevronDown size={14} />
        </button>
      )}
      {(summary || canClear) && (
        <div className="filter-bar-footer">
          <span>{summary}</span>
          {canClear && (
            <button type="button" className="link-button" onClick={onClear}>
              <IconClose size={13} /> Limpar filtros
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export function SearchFilter({ value, onChange, placeholder = "Buscar...", label = "Buscar", wide = true }) {
  return (
    <label className={`filter-field${wide ? " filter-field-wide" : ""}`}>
      <span>{label}</span>
      <span className="filter-search">
        <IconSearch size={15} />
        <input type="search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      </span>
    </label>
  );
}

// options: [{ value, label }]. A primeira opção ("Todos") tem valor "".
export function SelectFilter({ label, value, onChange, options, allLabel = "Todos" }) {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <span className="select-wrap">
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">{allLabel}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <IconChevronDown />
      </span>
    </label>
  );
}

// Período com atalhos + "Escolher datas" (abre os dois campos de data).
export function PeriodFilter({ value, onChange, custom, onCustomChange, options = PERIOD_OPTIONS, label = "Período" }) {
  return (
    <div className="filter-field filter-field-period">
      <span>{label}</span>
      <div className="filter-period">
        <div className="segmented segmented-compact" role="tablist">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={value === option.value}
              className={value === option.value ? "active" : ""}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {value === "custom" && (
          <div className="filter-dates">
            <input
              type="date"
              aria-label="Data inicial"
              value={custom.from}
              max={custom.to || undefined}
              onChange={(e) => onCustomChange({ ...custom, from: e.target.value })}
            />
            <span>até</span>
            <input
              type="date"
              aria-label="Data final"
              value={custom.to}
              min={custom.from || undefined}
              onChange={(e) => onCustomChange({ ...custom, to: e.target.value })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Páginas">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1}>
        ← Anterior
      </button>
      <span>
        Página {page} de {totalPages}
      </span>
      <button type="button" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
        Próxima →
      </button>
    </nav>
  );
}
