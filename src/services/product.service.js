import api from "./api";

export async function listProducts() {
  const { data } = await api.get("/products");
  return data;
}

export async function createProduct(product) {
  const { data } = await api.post("/products", product);
  return data;
}

export async function updateProduct(id, product) {
  const { data } = await api.put(`/products/${id}`, product);
  return data;
}

export async function deleteProduct(id) {
  await api.delete(`/products/${id}`);
}

export async function uploadProductImage(id, file) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post(`/products/${id}/image`, form);
  return data;
}
