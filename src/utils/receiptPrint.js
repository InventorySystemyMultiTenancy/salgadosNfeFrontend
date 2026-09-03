const PAYMENT_LABEL = {
  CASH: "Dinheiro",
  DEBIT: "Cartão de Débito",
  CREDIT: "Cartão de Crédito",
  PIX: "Pix",
  TAB: "Fiado (Caderneta)",
};

// Largura em caracteres pra montar as linhas do cupom (impressoras térmicas de 80mm baratas
// costumam ter driver GDI limitado/inconsistente com flexbox, bordas, etc. — texto puro em fonte
// monoespaçada dentro de um único <pre> é o formato mais compatível, testado contra saída em
// branco na GLPrinter80).
const LINE_WIDTH = 40;

function money(value) {
  return `R$ ${Number(value).toFixed(2)}`;
}

function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );
}

function formatDateTime(value) {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleString("pt-BR");
}

function padLine(left, right) {
  left = String(left);
  right = String(right);
  const gap = Math.max(1, LINE_WIDTH - left.length - right.length);
  return left + " ".repeat(gap) + right;
}

function centerLine(text) {
  text = String(text);
  if (text.length >= LINE_WIDTH) return text;
  return " ".repeat(Math.floor((LINE_WIDTH - text.length) / 2)) + text;
}

const SEPARATOR = "-".repeat(LINE_WIDTH);

// Comprovante interno gerado no navegador (não é o DANFE/CFe autorizado pela SEFAZ) — pensado pra
// impressora térmica de 80mm, formato definido a pedido do usuário.
export function printReceipt(order, { companyName, cnpj } = {}) {
  const lines = [];

  lines.push(centerLine(companyName || "Salgaderia"));
  if (cnpj) lines.push(centerLine(`CNPJ ${cnpj}`));
  lines.push(SEPARATOR);
  lines.push(`Pedido #${order.id}`);
  lines.push(formatDateTime(order.createdAt));
  if (order.seller?.name) lines.push(`Vendedor: ${order.seller.name}`);
  lines.push(order.client?.name ? `Cliente: ${order.client.name}` : "Cliente: Consumidor não identificado");
  lines.push(SEPARATOR);

  for (const item of order.items ?? []) {
    const name = item.product?.name ?? item.name ?? "Item";
    const quantity = item.quantity;
    const unitPrice = Number(item.unitPrice);
    const lineTotal = unitPrice * quantity;
    lines.push(name);
    lines.push(padLine(`${quantity} x ${money(unitPrice)}`, money(lineTotal)));
  }

  lines.push(SEPARATOR);
  lines.push(padLine("TOTAL", money(order.totalAmount)));
  lines.push(`Pagamento: ${PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod}`);
  lines.push(SEPARATOR);
  lines.push(centerLine("Comprovante não fiscal"));
  lines.push(centerLine("não substitui nota fiscal."));
  lines.push(centerLine("Obrigado pela preferência!"));

  const text = escapeHtml(lines.join("\n"));

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Cupom Pedido #${order.id}</title>
<style>
  @page { size: 80mm auto; margin: 3mm 2mm; }
  body { margin: 0; }
  pre {
    margin: 0;
    font-family: "Courier New", monospace;
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-word;
    color: #000;
  }
</style>
</head>
<body>
<pre>${text}</pre>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=400,height=640");
  if (!printWindow) return;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
  };
}
