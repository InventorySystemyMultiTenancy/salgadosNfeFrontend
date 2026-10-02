import api from "./api";

// scope: "open" (padrão — a produzir/entregar) ou "recent" (últimos 30 dias + futuras, todos os status)
export async function listPreorders(scope = "open") {
  const { data } = await api.get("/preorders", { params: { scope } });
  return data;
}

export async function fetchProductionQueue() {
  const { data } = await api.get("/preorders/production");
  return data;
}

export async function createPreorder(preorder) {
  const { data } = await api.post("/preorders", preorder);
  return data;
}

export async function updatePreorder(id, preorder) {
  const { data } = await api.put(`/preorders/${id}`, preorder);
  return data;
}

export async function setPreorderStatus(id, status) {
  const { data } = await api.put(`/preorders/${id}/status`, { status });
  return data;
}

export async function deliverPreorder(id, balanceMethod) {
  const { data } = await api.post(`/preorders/${id}/deliver`, { balanceMethod });
  return data;
}

export async function cancelPreorder(id) {
  const { data } = await api.post(`/preorders/${id}/cancel`);
  return data;
}
