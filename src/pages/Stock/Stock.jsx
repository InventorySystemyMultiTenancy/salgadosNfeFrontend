import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import * as productService from "../../services/product.service";
import { useAuth } from "../../contexts/AuthContext";
import StockEntries from "./StockEntries";
import StockCount from "./StockCount";
import StockHistory from "./StockHistory";
import Audit from "./Audit";

const TABS = [
  { id: "lancamento", label: "Lançamento", roles: ["ADMIN", "SELLER", "KITCHEN"] },
  { id: "conferencia", label: "Conferência", roles: ["ADMIN", "SELLER"] },
  { id: "historico", label: "Histórico", roles: ["ADMIN"] },
  { id: "operador", label: "Por operador", roles: ["ADMIN"] },
];

export default function Stock() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);

  const tabs = TABS.filter((tab) => tab.roles.includes(user?.role));
  const activeTab = tabs.find((tab) => tab.id === searchParams.get("aba")) ?? tabs[0];

  function reloadProducts() {
    return productService.listProducts().then(setProducts);
  }

  useEffect(() => {
    reloadProducts();
  }, []);

  const lowStock = products.filter(
    (product) => product.minStockAlert != null && product.stockQuantity <= product.minStockAlert,
  );

  return (
    <div className="page">
      <h1>Estoque</h1>

      {lowStock.length > 0 && (
        <section className="low-stock-alert">
          <h2>Estoque crítico</h2>
          <ul>
            {lowStock.map((product) => (
              <li key={product.id}>
                {product.name}: {product.stockQuantity} unidades (mínimo {product.minStockAlert})
              </li>
            ))}
          </ul>
        </section>
      )}

      {tabs.length > 1 && (
        <div className="segmented" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab.id === tab.id}
              className={activeTab.id === tab.id ? "active" : ""}
              onClick={() => setSearchParams({ aba: tab.id })}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeTab.id === "lancamento" && <StockEntries products={products} onSaved={reloadProducts} />}
      {activeTab.id === "conferencia" && (
        <StockCount products={products} onSaved={reloadProducts} canSeeHistory={user?.role === "ADMIN"} />
      )}
      {activeTab.id === "historico" && <StockHistory products={products} />}
      {activeTab.id === "operador" && <Audit />}
    </div>
  );
}
