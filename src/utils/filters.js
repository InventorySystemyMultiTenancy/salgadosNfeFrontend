const DAY_MS = 24 * 60 * 60 * 1000;

// Busca sem diferenciar maiúscula nem acento: "joao" acha "João".
export function normalize(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// true se o termo aparece em algum dos campos. Termo vazio = tudo passa.
export function matchesSearch(term, ...fields) {
  const needle = normalize(term);
  if (!needle) return true;
  return fields.some((field) => normalize(field).includes(needle));
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export const PERIOD_OPTIONS = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "month", label: "Este mês" },
  { value: "all", label: "Tudo" },
  { value: "custom", label: "Escolher datas" },
];

// Converte o período escolhido em { from, to } (Date, no fuso do navegador) ou null pra "Tudo".
// "custom" usa as datas digitadas (yyyy-mm-dd), com o dia final inteiro incluído.
export function periodRange(period, custom = {}) {
  const today = startOfDay(new Date());
  const tomorrow = new Date(today.getTime() + DAY_MS);
  switch (period) {
    case "today":
      return { from: today, to: tomorrow };
    case "7d":
      return { from: new Date(today.getTime() - 6 * DAY_MS), to: tomorrow };
    case "30d":
      return { from: new Date(today.getTime() - 29 * DAY_MS), to: tomorrow };
    case "month":
      return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: tomorrow };
    case "custom": {
      const from = custom.from ? new Date(`${custom.from}T00:00:00`) : null;
      const to = custom.to ? new Date(new Date(`${custom.to}T00:00:00`).getTime() + DAY_MS) : null;
      if (!from && !to) return null;
      return { from, to };
    }
    default:
      return null;
  }
}

// Parâmetros de período pra mandar pro backend (ISO), sem os lados vazios.
export function periodParams(period, custom) {
  const range = periodRange(period, custom);
  if (!range) return {};
  return {
    ...(range.from ? { from: range.from.toISOString() } : {}),
    ...(range.to ? { to: range.to.toISOString() } : {}),
  };
}

// Pra filtrar no navegador listas que já vieram inteiras.
export function inPeriod(value, period, custom) {
  const range = periodRange(period, custom);
  if (!range) return true;
  const date = new Date(value);
  return (!range.from || date >= range.from) && (!range.to || date < range.to);
}
