import { buildReceipt, RECEIPT_LOGO_URL } from "./receiptLines";

function escapeHtml(text) {
  return String(text ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );
}

function rowHtml(row, logoUrl) {
  const classes = [row.bold && "b", row.size === "large" && "lg", row.align === "center" && "c"]
    .filter(Boolean)
    .join(" ");
  switch (row.type) {
    case "logo":
      return `<img class="logo" src="${logoUrl}" alt="" />`;
    case "space":
      return `<div class="space"></div>`;
    case "rule":
      return `<div class="rule${row.char === "=" ? " strong" : ""}"></div>`;
    case "pair":
      return `<div class="pair ${classes}"><span>${escapeHtml(row.left)}</span><span>${escapeHtml(row.right)}</span></div>`;
    default:
      return `<div class="${classes}">${escapeHtml(row.text)}</div>`;
  }
}

// Fallback via window.print() quando o QZ Tray (qzPrint.js) não está disponível — depende do
// driver da impressora tratar corretamente o job gráfico que o Chrome manda, o que nem toda
// impressora térmica barata faz direito (ver qzPrint.js pro caminho mais confiável).
export function printReceipt(order, { companyName, cnpj } = {}) {
  // URL absoluta: a janela de impressão é about:blank, caminho relativo não resolveria.
  const logoUrl = new URL(RECEIPT_LOGO_URL, window.location.origin).href;
  const body = buildReceipt(order, { companyName, cnpj })
    .map((row) => rowHtml(row, logoUrl))
    .join("\n");

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Cupom Pedido #${order.id}</title>
<style>
  @page { size: 80mm 210mm; margin: 4mm 0; }
  body { margin: 0; }
  .receipt {
    width: 72mm;
    box-sizing: border-box;
    padding: 4mm 5mm 10mm;
    font-family: "Courier New", monospace;
    font-size: 12px;
    line-height: 1.45;
    color: #000;
    word-break: break-word;
  }
  .logo { display: block; width: 44mm; margin: 0 auto; image-rendering: pixelated; }
  .space { height: 0.8em; }
  .rule { border-top: 1px dashed #000; margin: 0.35em 0; }
  .rule.strong { border-top: 2px solid #000; }
  .pair { display: flex; justify-content: space-between; gap: 1em; }
  .pair span:last-child { text-align: right; white-space: nowrap; }
  .b { font-weight: bold; }
  .lg { font-size: 18px; line-height: 1.3; }
  .c { text-align: center; }
</style>
</head>
<body>
<div class="receipt">
${body}
</div>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=400,height=720");
  if (!printWindow) return;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  // Espera a logo carregar antes de abrir a caixa de impressão, senão ela sai em branco.
  printWindow.onload = () => {
    printWindow.print();
  };
}
