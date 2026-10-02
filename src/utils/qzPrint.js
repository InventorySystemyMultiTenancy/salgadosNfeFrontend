import qz from "qz-tray";
import { buildReceipt, padLine, RECEIPT_LARGE_WIDTH, RECEIPT_LINE_WIDTH, RECEIPT_LOGO_URL } from "./receiptLines";

const ESC = 0x1b;
const GS = 0x1d;
const INIT = [ESC, 0x40]; // ESC @ — reseta a impressora pro estado padrão
const CUT = [GS, 0x56, 66, 0]; // GS V 66 0 — alimenta e corte parcial, suportado pela maioria dos clones ESC/POS
const LINE_SPACING = [ESC, 0x33, 38]; // ESC 3 n — entrelinha de 38 pontos (padrão ~30): texto mais arejado
const FEED_BEFORE_CUT = [ESC, 0x64, 5]; // ESC d 5 — sobra papel depois do texto, o corte não come a última linha
const align = (center) => [ESC, 0x61, center ? 1 : 0]; // ESC a n
const bold = (on) => [ESC, 0x45, on ? 1 : 0]; // ESC E n
const size = (large) => [GS, 0x21, large ? 0x11 : 0x00]; // GS ! n — 0x11 = largura e altura dupla

// Largura útil do cabeçote em pontos: 576 nas térmicas de 80mm comuns (72mm a 203dpi); alguns
// modelos imprimem só 512. Sobrescrevível por máquina via localStorage (`pos.thermalPrintWidth`).
const DEFAULT_PRINT_WIDTH_DOTS = 576;
const CHAR_WIDTH_DOTS = 12; // fonte A
const LOGO_BAND_ROWS = 128; // manda a logo em faixas — clones baratos têm buffer pequeno

// Nome do dispositivo tal como o QZ Tray/Windows enxerga a impressora térmica — sobrescrevível por
// máquina via localStorage (`pos.thermalPrinterName`), caso o PDV rode em mais de um terminal com
// impressoras diferentes.
const DEFAULT_PRINTER_NAME = "GLPrinter80";

export function getConfiguredPrinterName() {
  try {
    return window.localStorage.getItem("pos.thermalPrinterName") || DEFAULT_PRINTER_NAME;
  } catch {
    return DEFAULT_PRINTER_NAME;
  }
}

export function setConfiguredPrinterName(name) {
  try {
    window.localStorage.setItem("pos.thermalPrinterName", name);
  } catch {
    /* localStorage indisponível (modo privado etc.) — só afeta a conveniência de lembrar o nome */
  }
}

function getPrintWidthDots() {
  try {
    return Number(window.localStorage.getItem("pos.thermalPrintWidth")) || DEFAULT_PRINT_WIDTH_DOTS;
  } catch {
    return DEFAULT_PRINT_WIDTH_DOTS;
  }
}

let connecting = null;

// QZ Tray precisa estar instalado e rodando na máquina (ícone na bandeja do Windows) — sem isso
// `qz.websocket.connect()` rejeita rápido (tenta as portas locais ws/wss e falha), então dá pra
// usar isso como teste de "está disponível" sem travar a tela.
function ensureConnected() {
  if (qz.websocket.isActive()) return Promise.resolve();
  if (!connecting) {
    connecting = qz.websocket.connect().catch((err) => {
      connecting = null;
      throw err;
    });
  }
  return connecting;
}

export async function isQzAvailable() {
  try {
    await ensureConnected();
    return true;
  } catch {
    return false;
  }
}

export async function listQzPrinters() {
  await ensureConnected();
  return qz.printers.find();
}

// A maioria dos clones ESC/POS baratos assume uma code page de 1 byte (CP437/CP850/CP860) em vez
// de UTF-8 — mandar "ã"/"ç" como UTF-8 cru sai como caractere errado no papel, já que não dá pra
// confirmar de antemão qual code page essa impressora específica está configurada. Tirar os
// acentos garante legibilidade em qualquer configuração; o fallback via navegador
// (receiptPrint.js) não precisa disso, pois quem rasteriza o texto lá é o próprio Chrome.
const DIACRITIC_MARKS = /[̀-ͯ]/g;

function stripDiacritics(text) {
  return text.normalize("NFD").replace(DIACRITIC_MARKS, "");
}

// Texto em bytes de 1 byte: sem acento e qualquer outro caractere fora do ASCII vira "?" em vez
// de lixo.
function textBytes(text) {
  return Array.from(stripDiacritics(String(text)), (char) => (char.charCodeAt(0) < 128 ? char.charCodeAt(0) : 0x3f));
}

let logoRasterPromise = null;

// Lê a logo de impressão (já 1 bit) num canvas e converte pro bitmap ESC/POS: 1 bit por ponto,
// 8 pontos por byte, bit mais significativo à esquerda. Fica em cache — a logo não muda.
function loadLogoRaster() {
  logoRasterPromise ??= new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0);
      const pixels = ctx.getImageData(0, 0, width, height).data;

      const bytesPerRow = Math.ceil(width / 8);
      const bits = new Uint8Array(bytesPerRow * height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const luminance = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
          if (luminance < 128) bits[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
        }
      }
      resolve({ bytesPerRow, height, bits });
    };
    img.onerror = () => reject(new Error("Logo de impressão não encontrada."));
    img.src = RECEIPT_LOGO_URL;
  }).catch((err) => {
    logoRasterPromise = null; // tenta de novo na próxima impressão
    throw err;
  });
  return logoRasterPromise;
}

// GS v 0 (imagem raster) em faixas de LOGO_BAND_ROWS linhas.
function logoBytes({ bytesPerRow, height, bits }) {
  const out = [];
  for (let start = 0; start < height; start += LOGO_BAND_ROWS) {
    const rows = Math.min(LOGO_BAND_ROWS, height - start);
    out.push(GS, 0x76, 0x30, 0, bytesPerRow & 0xff, bytesPerRow >> 8, rows & 0xff, rows >> 8);
    for (const byte of bits.subarray(start * bytesPerRow, (start + rows) * bytesPerRow)) out.push(byte);
  }
  return out;
}

function toBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.slice(i, i + 0x8000));
  }
  return btoa(binary);
}

// Traduz o cupom (receiptLines.js) em comandos ESC/POS.
function receiptBytes(rows, logo, printWidthDots) {
  // Centraliza as 40 colunas no papel com margem esquerda (GS L): sobra o mesmo espaço dos dois lados.
  const leftMargin = Math.max(0, Math.floor((printWidthDots - RECEIPT_LINE_WIDTH * CHAR_WIDTH_DOTS) / 2));
  const out = [...INIT, ...LINE_SPACING, GS, 0x4c, leftMargin & 0xff, leftMargin >> 8];
  const line = (text, { center = false, isBold = false, large = false } = {}) => {
    out.push(...align(center), ...bold(isBold), ...size(large), ...textBytes(text), 0x0a);
  };

  out.push(0x0a); // respiro antes da logo

  for (const row of rows) {
    if (row.type === "logo") {
      if (logo) out.push(...align(true), ...logoBytes(logo), ...align(false));
    } else if (row.type === "space") {
      out.push(...size(false), 0x0a);
    } else if (row.type === "rule") {
      line((row.char ?? "-").repeat(RECEIPT_LINE_WIDTH));
    } else if (row.type === "pair") {
      const large = row.size === "large";
      line(padLine(row.left, row.right, large ? RECEIPT_LARGE_WIDTH : RECEIPT_LINE_WIDTH), { isBold: row.bold, large });
    } else {
      line(row.text, { center: row.align === "center", isBold: row.bold, large: row.size === "large" });
    }
  }

  out.push(...align(false), ...bold(false), ...size(false), ...FEED_BEFORE_CUT, ...CUT);
  return out;
}

// Bytes ESC/POS do cupom inteiro (logo + texto + corte). Separado da impressão pra dar pra gerar
// e conferir sem impressora.
export async function buildReceiptEscPos(order, { companyName, cnpj, printWidthDots = getPrintWidthDots() } = {}) {
  // Sem a logo o cupom ainda sai — não trava a venda por causa de imagem.
  const logo = await loadLogoRaster().catch(() => null);
  return receiptBytes(buildReceipt(order, { companyName, cnpj }), logo, printWidthDots);
}

// Manda o cupom como ESC/POS cru direto pro dispositivo via QZ Tray — sem passar pelo pipeline
// gráfico (GDI/rasterização) do Windows, que é onde a impressão pelo navegador (receiptPrint.js)
// vinha falhando (saía em branco / cortada / minúscula num canto).
export async function printReceiptEscPos(order, { companyName, cnpj, printerName } = {}) {
  await ensureConnected();
  const bytes = await buildReceiptEscPos(order, { companyName, cnpj });

  const config = qz.configs.create(printerName || getConfiguredPrinterName());
  await qz.print(config, [{ type: "raw", format: "command", flavor: "base64", data: toBase64(bytes) }]);
}
