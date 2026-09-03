import qz from "qz-tray";
import { buildReceiptLines } from "./receiptLines";

const ESC = "\x1B";
const GS = "\x1D";
const INIT = `${ESC}@`; // reseta a impressora pro estado padrão
const CUT = `${GS}V${String.fromCharCode(66)}${String.fromCharCode(0)}`; // GS V 66 0 — alimenta e corte parcial, suportado pela maioria dos clones ESC/POS

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

// Manda o cupom como texto ESC/POS cru direto pro dispositivo via QZ Tray — sem passar pelo
// pipeline gráfico (GDI/rasterização) do Windows, que é onde a impressão pelo navegador
// (receiptPrint.js) vinha falhando (saía em branco / cortada / minúscula num canto).
export async function printReceiptEscPos(order, { companyName, cnpj, printerName } = {}) {
  await ensureConnected();

  const body = stripDiacritics(buildReceiptLines(order, { companyName, cnpj }).join("\n"));
  const data = `${INIT}${body}\n\n\n${CUT}`;

  const config = qz.configs.create(printerName || getConfiguredPrinterName());
  await qz.print(config, [{ type: "raw", format: "plain", data }]);
}
