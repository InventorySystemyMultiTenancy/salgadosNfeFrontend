import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as clientService from "../../services/client.service";
import { FilterBar, SearchFilter, SelectFilter } from "../../components/Filters";
import { matchesSearch } from "../../utils/filters";

export default function DuePanel() {
  const [clients, setClients] = useState([]);
  const today = new Date().getDate();
  const [q, setQ] = useState("");
  const [situation, setSituation] = useState("");

  useEffect(() => {
    clientService.fetchDuePanel().then(setClients);
  }, []);

  const visibleClients = clients.filter(
    (client) =>
      matchesSearch(q, client.name, client.phone) &&
      (!situation || (situation === "today") === (client.dueDay === today)),
  );
  const totalDue = visibleClients
    .reduce((sum, client) => sum + Number(client.currentBalance), 0)
    .toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="page">
      <h1>Cobrança do Dia</h1>
      <p>Clientes com vencimento hoje (dia {today}) ou com faturas em atraso.</p>

      <FilterBar
        summary={`${visibleClients.length} de ${clients.length} cliente(s) · ${totalDue} a receber`}
        canClear={Boolean(q || situation)}
        onClear={() => {
          setQ("");
          setSituation("");
        }}
      >
        <SearchFilter value={q} onChange={setQ} placeholder="Nome ou telefone..." />
        <SelectFilter
          label="Situação"
          value={situation}
          onChange={setSituation}
          options={[
            { value: "today", label: "Vence hoje" },
            { value: "late", label: "Em atraso" },
          ]}
        />
      </FilterBar>

      {clients.length === 0 && <p className="cart-empty">Nenhum cliente vencendo ou em atraso hoje.</p>}

      <div className="table-scroll">
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
            {visibleClients.map((client) => (
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
    </div>
  );
}
