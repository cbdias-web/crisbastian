import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const DOC_CONFIG_PF = [
  { tipo: 'passaporte', descricao: 'Passaporte vigente (foto + dados)', obrigatorio: true },
  { tipo: 'comprovante_endereco', descricao: 'Comprovante de endereço (até 90 dias)', obrigatorio: true },
  { tipo: 'irpf', descricao: 'IRPF 2025/2026 ou declaração de isento', obrigatorio: false },
];
const DOC_CONFIG_PJ = [
  { tipo: 'contrato_social', descricao: 'Contrato social / Estatuto e última alteração', obrigatorio: true },
  { tipo: 'passaporte_responsavel', descricao: 'Passaporte do responsável legal', obrigatorio: true },
  { tipo: 'comprovante_endereco_empresa', descricao: 'Comprovante de endereço da empresa (até 90 dias)', obrigatorio: true },
  { tipo: 'dre', descricao: 'DRE (assinado pela empresa + contador)', obrigatorio: false },
  { tipo: 'balanco', descricao: 'Balanço (assinado pela empresa + contador)', obrigatorio: false },
  { tipo: 'faturamento', descricao: 'Faturamento dos últimos 12 meses', obrigatorio: false },
];

// Reconstrói o checklist correto para o tipo, preservando arquivos já enviados.
// Corrige registros PJ antigos salvos com a lista de PF.
function mergeDocs(tipo: string, savedDocs: any[]) {
  const cfg = tipo === 'PJ' ? DOC_CONFIG_PJ : DOC_CONFIG_PF;
  const saved = Array.isArray(savedDocs) ? savedDocs : [];
  return cfg.map(d => {
    const found = saved.find(s => s.tipo === d.tipo);
    return found
      ? { ...d, recebido: !!found.recebido, url: found.url || '', nome_arquivo: found.nome_arquivo || '' }
      : { ...d, recebido: false, url: '', nome_arquivo: '' };
  });
}

function sanitize(rnc: any) {
  return {
    id: rnc.id,
    tipo_conta: rnc.tipo_conta,
    status: rnc.status,
    // Secao 1 — Conta
    secao1_tipo_conta: rnc.secao1_tipo_conta,
    secao1_proposito: rnc.secao1_proposito,
    secao1_deposito_remetente: rnc.secao1_deposito_remetente,
    secao1_deposito_banco: rnc.secao1_deposito_banco,
    secao1_deposito_valor: rnc.secao1_deposito_valor,
    secao1_origem_fundos: rnc.secao1_origem_fundos,
    secao1_bancos_existentes: rnc.secao1_bancos_existentes || [],
    secao1_assinantes: rnc.secao1_assinantes || [],
    secao1_assinatura_tipo: rnc.secao1_assinatura_tipo,
    secao1_talao_cheques: rnc.secao1_talao_cheques,
    secao1_cartao_debito: rnc.secao1_cartao_debito,
    secao1_email: rnc.secao1_email,
    secao1_telefone_escritorio1: rnc.secao1_telefone_escritorio1,
    secao1_telefone_escritorio2: rnc.secao1_telefone_escritorio2,
    secao1_celular: rnc.secao1_celular,
    secao1_endereco_correspondencia: rnc.secao1_endereco_correspondencia,
    // PJ
    secao1_pj_razao_social: rnc.secao1_pj_razao_social,
    secao1_pj_cnpj: rnc.secao1_pj_cnpj,
    secao1_pj_linha_negocios: rnc.secao1_pj_linha_negocios,
    secao1_pj_num_empregados: rnc.secao1_pj_num_empregados,
    secao1_pj_produtos_servicos: rnc.secao1_pj_produtos_servicos,
    secao1_pj_pais_operacao: rnc.secao1_pj_pais_operacao,
    secao1_pj_receita_bruta: rnc.secao1_pj_receita_bruta,
    secao1_pj_prospeccao_receita: rnc.secao1_pj_prospeccao_receita,
    secao1_pj_clientes: rnc.secao1_pj_clientes || [],
    secao1_pj_fornecedores: rnc.secao1_pj_fornecedores || [],
    secao1_pj_acionistas: rnc.secao1_pj_acionistas || [],
    // Secao 2 — Assinantes
    secao2_assinantes: (rnc.secao2_assinantes || []).map((a: any) => ({ ...a })),
    // Secao 3 — Titular PF + Beneficiarios
    secao3_nome: rnc.secao3_nome,
    secao3_cpf: rnc.secao3_cpf,
    secao3_nascimento: rnc.secao3_nascimento,
    secao3_nacionalidade: rnc.secao3_nacionalidade,
    secao3_email: rnc.secao3_email,
    secao3_telefone: rnc.secao3_telefone,
    secao3_passaporte: rnc.secao3_passaporte,
    secao3_beneficiarios: rnc.secao3_beneficiarios || [],
    // Documentos — sempre reconciliados ao checklist correto do tipo
    documentos: mergeDocs(rnc.tipo_conta, rnc.documentos).map((d: any) => ({
      tipo: d.tipo, descricao: d.descricao, obrigatorio: d.obrigatorio,
      recebido: d.recebido, url: d.url, nome_arquivo: d.nome_arquivo,
    })),
    observacoes: rnc.observacoes,
  };
}

function calcularPendencias(rnc: any): string[] {
  const p: string[] = [];
  const isPJ = rnc.tipo_conta === 'PJ';

  if (!isPJ) {
    if (!rnc.secao3_nome?.trim()) p.push('Dados: Nome completo do titular');
    if (!rnc.secao3_cpf?.trim()) p.push('Dados: CPF');
    if (!rnc.secao3_nascimento) p.push('Dados: Data de nascimento');
    if (!rnc.secao3_nacionalidade?.trim()) p.push('Dados: Nacionalidade');
  }

  if (!rnc.secao1_proposito?.trim()) p.push('Conta: Proposito da conta');
  if (!rnc.secao1_deposito_remetente?.trim()) p.push('Conta: Remetente do deposito inicial');
  if (!rnc.secao1_email?.trim()) p.push('Conta: E-mail de contato');
  if (!rnc.secao1_celular?.trim() && !rnc.secao1_telefone_escritorio1?.trim()) p.push('Conta: Telefone de contato');

  if (isPJ) {
    if (!rnc.secao1_pj_razao_social?.trim()) p.push('Empresa: Razao Social');
    if (!rnc.secao1_pj_linha_negocios?.trim()) p.push('Empresa: Linha de negocios');
  }

  const assinantes = rnc.secao2_assinantes || [];
  if (isPJ) {
    if (assinantes.length === 0) {
      p.push('Assinantes: Informar ao menos 1 assinante');
    } else {
      assinantes.forEach((a: any, i: number) => {
        if (!a.nome?.trim()) p.push(`Assinante ${i + 1}: Nome`);
        if (!a.email?.trim()) p.push(`Assinante ${i + 1}: E-mail`);
        if (!a.pais_nascimento?.trim()) p.push(`Assinante ${i + 1}: Pais de nascimento`);
        if (!a.salario_anual_usd?.trim()) p.push(`Assinante ${i + 1}: Salario anual`);
      });
    }
  } else {
    // PF: o titular é o assinante; nome/e-mail vêm da Seção 3. Validar só os campos do novo bloco.
    const a = assinantes[0] || {};
    if (!a.pais_nascimento?.trim()) p.push('Dados: Pais de nascimento');
    if (!a.salario_anual_usd?.trim()) p.push('Dados: Salario anual (USD)');
  }

  const docs = mergeDocs(rnc.tipo_conta, rnc.documentos);
  for (const d of docs) {
    if (d.obrigatorio && !d.recebido) p.push('Documento: ' + d.descricao);
  }

  return p;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, token } = body;

    if (!token) return Response.json({ error: 'Token obrigatorio' }, { status: 400 });

    const rncs = await base44.asServiceRole.entities.RncContaInternacional.filter({ link_token: token });
    if (rncs.length === 0) return Response.json({ error: 'Link invalido ou expirado' }, { status: 404 });
    const rnc = rncs[0];

    if (action === 'buscar') {
      return Response.json({ rnc: sanitize(rnc), pendencias: calcularPendencias(rnc) });
    }

    if (action === 'salvar') {
      const dados = body.dados || {};
      const updateData: any = { ...dados };

      // Upload de documentos (base64)
      const uploads = body.uploads || [];
      if (uploads.length > 0) {
        const documentos = [...(rnc.documentos || [])];
        for (const up of uploads) {
          const idx = documentos.findIndex((d: any) => d.tipo === up.tipo);
          if (idx >= 0) {
            try {
              const binary = atob(up.base64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              const blob = new Blob([bytes], { type: up.mime || 'application/octet-stream' });
              const file = new File([blob], up.nome, { type: up.mime || 'application/octet-stream' });
              const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });
              documentos[idx] = { ...documentos[idx], recebido: true, url: file_url, nome_arquivo: up.nome };
            } catch (e) {}
          }
        }
        updateData.documentos = documentos;
      }

      updateData.link_preenchido_em = new Date().toISOString();
      if (!updateData.data_preenchimento) updateData.data_preenchimento = new Date().toISOString();

      // Formulário completo (sem pendências) sai do rascunho: status 'concluido'
      // para que apareça como recebido no portal (lista de formulários CI).
      const pendenciasNovas = calcularPendencias({ ...rnc, ...updateData });
      if (pendenciasNovas.length === 0 && rnc.status === 'rascunho') {
        updateData.status = 'concluido';
      }

      await base44.asServiceRole.entities.RncContaInternacional.update(rnc.id, updateData);
      const updated = await base44.asServiceRole.entities.RncContaInternacional.get(rnc.id);
      return Response.json({
        rnc: sanitize(updated),
        pendencias: calcularPendencias(updated),
        pendencias_restantes: calcularPendencias(updated).length,
      });
    }

    return Response.json({ error: 'Acao invalida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}