// Normaliza os dados de uma LeadIndicacao (portal do indicador) para os campos
// de Cliente e Contrato, garantindo que TODOS os dados originais preenchidos no
// formulário acompanhem o lead durante toda a jornada (cliente + contrato).
// Campos sem correspondência direta (número/complemento) são incorporados ao
// endereço para não serem perdidos.

export function dadosRicosLeadIndicacao(li) {
  if (!li) return null;
  const isPF = li.tipo === 'PF';

  const logradouro = isPF ? (li.pf_endereco || '') : (li.pj_endereco || '');
  const numero = isPF ? (li.pf_numero || '') : (li.pj_numero || '');
  const complemento = isPF ? (li.pf_complemento || '') : (li.pj_complemento || '');

  // Compõe o endereço completo quando houver número/complemento (Cliente e
  // Contrato não possuem campos separados para esses dados)
  let enderecoCompleto = logradouro;
  if (numero) enderecoCompleto = enderecoCompleto ? `${enderecoCompleto}, ${numero}` : numero;
  if (complemento) enderecoCompleto = enderecoCompleto ? `${enderecoCompleto} - ${complemento}` : complemento;

  return {
    isPF,
    nome: isPF ? (li.pf_nome || '') : (li.pj_razao_social || ''),
    cpf_cnpj: isPF ? (li.pf_cpf || '') : (li.pj_cnpj || ''),
    rg: isPF ? (li.pf_rg || '') : '',
    email: isPF ? (li.pf_email || '') : (li.pj_email || ''),
    telefone: isPF ? (li.pf_telefone || li.pf_whatsapp || '') : (li.pj_telefone || li.pj_whatsapp || ''),
    whatsapp: isPF ? (li.pf_whatsapp || '' ) : (li.pj_whatsapp || ''),
    nascimento: isPF ? (li.pf_nascimento || null) : null,
    nacionalidade: isPF ? (li.pf_nacionalidade || '') : '',
    profissao: isPF ? (li.pf_profissao || '') : '',
    renda: isPF ? (li.pf_renda != null ? Number(li.pf_renda) : null) : null,
    responsavel_legal: !isPF ? (li.pj_nome_responsavel || '') : '',
    cpf_responsavel: !isPF ? (li.pj_cpf_responsavel || '') : '',
    ramo_atividade: !isPF ? (li.pj_ramo_atividade || '') : '',
    faturamento: !isPF ? (li.pj_faturamento != null ? Number(li.pj_faturamento) : null) : null,
    cep: isPF ? (li.pf_cep || '') : (li.pj_cep || ''),
    endereco: enderecoCompleto,
    bairro: isPF ? (li.pf_bairro || '') : (li.pj_bairro || ''),
    cidade: isPF ? (li.pf_cidade || '') : (li.pj_cidade || ''),
    estado: isPF ? (li.pf_estado || '') : (li.pj_estado || ''),
    produto: li.produto || '',
    valor_estimado: li.valor_estimado != null ? Number(li.valor_estimado) : null,
    observacoes: li.observacoes || '',
  };
}

// Localiza a LeadIndicacao de origem a partir de uma conversa da Central de Leads.
// Prioriza a correspondência mais robusta (CPF/CNPJ, depois telefone/whatsapp,
// depois parceiro + nome) para não depender só do nome do lead.
export async function buscarLeadIndicacao(base44, conv, lead) {
  if (!conv?.origem || !conv.origem.startsWith('Indicação · ')) return null;
  const nomeParceiro = conv.origem.replace('Indicação · ', '').trim();
  const nome = conv.lead_nome || '';
  const doc = (lead?.cpf_cnpj || '').replace(/\D/g, '');
  const tel = (conv.telefone || '').replace(/\D/g, '');

  try {
    const todas = await base44.asServiceRole.entities.LeadIndicacao.list('-created_date', 500);

    // 1) Por CPF/CNPJ (mais confiável)
    if (doc) {
      const byDoc = todas.find((li) => {
        const d = (li.tipo === 'PF' ? li.pf_cpf : li.pj_cnpj || '').replace(/\D/g, '');
        return d && d === doc;
      });
      if (byDoc) return byDoc;
    }

    // 2) Por telefone/whatsapp
    if (tel) {
      const byTel = todas.find((li) => {
        const t = (li.tipo === 'PF'
          ? (li.pf_whatsapp || li.pf_telefone || '')
          : (li.pj_whatsapp || li.pj_telefone || '')).toString().replace(/\D/g, '');
        return t && t === tel;
      });
      if (byTel) return byTel;
    }

    // 3) Por parceiro + nome exato do lead
    return todas.find((li) => li.parceiro_nome === nomeParceiro && (
      (li.pf_nome && li.pf_nome === nome) ||
      (li.pj_razao_social && li.pj_razao_social === nome)
    )) || null;
  } catch (e) {
    return null;
  }
}