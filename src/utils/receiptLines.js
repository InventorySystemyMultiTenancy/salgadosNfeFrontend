const PAYMENT_LABEL = {
  CASH: "Dinheiro",
  DEBIT: "Cartão de Débito",
  CREDIT: "Cartão de Crédito",
  PIX: "Pix",
  TAB: "Fiado (Caderneta)",
};

// Largura em caracteres das linhas do cupom na fonte normal — 40 colunas cabe com folga numa
// térmica de 80mm mesmo com a margem esquerda (ver qzPrint.js). Na fonte grande (largura dupla)
// cabe a metade. Usado pelos dois caminhos de impressão (QZ Tray e navegador) pra saírem iguais.
export const RECEIPT_LINE_WIDTH = 40;
export const RECEIPT_LARGE_WIDTH = RECEIPT_LINE_WIDTH / 2;

// Logo em 1 bit (preto/branco com pontilhado) gerada por scripts/make_print_logo.py a partir da
// logo colorida — a térmica não imprime cinza, e o fundo de foto da logo original viraria borrão.
export const RECEIPT_LOGO_URL = "/logo-print.png";

export function money(value) {
  return `R$ ${Number(value).toFixed(2).replace(".", ",")}`;
}

export function padLine(left, right, width = RECEIPT_LINE_WIDTH) {
  left = String(left);
  right = String(right);
  const gap = Math.max(1, width - left.length - right.length);
  return left + " ".repeat(gap) + right;
}

function formatDateTime(value) {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

// Monta o cupom não fiscal (comprovante interno, não é o DANFE/CFe autorizado pela SEFAZ) como uma
// lista de linhas com estilo — cada impressora (ESC/POS ou HTML) traduz pro seu formato:
//   { type: "logo" }
//   { type: "text", text, align?: "left"|"center", bold?, size?: "normal"|"large" }
//   { type: "pair", left, right, bold?, size? }   ← texto à esquerda e valor encostado à direita
//   { type: "rule", char? }                       ← linha separadora
//   { type: "space" }                             ← linha em branco (respiro)
export function buildReceipt(order, { companyName, cnpj } = {}) {
  const rows = [];
  const items = order.items ?? [];
  const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  rows.push({ type: "logo" });
  rows.push({ type: "space" });
  if (companyName) rows.push({ type: "text", text: companyName, align: "center", bold: true });
  if (cnpj) rows.push({ type: "text", text: `CNPJ ${cnpj}`, align: "center" });
  rows.push({ type: "space" });

  rows.push({ type: "rule", char: "=" });
  rows.push({ type: "text", text: `PEDIDO #${order.id}`, align: "center", bold: true, size: "large" });
  rows.push({ type: "text", text: formatDateTime(order.createdAt), align: "center" });
  rows.push({ type: "rule", char: "=" });
  rows.push({ type: "space" });

  if (order.seller?.name) rows.push({ type: "pair", left: "Atendente", right: order.seller.name });
  rows.push({ type: "pair", left: "Cliente", right: order.client?.name ?? "Consumidor" });
  rows.push({ type: "space" });

  rows.push({ type: "pair", left: "ITEM", right: "TOTAL", bold: true });
  rows.push({ type: "rule" });
  for (const item of items) {
    const name = item.product?.name ?? item.name ?? "Item";
    const unitPrice = Number(item.unitPrice);
    rows.push({ type: "text", text: name, bold: true });
    rows.push({
      type: "pair",
      left: `  ${item.quantity} x ${money(unitPrice)}`,
      right: money(unitPrice * item.quantity),
    });
  }
  rows.push({ type: "rule" });
  rows.push({ type: "pair", left: `${itemsCount} ${itemsCount === 1 ? "item" : "itens"}`, right: "" });
  rows.push({ type: "space" });

  rows.push({ type: "pair", left: "TOTAL", right: money(order.totalAmount), bold: true, size: "large" });
  rows.push({ type: "space" });
  rows.push({ type: "pair", left: "Pagamento", right: PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod });
  rows.push({ type: "space" });

  rows.push({ type: "rule", char: "=" });
  rows.push({ type: "space" });
  rows.push({ type: "text", text: "Obrigado pela preferência!", align: "center", bold: true });
  rows.push({ type: "text", text: "Volte sempre :)", align: "center" });
  rows.push({ type: "space" });
  rows.push({ type: "text", text: "Comprovante não fiscal -", align: "center" });
  rows.push({ type: "text", text: "não substitui a nota fiscal.", align: "center" });

  return rows;
}
