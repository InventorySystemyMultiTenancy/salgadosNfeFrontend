import api from "./api";

export async function fetchStoreSettings() {
  const { data } = await api.get("/store-settings");
  return data;
}

export async function updateStoreSettings(settings) {
  const { data } = await api.put("/store-settings", settings);
  return data;
}

// O administrador digita o próprio e-mail/senha no PDV; devolve um token curto que só vale pra
// esse desconto.
export async function approveDiscount({ email, password, discountAmount }) {
  const { data } = await api.post("/store-settings/approve-discount", { email, password, discountAmount });
  return data;
}
