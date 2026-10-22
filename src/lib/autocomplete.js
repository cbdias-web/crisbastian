// Preenchimento automático de cadastro por CEP e CNPJ
// CEP: ViaCEP (fallback BrasilAPI v2) · CNPJ: BrasilAPI (fallback ReceitaWS)

export async function consultarCep(cep) {
  const digitos = String(cep || '').replace(/\D/g, '');
  if (digitos.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
    if (r.ok) {
      const d = await r.json();
      if (!d.erro) {
        return {
          logradouro: d.logradouro || '',
          complemento: d.complemento || '',
          bairro: d.bairro || '',
          cidade: d.localidade || '',
          estado: d.uf || '',
        };
      }
    }
  } catch {}
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${digitos}`);
    if (r.ok) {
      const d = await r.json();
      return {
        logradouro: d.street || '',
        complemento: d.complement || '',
        bairro: d.neighborhood || '',
        cidade: d.city || '',
        estado: d.state || '',
      };
    }
  } catch {}
  return null;
}

export async function consultarCnpj(cnpj) {
  const digitos = String(cnpj || '').replace(/\D/g, '');
  if (digitos.length !== 14) return null;
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digitos}`);
    if (r.ok) {
      const d = await r.json();
      return {
        razao_social: d.razao_social || '',
        ramo_atividade: d.cnae_fiscal_descricao || '',
        cep: d.cep ? String(d.cep).replace(/\D/g, '').padStart(8, '0') : '',
        endereco: d.logradouro || '',
        numero: d.numero || '',
        complemento: d.complemento || '',
        bairro: d.bairro || '',
        cidade: d.municipio || '',
        estado: d.uf || '',
      };
    }
  } catch {}
  try {
    const r = await fetch(`https://receitaws.com.br/v1/cnpj/${digitos}`);
    if (r.ok) {
      const d = await r.json();
      if (d.status !== 'ERROR') {
        return {
          razao_social: d.nome || '',
          ramo_atividade: (d.atividade_principal?.[0]?.texto) || '',
          cep: String(d.cep || '').replace(/\D/g, '').padStart(8, '0'),
          endereco: d.logradouro || '',
          numero: d.numero || '',
          complemento: d.complemento || '',
          bairro: d.bairro || '',
          cidade: d.municipio || '',
          estado: d.uf || '',
        };
      }
    }
  } catch {}
  return null;
}

/**
 * Preenche no objeto do formulário (via setter funcional) APENAS os campos vazios.
 * prefixo: ex. 'pf_' / 'pj_' — campos: razao_social, ramo_atividade, cep,
 * endereco, numero, complemento, bairro, cidade, estado.
 */
export function aplicarDados(setter, prefixo, dados) {
  if (!dados) return;
  setter(prev => {
    const next = { ...prev };
    const put = (sufixo, v) => {
      const k = `${prefixo}${sufixo}`;
      if (v && !String(prev[k] ?? '').trim()) next[k] = v;
    };
    put('razao_social', dados.razao_social);
    put('ramo_atividade', dados.ramo_atividade);
    put('cep', dados.cep);
    put('endereco', dados.endereco);
    put('numero', dados.numero);
    put('complemento', dados.complemento);
    put('bairro', dados.bairro);
    put('cidade', dados.cidade);
    put('estado', dados.estado);
    return next;
  });
}