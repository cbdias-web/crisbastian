// Regras do formulário de Offshore / LLC (coleta pós-contrato).
// Mantido em espelho com src/lib/offshoreForm.js (front-end).

export const DOCS_BASE = [
  { tipo: 'passaporte', descricao: 'Passaporte vigente (página com foto e dados)', obrigatorio: true },
  { tipo: 'rg_cnh', descricao: 'RG ou CNH (frente e verso)', obrigatorio: true },
  { tipo: 'comprovante_residencia', descricao: 'Comprovante de residência (até 90 dias)', obrigatorio: true },
  { tipo: 'irpf', descricao: 'Última declaração de IR com recibo de entrega', obrigatorio: true },
  { tipo: 'origem_recursos', descricao: 'Comprovante de origem dos recursos (se houver)', obrigatorio: false },
];
export const DOCS_MULTI = [
  { tipo: 'docs_demais_membros', descricao: 'Passaporte e comprovante de residência dos demais sócios', obrigatorio: true },
];
export const DOCS_SOCIO_PJ = [
  { tipo: 'contrato_social', descricao: 'Contrato social da empresa sócia e última alteração', obrigatorio: true },
  { tipo: 'cartao_cnpj', descricao: 'Cartão CNPJ da empresa sócia', obrigatorio: true },
  { tipo: 'docs_socios_pj', descricao: 'Documentos de identificação dos sócios da empresa', obrigatorio: true },
];

export function docsConfig(r: any) {
  const cfg = [...DOCS_BASE];
  if (r?.llc_tipo_membros === 'multi') cfg.push(...DOCS_MULTI);
  if (r?.socio_pj === 'sim') cfg.push(...DOCS_SOCIO_PJ);
  return cfg;
}

// Reconstrói o checklist conforme as respostas, preservando arquivos já enviados.
export function mergeDocs(r: any, savedDocs: any[]) {
  const saved = Array.isArray(savedDocs) ? savedDocs : [];
  return docsConfig(r).map((d) => {
    const found = saved.find((s) => s.tipo === d.tipo);
    return found
      ? { ...d, recebido: !!found.recebido, url: found.url || '', nome_arquivo: found.nome_arquivo || '' }
      : { ...d, recebido: false, url: '', nome_arquivo: '' };
  });
}

const vazio = (v: any) => !String(v ?? '').trim();

export function calcularPendencias(r: any): string[] {
  const p: string[] = [];
  if (vazio(r.contratante_nome)) p.push('Contratante: Nome completo');
  if (vazio(r.contratante_cpf)) p.push('Contratante: CPF');
  if (vazio(r.contratante_nascimento)) p.push('Contratante: Data de nascimento');
  if (vazio(r.contratante_nacionalidade)) p.push('Contratante: Nacionalidade');
  if (vazio(r.contratante_email)) p.push('Contratante: E-mail');
  if (vazio(r.contratante_telefone)) p.push('Contratante: Telefone');
  if (vazio(r.contratante_endereco) || vazio(r.contratante_cidade)) p.push('Contratante: Endereço completo');

  if (vazio(r.llc_nome_opcao1)) p.push('LLC: 1ª opção de nome');
  if (vazio(r.llc_nome_opcao2)) p.push('LLC: 2ª opção de nome');
  if (vazio(r.llc_atividade)) p.push('LLC: Atividade da empresa');
  if (vazio(r.llc_proposito)) p.push('LLC: Propósito da estrutura');
  if (vazio(r.llc_tipo_membros)) p.push('LLC: Sócio único ou vários sócios');
  if (r.llc_tipo_membros === 'multi') {
    const membros = (r.llc_membros || []).filter((m: any) => !vazio(m.nome));
    if (membros.length < 2) p.push('LLC: Informar ao menos 2 sócios');
    const soma = membros.reduce((s: number, m: any) => s + (Number(m.percentual) || 0), 0);
    if (membros.length >= 2 && Math.abs(soma - 100) > 0.01) p.push('LLC: Participação dos sócios deve somar 100%');
  }
  if (vazio(r.llc_gestor)) p.push('LLC: Quem será o gestor (manager)');
  if (r.llc_gestor === 'outro' && vazio(r.llc_gestor_nome)) p.push('LLC: Nome do gestor');
  if (vazio(r.socio_pj)) p.push('LLC: Informar se alguma empresa será sócia');
  if (r.socio_pj === 'sim') {
    if (vazio(r.socio_pj_razao_social)) p.push('Empresa sócia: Razão social');
    if (vazio(r.socio_pj_cnpj)) p.push('Empresa sócia: CNPJ');
  }

  if (vazio(r.perfil_movimentacao_prevista)) p.push('Perfil: Movimentação prevista');
  if (vazio(r.perfil_paises)) p.push('Perfil: Países de operação');
  if (vazio(r.perfil_pep)) p.push('Perfil: Pessoa politicamente exposta (PEP)');

  if (!r.declaracao_veracidade) p.push('Declarações: Confirmar veracidade das informações');
  if (!r.autorizacao_lgpd) p.push('Declarações: Autorizar uso dos dados (LGPD)');

  for (const d of mergeDocs(r, r.documentos)) {
    if (d.obrigatorio && !d.recebido) p.push('Documento: ' + d.descricao);
  }
  return p;
}
