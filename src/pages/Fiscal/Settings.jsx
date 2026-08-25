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
        gatewayApiKey: "",
        hasGatewayApiKey: data.hasGatewayApiKey,
        gatewayApiKeyPreview: data.gatewayApiKeyPreview,
        gatewayCompanyId: data.gatewayCompanyId ?? "",
        environment: data.environment,
        cbsRate: data.cbsRate ?? "0.9",
        ibsUfRate: data.ibsUfRate ?? "0.05",
        ibsMunRate: data.ibsMunRate ?? "0.05",
        ibsCbsSituacaoTributaria: data.ibsCbsSituacaoTributaria ?? "000",
        ibsCbsClassificacaoTributaria: data.ibsCbsClassificacaoTributaria ?? "000001",
        ibsCbsMunicipioCodigo: data.ibsCbsMunicipioCodigo ?? "",
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
      const saved = await fiscalService.updateFiscalSettings({
        ...form,
        icmsRate: Number(form.icmsRate) || 0,
        cbsRate: Number(form.cbsRate) || 0,
        ibsUfRate: Number(form.ibsUfRate) || 0,
        ibsMunRate: Number(form.ibsMunRate) || 0,
      });
      setForm((current) => ({
        ...current,
        gatewayApiKey: "",
        hasGatewayApiKey: saved.hasGatewayApiKey,
        gatewayApiKeyPreview: saved.gatewayApiKeyPreview,
      }));
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
              <option value="NFEIO">NFe.io (emissão assíncrona, autorização ainda não confirmada automaticamente)</option>
              <option value="PLUGNOTAS">PlugNotas (ainda não implementado)</option>
            </select>
          </div>
          <div>
            <label htmlFor="gatewayApiKey">API Key do gateway</label>
            <input
              id="gatewayApiKey"
              type="password"
              placeholder={form.hasGatewayApiKey ? `Configurada (${form.gatewayApiKeyPreview})` : "Nenhuma chave configurada"}
              value={form.gatewayApiKey}
              onChange={(e) => handleChange("gatewayApiKey", e.target.value)}
            />
            {form.hasGatewayApiKey && (
              <small style={{ color: "var(--color-muted)" }}>
                Deixe em branco para manter a chave atual.
              </small>
            )}
          </div>
        </div>
        {form.gatewayProvider === "NFEIO" && (
          <div className="form-row">
            <div>
              <label htmlFor="gatewayCompanyId">Id da empresa na NFe.io</label>
              <input
                id="gatewayCompanyId"
                placeholder="ex: ac903854e3d445d39181365cb6ee690d"
                value={form.gatewayCompanyId}
                onChange={(e) => handleChange("gatewayCompanyId", e.target.value)}
              />
              <small style={{ color: "var(--color-muted)" }}>
                Retornado ao criar a empresa em app.nfe.io (POST /v2/companies).
              </small>
            </div>
          </div>
        )}

        <h3 style={{ marginTop: "1.5rem" }}>Reforma Tributária (IBS/CBS)</h3>
        <p className="cart-empty">
          Obrigatório em toda NFC-e a partir de 2026 (fase de teste). Os valores abaixo são um
          ponto de partida — <strong>confirme as alíquotas e códigos corretos com seu contador ou
          o suporte da Focus NFe</strong> antes de considerar uma emissão como válida.
        </p>
        <div className="form-row">
          <div>
            <label htmlFor="cbsRate">Alíquota CBS (%)</label>
            <input
              id="cbsRate"
              type="number"
              step="0.01"
              min="0"
              value={form.cbsRate}
              onChange={(e) => handleChange("cbsRate", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="ibsUfRate">Alíquota IBS — UF (%)</label>
            <input
              id="ibsUfRate"
              type="number"
              step="0.01"
              min="0"
              value={form.ibsUfRate}
              onChange={(e) => handleChange("ibsUfRate", e.target.value)}
            />
          </div>
        </div>
        <div className="form-row">
          <div>
            <label htmlFor="ibsMunRate">Alíquota IBS — Município (%)</label>
            <input
              id="ibsMunRate"
              type="number"
              step="0.01"
              min="0"
              value={form.ibsMunRate}
              onChange={(e) => handleChange("ibsMunRate", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="ibsCbsSituacaoTributaria">Situação tributária IBS/CBS (CST)</label>
            <input
              id="ibsCbsSituacaoTributaria"
              value={form.ibsCbsSituacaoTributaria}
              onChange={(e) => handleChange("ibsCbsSituacaoTributaria", e.target.value)}
            />
          </div>
        </div>
        <div className="form-row">
          <div>
            <label htmlFor="ibsCbsClassificacaoTributaria">Classificação tributária (cClassTrib)</label>
            <input
              id="ibsCbsClassificacaoTributaria"
              value={form.ibsCbsClassificacaoTributaria}
              onChange={(e) => handleChange("ibsCbsClassificacaoTributaria", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="ibsCbsMunicipioCodigo">Código IBGE do município (7 dígitos)</label>
            <input
              id="ibsCbsMunicipioCodigo"
              placeholder="ex: 3550308 (São Paulo)"
              value={form.ibsCbsMunicipioCodigo}
              onChange={(e) => handleChange("ibsCbsMunicipioCodigo", e.target.value)}
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
