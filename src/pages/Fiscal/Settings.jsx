import { useEffect, useState } from "react";
import * as fiscalService from "../../services/fiscal.service";

export default function Settings() {
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    fiscalService.fetchFiscalSettings().then((data) =>
      setForm({
        companyName: data.companyName ?? "",
        cnpj: data.cnpj ?? "",
        icmsRate: data.icmsRate ?? "0",
        gatewayProvider: data.gatewayProvider,
        gatewayApiKey: data.gatewayApiKey ?? "",
        environment: data.environment,
      }),
    );
  }, []);

  function handleChange(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setFeedback("");

    try {
      await fiscalService.updateFiscalSettings({
        ...form,
        icmsRate: Number(form.icmsRate) || 0,
      });
      setFeedback("Configurações fiscais salvas!");
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao salvar configurações.");
    }
  }

  if (!form) return <div className="page">Carregando...</div>;

  return (
    <div className="page">
      <h1>Configurações Fiscais</h1>
      <p className="cart-empty">
        Parâmetros usados na emissão de NFC-e. Sem um gateway configurado, a emissão retorna um
        aviso claro em vez de tentar emitir uma nota fiscal de verdade.
      </p>

      <form className="product-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <div>
            <label htmlFor="companyName">Razão social</label>
            <input
              id="companyName"
              value={form.companyName}
              onChange={(e) => handleChange("companyName", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="cnpj">CNPJ</label>
            <input id="cnpj" value={form.cnpj} onChange={(e) => handleChange("cnpj", e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div>
            <label htmlFor="icmsRate">Alíquota padrão de ICMS (%)</label>
            <input
              id="icmsRate"
              type="number"
              step="0.01"
              min="0"
              value={form.icmsRate}
              onChange={(e) => handleChange("icmsRate", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="environment">Ambiente</label>
            <select
              id="environment"
              value={form.environment}
              onChange={(e) => handleChange("environment", e.target.value)}
            >
              <option value="SANDBOX">Homologação (sandbox)</option>
              <option value="PRODUCTION">Produção</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div>
            <label htmlFor="gatewayProvider">Gateway fiscal</label>
            <select
              id="gatewayProvider"
              value={form.gatewayProvider}
              onChange={(e) => handleChange("gatewayProvider", e.target.value)}
            >
              <option value="NONE">Nenhum (não emite)</option>
              <option value="FOCUS_NFE">Focus NFe</option>
              <option value="PLUGNOTAS">PlugNotas (ainda não implementado)</option>
            </select>
          </div>
          <div>
            <label htmlFor="gatewayApiKey">API Key do gateway</label>
            <input
              id="gatewayApiKey"
              type="password"
              value={form.gatewayApiKey}
              onChange={(e) => handleChange("gatewayApiKey", e.target.value)}
            />
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}
        {feedback && <p className="form-success">{feedback}</p>}

        <div className="form-actions">
          <button type="submit">Salvar</button>
        </div>
      </form>
    </div>
  );
}
