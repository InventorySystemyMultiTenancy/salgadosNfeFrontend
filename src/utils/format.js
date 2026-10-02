export const PAYMENT_LABEL = {
  CASH: "Dinheiro",
  DEBIT: "Débito",
  CREDIT: "Crédito",
  PIX: "Pix",
  TAB: "Fiado",
};

export const MONEY_METHODS = ["CASH", "PIX", "DEBIT", "CREDIT"];

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatMoney(value) {
  return brl.format(Number(value) || 0);
}

export function formatDateTime(value) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function formatTime(value) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
