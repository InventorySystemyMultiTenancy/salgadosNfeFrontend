import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as clientService from "../../services/client.service";

const emptyForm = {
  name: "",
  phone: "",
  cpf: "",
  cnpj: "",
  stateRegistration: "",
  dueDay: "",
  creditLimit: "",
  addressStreet: "",
  addressNumber: "",
  addressDistrict: "",
  addressCity: "",
  addressCityCode: "",
  addressState: "",
  addressPostalCode: "",
};

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
      cnpj: client.cnpj ?? "",
      stateRegistration: client.stateRegistration ?? "",
      dueDay: client.dueDay ?? "",
      creditLimit: client.creditLimit,
      addressStreet: client.addressStreet ?? "",
      addressNumber: client.addressNumber ?? "",
      addressDistrict: client.addressDistrict ?? "",
      addressCity: client.addressCity ?? "",
      addressCityCode: client.addressCityCode ?? "",
      addressState: client.addressState ?? "",
      addressPostalCode: client.addressPostalCode ?? "",
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
      cnpj: form.cnpj || null,
      stateRegistration: form.stateRegistration || null,
      dueDay: form.dueDay ? Number(form.dueDay) : null,
      creditLimit: Number(form.creditLimit) || 0,
      addressStreet: form.addressStreet || null,
      addressNumber: form.addressNumber || null,
      addressDistrict: form.addressDistrict || null,
      addressCity: form.addressCity || null,
      addressCityCode: form.addressCityCode || null,
      addressState: form.addressState || null,
      addressPostalCode: form.addressPostalCode || null,
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
      <h1>Clientes</h1>
      <p className="cart-empty">
        Cadastro usado tanto pra fiado/mensalistas (CPF) quanto pra clientes de nota fiscal (CNPJ).
        Pra emitir a nota de um cliente, veja os pedidos dele em Fiscal.
      </p>

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
            <label htmlFor="cnpj">CNPJ (cliente pessoa jurídica)</label>
            <input id="cnpj" value={form.cnpj} onChange={(e) => handleChange("cnpj", e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div>
            <label htmlFor="stateRegistration">Inscrição Estadual (só se for contribuinte de ICMS)</label>
            <input
              id="stateRegistration"
              value={form.stateRegistration}
              onChange={(e) => handleChange("stateRegistration", e.target.value)}
            />
            <small style={{ color: "var(--color-muted)" }}>
              Deixe em branco se o cliente não revende mercadoria (a maioria dos casos) — preencher
              errado faz a nota fiscal ser recusada pela SEFAZ.
            </small>
          </div>
          <div />
        </div>
        <div className="form-row">
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
        </div>

        <h3 style={{ marginTop: "1.5rem" }}>Endereço</h3>
        <p className="cart-empty">
          Só é necessário se você emitir nota fiscal em nome desse cliente pela NFe.io — sem
          endereço completo, a emissão pra esse cliente é recusada.
        </p>
        <div className="form-row">
          <div>
            <label htmlFor="addressStreet">Rua</label>
            <input
              id="addressStreet"
              value={form.addressStreet}
              onChange={(e) => handleChange("addressStreet", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="addressNumber">Número</label>
            <input
              id="addressNumber"
              value={form.addressNumber}
              onChange={(e) => handleChange("addressNumber", e.target.value)}
            />
          </div>
        </div>
        <div className="form-row">
          <div>
            <label htmlFor="addressDistrict">Bairro</label>
            <input
              id="addressDistrict"
              value={form.addressDistrict}
              onChange={(e) => handleChange("addressDistrict", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="addressPostalCode">CEP</label>
            <input
              id="addressPostalCode"
              placeholder="00000-000"
              value={form.addressPostalCode}
              onChange={(e) => handleChange("addressPostalCode", e.target.value)}
            />
          </div>
        </div>
        <div className="form-row">
          <div>
            <label htmlFor="addressCity">Cidade</label>
            <input
              id="addressCity"
              value={form.addressCity}
              onChange={(e) => handleChange("addressCity", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="addressCityCode">Código IBGE do município</label>
            <input
              id="addressCityCode"
              placeholder="ex: 3550308 (São Paulo)"
              value={form.addressCityCode}
              onChange={(e) => handleChange("addressCityCode", e.target.value)}
            />
          </div>
        </div>
        <div className="form-row">
          <div>
            <label htmlFor="addressState">UF</label>
            <input
              id="addressState"
              placeholder="SP"
              maxLength={2}
              value={form.addressState}
              onChange={(e) => handleChange("addressState", e.target.value.toUpperCase())}
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
            <th>CPF/CNPJ</th>
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
              <td>{client.cnpj || client.cpf || "-"}</td>
              <td>{client.dueDay ? `dia ${client.dueDay}` : "-"}</td>
              <td>R$ {Number(client.creditLimit).toFixed(2)}</td>
              <td>R$ {Number(client.currentBalance).toFixed(2)}</td>
              <td className="table-actions">
                <Link to={`/clientes/${client.id}/extrato`}>Extrato</Link>
                <Link to={`/fiscal/pedidos?clientId=${client.id}`}>Pedidos/Nota</Link>
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
