import { useEffect, useState } from "react";
import * as userService from "../../services/user.service";
import { IconChevronDown } from "../../components/icons";
import { FilterBar, SearchFilter, SelectFilter } from "../../components/Filters";
import { matchesSearch } from "../../utils/filters";

const ROLE_LABEL = { ADMIN: "Administrador", SELLER: "Vendedor", KITCHEN: "Cozinha" };
const emptyForm = { name: "", email: "", password: "", role: "SELLER" };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");

  async function loadUsers() {
    const data = await userService.listUsers();
    setUsers(data);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function handleChange(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setFeedback("");

    try {
      await userService.createUser(form);
      setForm(emptyForm);
      setFeedback("Usuário criado com sucesso!");
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao criar usuário.");
    }
  }

  const visibleUsers = users.filter((user) => matchesSearch(q, user.name, user.email) && (!role || user.role === role));

  return (
    <div className="page">
      <h1>Usuários e Operadores</h1>

      <form className="product-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <div>
            <label htmlFor="name">Nome</label>
            <input id="name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} required />
          </div>
          <div>
            <label htmlFor="email">Email (login)</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              required
            />
          </div>
        </div>
        <div className="form-row">
          <div>
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="role">Perfil</label>
            <div className="select-wrap">
              <select id="role" value={form.role} onChange={(e) => handleChange("role", e.target.value)}>
                <option value="SELLER">Vendedor</option>
                <option value="KITCHEN">Cozinha</option>
                <option value="ADMIN">Administrador</option>
              </select>
              <IconChevronDown />
            </div>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}
        {feedback && <p className="form-success">{feedback}</p>}

        <div className="form-actions">
          <button type="submit">Adicionar usuário</button>
        </div>
      </form>

      <FilterBar
        summary={`${visibleUsers.length} de ${users.length} usuário(s)`}
        canClear={Boolean(q || role)}
        onClear={() => {
          setQ("");
          setRole("");
        }}
      >
        <SearchFilter value={q} onChange={setQ} placeholder="Nome ou e-mail..." />
        <SelectFilter
          label="Perfil"
          value={role}
          onChange={setRole}
          options={Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))}
        />
      </FilterBar>

      <div className="table-scroll">
        <table className="product-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Perfil</th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{ROLE_LABEL[user.role]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
