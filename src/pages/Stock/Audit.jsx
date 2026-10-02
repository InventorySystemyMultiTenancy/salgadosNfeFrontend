import { useEffect, useState } from "react";
import * as orderService from "../../services/order.service";

// Quanto cada operador baixou de cada produto em vendas (aba "Por operador" da tela de Estoque).
export default function Audit() {
  const [audit, setAudit] = useState([]);

  useEffect(() => {
    orderService.fetchStockAudit().then(setAudit);
  }, []);

  return (
    <>
      <div className="table-scroll">
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
      </div>
      {audit.length === 0 && <p className="cart-empty">Nenhuma venda registrada ainda.</p>}
    </>
  );
}
