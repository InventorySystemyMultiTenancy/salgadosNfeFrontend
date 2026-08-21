import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as clientService from "../../services/client.service";

export default function DuePanel() {
  const [clients, setClients] = useState([]);
  const today = new Date().getDate();

  useEffect(() => {
    clientService.fetchDuePanel().then(setClients);
  }, []);

  return (
    <div className="page">
      <h1>Cobrança do Dia</h1>
      <p>Clientes com vencimento hoje (dia {today}) ou com faturas em atraso.</p>

      {clients.length === 0 && <p className="cart-empty">Nenhum cliente vencendo ou em atraso hoje.</p>}

      <table className="product-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Telefone</th>
            <th>Vencimento</th>
            <th>Situação</th>
            <th>Saldo devedor</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id}>
              <td>{client.name}</td>
              <td>{client.phone}</td>
              <td>dia {client.dueDay}</td>
              <td>{client.dueDay === today ? "Vence hoje" : "Em atraso"}</td>
              <td>R$ {Number(client.currentBalance).toFixed(2)}</td>
              <td className="table-actions">
                <Link to={`/clientes/${client.id}/extrato`}>Ver extrato / cobrar</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
