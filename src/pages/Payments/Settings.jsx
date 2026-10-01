import { useEffect, useState } from "react";
import * as paymentService from "../../services/payment.service";
import { IconChevronDown } from "../../components/icons";

const PROVIDERS = [
  { value: "NONE", label: "Nenhum (maquininha avulsa, sem integração)" },
  { value: "MERCADO_PAGO", label: "Mercado Pago (Point)" },
  { value: "SUMUP", label: "SumUp (Solo)" },
];

const API_KEY_HINT = {
  MERCADO_PAGO:
    "Access Token de produção da conta dona da maquininha (Mercado Pago > Suas integrações > Credenciais de produção).",
  SUMUP: "API key da conta (me.sumup.com > Configurações > Para Desenvolvedores > Toolkit > API Keys).",
};

function formFrom(data) {
  return { provider: data.provider, apiKey: "", accountId: data.accountId ?? "", terminalId: data.terminalId ?? "" };
}

export default function Settings() {
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(null);
  const [terminals, setTerminals] = useState(null);
  const [terminalsReload, setTerminalsReload] = useState(0);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [pairing, setPairing] = useState({ code: "", name: "Caixa", busy: false });

  useEffect(() => {
    paymentService.fetchPaymentSettings().then((data) => {
      setSaved(data);
      setForm(formFrom(data));
    });
  }, []);

  // Só dá pra listar as maquininhas com o banco e o token já salvos (a busca usa o token do servidor).
  // SumUp também precisa do merchant code (todas as rotas da API são por conta).
  const canListTerminals =
    saved && saved.provider !== "NONE" && saved.hasApiKey && (saved.provider !== "SUMUP" || saved.accountId);

  useEffect(() => {
    if (!canListTerminals) return;
    let active = true;
    paymentService
      .fetchTerminals()
      .then((list) => active && setTerminals(list))
      .catch((err) => {
        if (!active) return;
        setTerminals([]);
        setError(err.response?.data?.error || "Erro ao buscar as maquininhas.");
      });
    return () => {
      active = false;
    };
  }, [canListTerminals, saved?.provider, saved?.apiKeyPreview, saved?.accountId, terminalsReload]);

  function handleChange(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function reloadTerminals() {
    setError("");
    setTerminals(null);
    setTerminalsReload((n) => n + 1);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setFeedback("");

    try {
      const data = await paymentService.updatePaymentSettings(form);
      setSaved(data);
      setForm(formFrom(data));
      setFeedback("Configurações de pagamento salvas!");
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao salvar configurações.");
    }
  }

  async function handlePair() {
    setError("");
    setFeedback("");
    setPairing((current) => ({ ...current, busy: true }));
    try {
      const reader = await paymentService.pairTerminal(pairing.code, pairing.name);
      handleChange("terminalId", reader.id);
      setPairing((current) => ({ ...current, code: "" }));
      setFeedback("Maquininha pareada! Confira se ela está selecionada abaixo e clique em Salvar.");
      reloadTerminals();
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao parear a maquininha.");
    } finally {
      setPairing((current) => ({ ...current, busy: false }));
    }
  }

  async function handleSetupPdv(terminalId) {
    setError("");
    setFeedback("");
    try {
      await paymentService.setupTerminal(terminalId);
      setFeedback("Modo PDV ativado. Reinicie a maquininha para aplicar.");
      reloadTerminals();
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao ativar o modo PDV.");
    }
  }

  if (!form) return <div className="page">Carregando...</div>;

  const providerChanged = form.provider !== saved.provider;

  return (
    <div className="page">
      <h1>Configurações de Pagamento</h1>
      <p className="cart-empty">
        Banco da maquininha de cartão integrada ao PDV. Com uma maquininha configurada, as vendas em
        Débito, Crédito e Pix são enviadas direto para o aparelho e só são registradas depois que o
        pagamento é aprovado.
      </p>

      <form className="product-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <div>
            <label htmlFor="provider">Banco</label>
            <div className="select-wrap">
              <select id="provider" value={form.provider} onChange={(e) => handleChange("provider", e.target.value)}>
                {PROVIDERS.map((provider) => (
                  <option key={provider.value} value={provider.value} disabled={provider.disabled}>
                    {provider.label}
                  </option>
                ))}
              </select>
              <IconChevronDown />
            </div>
            {providerChanged && saved.provider !== "NONE" && (
              <small className="field-hint">
                Trocar de banco apaga o token e a maquininha do banco anterior.
              </small>
            )}
          </div>
          {form.provider !== "NONE" && (
            <div>
              <label htmlFor="apiKey">Token do banco</label>
              <input
                id="apiKey"
                type="password"
                autoComplete="off"
                placeholder={
                  saved.hasApiKey && !providerChanged
                    ? `Configurado (${saved.apiKeyPreview})`
                    : "Nenhum token configurado"
                }
                value={form.apiKey}
                onChange={(e) => handleChange("apiKey", e.target.value)}
              />
              <small className="field-hint">
                {API_KEY_HINT[form.provider]}
                {saved.hasApiKey && !providerChanged && " Deixe em branco para manter o token atual."}
              </small>
            </div>
          )}
        </div>
        {form.provider === "SUMUP" && (
          <div className="form-row">
            <div>
              <label htmlFor="accountId">Merchant code</label>
              <input
                id="accountId"
                placeholder="ex: MABC1234"
                value={form.accountId}
                onChange={(e) => handleChange("accountId", e.target.value)}
              />
              <small className="field-hint">Código da conta SumUp, no perfil da conta em me.sumup.com.</small>
            </div>
          </div>
        )}

        {form.provider !== "NONE" && !providerChanged && (
          <>
            <h3>
              Maquininha{" "}
              {canListTerminals && (
                <button type="button" className="link-button" onClick={reloadTerminals}>
                  atualizar lista
                </button>
              )}
            </h3>
            {canListTerminals && form.provider === "SUMUP" && (
              <div className="form-row">
                <div>
                  <label htmlFor="pairingCode">Parear nova Solo</label>
                  <div className="input-with-button">
                    <input
                      id="pairingCode"
                      placeholder="Código mostrado na Solo"
                      value={pairing.code}
                      onChange={(e) => setPairing((current) => ({ ...current, code: e.target.value }))}
                    />
                    <input
                      aria-label="Nome da maquininha"
                      placeholder="Nome (ex: Caixa)"
                      value={pairing.name}
                      onChange={(e) => setPairing((current) => ({ ...current, name: e.target.value }))}
                    />
                    <button type="button" onClick={handlePair} disabled={pairing.busy || !pairing.code.trim()}>
                      {pairing.busy ? "Pareando..." : "Parear"}
                    </button>
                  </div>
                  <small className="field-hint">
                    Na Solo: saia da conta, conecte no Wi-Fi e vá em Conexões &gt; API &gt; Conectar. O
                    código vale por 5 minutos.
                  </small>
                </div>
              </div>
            )}
            {!canListTerminals ? (
              <p className="cart-empty">
                {form.provider === "SUMUP"
                  ? "Salve o token e o merchant code para buscar as maquininhas da conta."
                  : "Salve o token para buscar as maquininhas da conta."}
              </p>
            ) : terminals === null ? (
              <p className="cart-empty">Buscando maquininhas...</p>
            ) : terminals.length === 0 ? (
              <p className="cart-empty">Nenhuma maquininha encontrada nesta conta.</p>
            ) : (
              <ul className="terminal-list">
                {terminals.map((terminal) => (
                  <li key={terminal.id}>
                    <label>
                      <input
                        type="radio"
                        name="terminalId"
                        checked={form.terminalId === terminal.id}
                        onChange={() => handleChange("terminalId", terminal.id)}
                      />
                      {terminal.label}
                    </label>
                    {terminal.needsSetup ? (
                      <button type="button" className="link-button" onClick={() => handleSetupPdv(terminal.id)}>
                        Ativar modo PDV
                      </button>
                    ) : (
                      terminal.statusLabel && <span className="terminal-badge">{terminal.statusLabel}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {form.provider === "MERCADO_PAGO" && (
              <small className="field-hint">
                A maquininha precisa estar em modo PDV para receber as cobranças do sistema. Depois de
                ativar, reinicie o aparelho.
              </small>
            )}
            {form.provider === "SUMUP" && (
              <small className="field-hint">
                Na SumUp, só Débito e Crédito vão para a maquininha. Pix continua avulso.
              </small>
            )}
          </>
        )}

        {error && <p className="form-error">{error}</p>}
        {feedback && <p className="form-success">{feedback}</p>}

        <div className="form-actions">
          <button type="submit">Salvar</button>
        </div>
      </form>
    </div>
  );
}
