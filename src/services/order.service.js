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

export async function fetchStockAudit(params = {}) {
  const { data } = await api.get("/orders/audit/stock", { params });
  return data;
}

export async function cancelOrder(id, reason) {
  const { data } = await api.post(`/orders/${id}/cancel`, { reason });
  return data;
}

// Filtros e paginação no servidor. Devolve { orders, total, totalAmount, page, pageSize }.
export async function fetchOrders(params = {}) {
  const { data } = await api.get("/orders", { params });
  return data;
}
