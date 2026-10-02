import api from "./api";

export async function fetchSalesReport({ from, to }) {
  const { data } = await api.get("/reports/sales", {
    params: { from: from.toISOString(), to: to.toISOString(), tzOffset: new Date().getTimezoneOffset() },
  });
  return data;
}
