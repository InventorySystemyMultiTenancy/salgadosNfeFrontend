import { useEffect, useState } from "react";
import * as orderService from "../../services/order.service";
import * as productService from "../../services/product.service";

export default function Audit() {
  const [audit, setAudit] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    orderService.fetchStockAudit().then(setAudit);
    productService.listProducts().then(setProducts);
  }, []);

  const lowStock = products.filter(
    (product) => product.minStockAlert != null && product.stockQuantity <= product.minStockAlert,
  );

  return (
    <div className="page">
      <h1>Auditoria de Estoque por Operador</h1>

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

      <table className="product-table">
        <thead>
          <tr>
            <th>Operador</th>
            <th>Produto</th>
            <th>Quantidade baixada</th>
          </tr>
        </thead>
        <tbody>
          {audit.map((row) => (
            <tr key={`${row.sellerId}-${row.productId}`}>
              <td>{row.sellerName}</td>
              <td>{row.productName}</td>
              <td>{row.totalQuantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {audit.length === 0 && <p className="cart-empty">Nenhuma venda registrada ainda.</p>}
    </div>
  );
}
