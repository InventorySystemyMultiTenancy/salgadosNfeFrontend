import api from "./api";

export async function fetchFiscalSettings() {
  const { data } = await api.get("/fiscal/settings");
  return data;
}

export async function fetchPublicFiscalSettings() {
  const { data } = await api.get("/fiscal/settings/public");
  return data;
}

export async function updateFiscalSettings(settings) {
  const { data } = await api.put("/fiscal/settings", settings);
  return data;
}

export async function emitFiscal(orderId) {
  const { data } = await api.post(`/orders/${orderId}/emit-fiscal`);
  return data;
}

export async function emitFiscalNFe(orderId) {
  const { data } = await api.post(`/orders/${orderId}/emit-fiscal-nfe`);
  return data;
}
