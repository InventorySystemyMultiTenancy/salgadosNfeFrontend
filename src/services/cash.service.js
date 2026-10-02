import api from "./api";

export async function fetchCurrentCash() {
  const { data } = await api.get("/cash/current");
  return data;
}

export async function openCash(openingAmount) {
  const { data } = await api.post("/cash/open", { openingAmount });
  return data;
}

export async function addCashMovement({ type, amount, reason }) {
  const { data } = await api.post("/cash/movements", { type, amount, reason });
  return data;
}

export async function closeCash({ countedCash, notes }) {
  const { data } = await api.post("/cash/close", { countedCash, notes });
  return data;
}

export async function fetchCashSessions(params = {}) {
  const { data } = await api.get("/cash/sessions", { params });
  return data;
}

export async function fetchCashSession(id) {
  const { data } = await api.get(`/cash/sessions/${id}`);
  return data;
}
