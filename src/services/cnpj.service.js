import axios from "axios";

// BrasilAPI espelha o cadastro da Receita Federal (nome, endereço) — gratuito, sem autenticação.
// Não inclui Inscrição Estadual: isso é cadastro estadual (Sefaz), não federal, e não tem fonte
// pública gratuita e confiável cobrindo os 27 estados (ver memória do projeto).
export async function lookupCnpj(cnpj) {
  const digits = cnpj.replace(/\D/g, "");
  const { data } = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
  return {
    name: data.razao_social,
    addressStreet: data.logradouro,
    addressNumber: data.numero,
    addressDistrict: data.bairro,
    addressCity: data.municipio,
    addressCityCode: data.codigo_municipio_ibge ? String(data.codigo_municipio_ibge) : "",
    addressState: data.uf,
    addressPostalCode: data.cep,
  };
}
