import api from "./api";

// type: "ENTRY" (entrada: produção/compra) ou "LOSS" (saída: perda/vencido)
export async function createStockEntries({ type, reason, items }) {
  const { data } = await api.post("/stock/entries", { type, reason, items });
  return data;
}

export async function fetchStockMovements({ productId, type, from, to } = {}) {
  const { data } = await api.get("/stock/movements", {
    params: {
      productId: productId || undefined,
      type: type || undefined,
      from: from?.toISOString(),
      to: to?.toISOString(),
    },
  });
  return data;
}

export async function applyStockCount({ notes, items }) {
  const { data } = await api.post("/stock/counts", { notes, items });
  return data;
}

export async function fetchStockCounts() {
  const { data } = await api.get("/stock/counts");
  return data;
}

export async function fetchStockCount(id) {
  const { data } = await api.get(`/stock/counts/${id}`);
  return data;
}
