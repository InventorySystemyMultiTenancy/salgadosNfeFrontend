const PAYMENT_LABEL = {
  CASH: "Dinheiro",
  DEBIT: "Cartão de Débito",
  CREDIT: "Cartão de Crédito",
  PIX: "Pix",
  TAB: "Fiado (Caderneta)",
};

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

// Comprovante interno gerado no navegador (não é o DANFE/CFe autorizado pela SEFAZ) — pensado pra
// impressora térmica de 80mm, formato definido a pedido do usuário.
export function printReceipt(order, { companyName, cnpj } = {}) {
  const itemsHtml = (order.items ?? [])
    .map((item) => {
      const name = escapeHtml(item.product?.name ?? item.name ?? "Item");
      const quantity = item.quantity;
      const unitPrice = Number(item.unitPrice);
      const lineTotal = unitPrice * quantity;
      return `
        <div class="receipt-item">
          <div class="receipt-item-name">${name}</div>
          <div class="receipt-item-line">
            <span>${quantity} x ${money(unitPrice)}</span>
            <span>${money(lineTotal)}</span>
          </div>
        </div>`;
    })
    .join("");

  const clientLine = order.client?.name
    ? `Cliente: ${escapeHtml(order.client.name)}`
    : "Cliente: Consumidor não identificado";

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Cupom Pedido #${order.id}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body {
    width: 80mm;
    margin: 0;
    padding: 4mm 3mm;
    font-family: "Courier New", Consolas, monospace;
    font-size: 12px;
    line-height: 1.45;
    color: #000;
  }
  .receipt-center { text-align: center; }
  .receipt-company { font-size: 14px; font-weight: bold; }
  .receipt-sep { border-top: 1px dashed #000; margin: 6px 0; }
  .receipt-item { margin-bottom: 3px; }
  .receipt-item-line, .receipt-total-line { display: flex; justify-content: space-between; }
  .receipt-total-line strong { font-size: 14px; }
  .receipt-footer { margin-top: 8px; font-size: 10.5px; text-align: center; }
</style>
</head>
<body>
  <div class="receipt-center">
    <div class="receipt-company">${escapeHtml(companyName || "Salgaderia")}</div>
    ${cnpj ? `<div>CNPJ ${escapeHtml(cnpj)}</div>` : ""}
  </div>
  <div class="receipt-sep"></div>
  <div>Pedido #${order.id}</div>
  <div>${formatDateTime(order.createdAt)}</div>
  ${order.seller?.name ? `<div>Vendedor: ${escapeHtml(order.seller.name)}</div>` : ""}
  <div>${clientLine}</div>
  <div class="receipt-sep"></div>
  ${itemsHtml}
  <div class="receipt-sep"></div>
  <div class="receipt-total-line"><strong>TOTAL</strong><strong>${money(order.totalAmount)}</strong></div>
  <div>Pagamento: ${PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod}</div>
  <div class="receipt-footer">
    Comprovante não fiscal — não substitui nota fiscal.<br />
    Obrigado pela preferência!
  </div>
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
