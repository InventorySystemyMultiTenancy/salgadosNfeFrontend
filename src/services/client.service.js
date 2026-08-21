import api from "./api";

export async function listClients() {
  const { data } = await api.get("/clients");
  return data;
}

export async function createClient(client) {
  const { data } = await api.post("/clients", client);
  return data;
}

export async function updateClient(id, client) {
  const { data } = await api.put(`/clients/${id}`, client);
  return data;
}

export async function deleteClient(id) {
  await api.delete(`/clients/${id}`);
}

export async function fetchDuePanel() {
  const { data } = await api.get("/clients/due-today");
  return data;
}

export async function fetchStatement(id) {
  const { data } = await api.get(`/clients/${id}/statement`);
  return data;
}

export async function settleDebt(id, amount) {
  const { data } = await api.post(`/clients/${id}/payments`, { amount });
  return data;
}
