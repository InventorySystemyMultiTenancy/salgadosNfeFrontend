import api from "./api";

export async function createOrder({ paymentMethod, clientId, items }) {
  const { data } = await api.post("/orders", { paymentMethod, clientId, items });
  return data;
}

export async function fetchKitchenQueue() {
  const { data } = await api.get("/orders/kitchen-queue");
  return data;
}

export async function updateKitchenStatus(id, status) {
  const { data } = await api.put(`/orders/${id}/kitchen-status`, { status });
  return data;
}

export async function fetchStockAudit() {
  const { data } = await api.get("/orders/audit/stock");
  return data;
}

export async function fetchOrders({ clientId } = {}) {
  const { data } = await api.get("/orders", { params: clientId ? { clientId } : undefined });
  return data;
}
