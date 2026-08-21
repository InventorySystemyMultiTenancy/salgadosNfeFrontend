import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import * as clientService from "../../services/client.service";

export default function Statement() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  async function load() {
    const result = await clientService.fetchStatement(id);
    setData(result);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleSettle(event) {
    event.preventDefault();
    setError("");
    setFeedback("");
    try {
      await clientService.settleDebt(id, Number(amount));
      setAmount("");
      setFeedback("Pagamento registrado com sucesso!");
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao registrar pagamento.");
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(data.message);
    setFeedback("Texto do extrato copiado!");
  }

  if (!data) return <div className="page">Carregando...</div>;

  const { client, entries, message } = data;
  const whatsappLink = `https://wa.me/${client.phone}?text=${encodeURIComponent(message)}`;

  return (
    <div className="page">
      <h1>Extrato — {client.name}</h1>
      <p>
        Saldo devedor atual: <strong>R$ {Number(client.currentBalance).toFixed(2)}</strong> · Limite: R${" "}
        {Number(client.creditLimit).toFixed(2)}
      </p>

      <table className="product-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Tipo</th>
            <th>Descrição</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={index}>
              <td>{new Date(entry.date).toLocaleDateString("pt-BR")}</td>
              <td>{entry.type === "charge" ? "Consumo" : "Pagamento"}</td>
              <td>{entry.description}</td>
              <td>{entry.type === "charge" ? "+" : "-"}R$ {entry.amount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="form-actions" style={{ marginTop: "1rem" }}>
        <button type="button" onClick={handleCopy}>
          Copiar texto do extrato
        </button>
        <a href={whatsappLink} target="_blank" rel="noreferrer">
          <button type="button" className="secondary">
            Enviar via WhatsApp
          </button>
        </a>
      </div>

      <form className="product-form" onSubmit={handleSettle} style={{ marginTop: "1.5rem" }}>
        <label htmlFor="amount">Registrar pagamento (total ou parcial)</label>
        <input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        {error && <p className="form-error">{error}</p>}
        {feedback && <p className="form-success">{feedback}</p>}
        <div className="form-actions">
          <button type="submit">Liquidar</button>
          <button
            type="button"
            className="secondary"
            onClick={() => setAmount(String(client.currentBalance))}
          >
            Preencher com saldo total
          </button>
        </div>
      </form>
    </div>
  );
}
