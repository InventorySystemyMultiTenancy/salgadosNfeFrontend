const PAYMENT_LABEL = {
  CASH: "Dinheiro",
  DEBIT: "Cartão de Débito",
  CREDIT: "Cartão de Crédito",
  PIX: "Pix",
  TAB: "Fiado (Caderneta)",
};

// Largura em caracteres das linhas do cupom — 40 colunas é o padrão de fonte normal numa
// impressora térmica de 80mm. Usado tanto no fallback via window.print() (receiptPrint.js) quanto
// no envio ESC/POS cru via QZ Tray (qzPrint.js), pra manter os dois formatados igual.
export const RECEIPT_LINE_WIDTH = 40;

export function money(value) {
  return `R$ ${Number(value).toFixed(2)}`;
}

function padLine(left, right) {
  left = String(left);
  right = String(right);
  const gap = Math.max(1, RECEIPT_LINE_WIDTH - left.length - right.length);
  return left + " ".repeat(gap) + right;
}

function centerLine(text) {
  text = String(text);
  if (text.length >= RECEIPT_LINE_WIDTH) return text;
  return " ".repeat(Math.floor((RECEIPT_LINE_WIDTH - text.length) / 2)) + text;
}

function formatDateTime(value) {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleString("pt-BR");
}

// Monta as linhas de texto do cupom não fiscal (comprovante interno, não é o DANFE/CFe autorizado
// pela SEFAZ) — puramente texto, sem HTML, pra poder ser reaproveitado tanto num <pre> quanto
// mandado cru (ESC/POS) pra impressora térmica.
export function buildReceiptLines(order, { companyName, cnpj } = {}) {
  const separator = "-".repeat(RECEIPT_LINE_WIDTH);
  const lines = [];

  lines.push(centerLine(companyName || "Salgaderia"));
  if (cnpj) lines.push(centerLine(`CNPJ ${cnpj}`));
  lines.push(separator);
  lines.push(`Pedido #${order.id}`);
  lines.push(formatDateTime(order.createdAt));
  if (order.seller?.name) lines.push(`Vendedor: ${order.seller.name}`);
  lines.push(order.client?.name ? `Cliente: ${order.client.name}` : "Cliente: Consumidor não identificado");
  lines.push(separator);

  for (const item of order.items ?? []) {
    const name = item.product?.name ?? item.name ?? "Item";
    const quantity = item.quantity;
    const unitPrice = Number(item.unitPrice);
    const lineTotal = unitPrice * quantity;
    lines.push(name);
    lines.push(padLine(`${quantity} x ${money(unitPrice)}`, money(lineTotal)));
  }

  lines.push(separator);
  lines.push(padLine("TOTAL", money(order.totalAmount)));
  lines.push(`Pagamento: ${PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod}`);
  lines.push(separator);
  lines.push(centerLine("Comprovante não fiscal"));
  lines.push(centerLine("não substitui nota fiscal."));
  lines.push(centerLine("Obrigado pela preferência!"));

  return lines;
}
