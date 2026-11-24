import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { mergeDocs, calcularPendencias } from '../../shared/offshoreForm.ts';

const MENSAGEM_PADRAO = 'Para darmos início à constituição da sua empresa no exterior (LLC), precisamos de alguns dados e documentos. Preencha o formulário abaixo com atenção — seu progresso fica salvo e você pode voltar pelo mesmo link sempre que precisar. Qualquer dúvida, estou à disposição.';

// Campos que o cliente pode preencher pelo link público (nada administrativo).
const CAMPOS_CLIENTE = [
  'contratante_nome', 'contratante_cpf', 'contratante_rg', 'contratante_nascimento', 'contratante_nacionalidade',
  'contratante_estado_civil', 'contratante_profissao', 'contratante_passaporte', 'contratante_email', 'contratante_telefone',
  'contratante_cep', 'contratante_endereco', 'contratante_bairro', 'contratante_cidade', 'contratante_estado',
  'llc_nome_opcao1', 'llc_nome_opcao2', 'llc_nome_opcao3', 'llc_atividade', 'llc_proposito',
  'llc_tipo_membros', 'llc_membros', 'llc_gestor', 'llc_gestor_nome',
  'socio_pj', 'socio_pj_razao_social', 'socio_pj_cnpj',
  'perfil_movimentacao_prevista', 'perfil_paises', 'perfil_pep', 'perfil_pep_detalhe',
  'declaracao_veracidade', 'autorizacao_lgpd',
];

function sanitize(r: any) {
  const out: any = {
    id: r.id,
    status: r.status,
    cliente_nome: (r.cliente_nome || '').trim() || r.contratante_nome || '',
    mensagem_cliente: (r.mensagem_cliente || '').trim() || MENSAGEM_PADRAO,
    responsavel_nome: r.responsavel_nome,
  };
  for (const k of CAMPOS_CLIENTE) out[k] = r[k];
  out.llc_membros = r.llc_membros || [];
  out.documentos = mergeDocs(r, r.documentos).map((d: any) => ({
    tipo: d.tipo, descricao: d.descricao, obrigatorio: d.obrigatorio,
    recebido: d.recebido, url: d.url ? 'enviado' : '', nome_arquivo: d.nome_arquivo,
  }));
  return out;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, token } = body;
    if (!token) return Response.json({ error: 'Token obrigatorio' }, { status: 400 });

    const rs = await base44.asServiceRole.entities.RncOffshore.filter({ link_token: token });
    if (rs.length === 0) return Response.json({ error: 'Link invalido ou expirado' }, { status: 404 });
    const rnc = rs[0];

    if (action === 'buscar') {
      return Response.json({ rnc: sanitize(rnc), pendencias: calcularPendencias(rnc) });
    }

    if (action === 'salvar') {
      const dados = body.dados || {};
      const updateData: any = {};
      for (const k of CAMPOS_CLIENTE) if (k in dados) updateData[k] = dados[k];
      if ((dados.declaracao_veracidade && dados.autorizacao_lgpd) && !rnc.declaracoes_aceitas_em) {
        updateData.declaracoes_aceitas_em = new Date().toISOString();
      }

      const merged = { ...rnc, ...updateData };
      // Checklist sempre reconciliado com as respostas atuais (sócios / empresa sócia)
      const documentos = mergeDocs(merged, rnc.documentos);

      const uploads = body.uploads || [];
      const uploadsFalhos: string[] = [];
      for (const up of uploads) {
        const idx = documentos.findIndex((d: any) => d.tipo === up.tipo);
        if (idx < 0) { uploadsFalhos.push(up.nome || up.tipo); continue; }
        try {
          const binary = atob(up.base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const file = new File([new Blob([bytes], { type: up.mime || 'application/octet-stream' })], up.nome, { type: up.mime || 'application/octet-stream' });
          const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });
          documentos[idx] = { ...documentos[idx], recebido: true, url: file_url, nome_arquivo: up.nome };
        } catch (_e) {
          uploadsFalhos.push(up.nome || up.tipo);
        }
      }
      updateData.documentos = documentos;
      updateData.link_preenchido_em = new Date().toISOString();
      if (!rnc.data_preenchimento) updateData.data_preenchimento = new Date().toISOString();
      if (!rnc.preenchido_por) updateData.preenchido_por = 'Cliente (link público)';

      if (calcularPendencias({ ...merged, documentos }).length === 0 && (rnc.status || 'rascunho') === 'rascunho') {
        updateData.status = 'concluido';
      }

      await base44.asServiceRole.entities.RncOffshore.update(rnc.id, updateData);
      const updated = await base44.asServiceRole.entities.RncOffshore.get(rnc.id);
      const pend = calcularPendencias(updated);
      return Response.json({ rnc: sanitize(updated), pendencias: pend, pendencias_restantes: pend.length, uploads_falhos: uploadsFalhos });
    }

    return Response.json({ error: 'Acao invalida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
