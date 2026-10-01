import api from "./api";

export async function fetchPaymentSettings() {
  const { data } = await api.get("/payments/settings");
  return data;
}

export async function fetchPublicPaymentSettings() {
  const { data } = await api.get("/payments/settings/public");
  return data;
}

export async function updatePaymentSettings(settings) {
  const { data } = await api.put("/payments/settings", settings);
  return data;
}

export async function fetchTerminals() {
  const { data } = await api.get("/payments/terminals");
  return data;
}

export async function setupTerminal(terminalId) {
  const { data } = await api.post(`/payments/terminals/${encodeURIComponent(terminalId)}/setup`);
  return data;
}

export async function pairTerminal(pairingCode, name) {
  const { data } = await api.post("/payments/terminals/pair", { pairingCode, name });
  return data;
}

export async function createCharge(amount, paymentMethod) {
  const { data } = await api.post("/payments/charges", { amount, paymentMethod });
  return data;
}

export async function fetchCharge(id) {
  const { data } = await api.get(`/payments/charges/${id}`);
  return data;
}

export async function cancelCharge(id) {
  const { data } = await api.post(`/payments/charges/${id}/cancel`);
  return data;
}
