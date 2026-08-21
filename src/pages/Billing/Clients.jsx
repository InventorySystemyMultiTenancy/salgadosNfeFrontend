import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as clientService from "../../services/client.service";

const emptyForm = { name: "", phone: "", cpf: "", dueDay: "", creditLimit: "" };

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  async function loadClients() {
    const data = await clientService.listClients();
    setClients(data);
  }

  useEffect(() => {
    loadClients();
  }, []);

  function handleChange(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEdit(client) {
    setEditingId(client.id);
    setForm({
      name: client.name,
      phone: client.phone ?? "",
      cpf: client.cpf ?? "",
      dueDay: client.dueDay ?? "",
      creditLimit: client.creditLimit,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const payload = {
      name: form.name,
      phone: form.phone,
      cpf: form.cpf || null,
      dueDay: form.dueDay ? Number(form.dueDay) : null,
      creditLimit: Number(form.creditLimit) || 0,
    };

    try {
      if (editingId) {
        await clientService.updateClient(editingId, payload);
      } else {
        await clientService.createClient(payload);
      }
      cancelEdit();
      await loadClients();
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao salvar cliente.");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Remover este cliente?")) return;
    await clientService.deleteClient(id);
    await loadClients();
  }

  return (
    <div className="page">
      <h1>Clientes (Fiado / Mensalistas)</h1>

      <form className="product-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <div>
            <label htmlFor="name">Nome completo</label>
            <input id="name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} required />
          </div>
          <div>
            <label htmlFor="phone">WhatsApp/Telefone</label>
            <input
              id="phone"
              placeholder="5511999999999"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              required
            />
          </div>
        </div>
        <div className="form-row">
          <div>
            <label htmlFor="cpf">CPF</label>
            <input id="cpf" value={form.cpf} onChange={(e) => handleChange("cpf", e.target.value)} />
          </div>
          <div>
            <label htmlFor="dueDay">Dia de vencimento (1-31)</label>
            <input
              id="dueDay"
              type="number"
              min="1"
              max="31"
              value={form.dueDay}
              onChange={(e) => handleChange("dueDay", e.target.value)}
            />
          </div>
        </div>
        <div className="form-row">
          <div>
            <label htmlFor="creditLimit">Limite de crédito (R$)</label>
            <input
              id="creditLimit"
              type="number"
              step="0.01"
              min="0"
              value={form.creditLimit}
              onChange={(e) => handleChange("creditLimit", e.target.value)}
            />
          </div>
          <div />
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button type="submit">{editingId ? "Salvar alterações" : "Adicionar cliente"}</button>
          {editingId && (
            <button type="button" className="secondary" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <table className="product-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Telefone</th>
            <th>Vencimento</th>
            <th>Limite</th>
            <th>Saldo devedor</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id}>
              <td>{client.name}</td>
              <td>{client.phone}</td>
              <td>{client.dueDay ? `dia ${client.dueDay}` : "-"}</td>
              <td>R$ {Number(client.creditLimit).toFixed(2)}</td>
              <td>R$ {Number(client.currentBalance).toFixed(2)}</td>
              <td className="table-actions">
                <Link to={`/clientes/${client.id}/extrato`}>Extrato</Link>
                <button type="button" onClick={() => startEdit(client)}>
                  Editar
                </button>
                <button type="button" className="danger" onClick={() => handleDelete(client.id)}>
                  Remover
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
