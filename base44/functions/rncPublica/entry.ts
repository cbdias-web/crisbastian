import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

function sanitizeRnc(rnc: any) {
  return {
    id: rnc.id,
    tipo_canal: rnc.tipo_canal,
    operar_acima_270k: rnc.operar_acima_270k,
    nome: rnc.nome,
    cpf_cnpj: rnc.cpf_cnpj,
    rg_ie: rnc.rg_ie,
    nascimento_fundacao: rnc.nascimento_fundacao,
    nacionalidade: rnc.nacionalidade,
    profissao_natureza: rnc.profissao_natureza,
    estado_civil: rnc.estado_civil,
    dupla_nacionalidade: rnc.dupla_nacionalidade,
    media_salarial: rnc.media_salarial,
    quantidade_funcionarios: rnc.quantidade_funcionarios,
    email: rnc.email,
    telefone: rnc.telefone,
    cep: rnc.cep,
    endereco: rnc.endereco,
    bairro: rnc.bairro,
    cidade: rnc.cidade,
    estado: rnc.estado,
    documentos: (rnc.documentos || []).map((d: any) => ({
      tipo: d.tipo, descricao: d.descricao, obrigatorio: d.obrigatorio,
      recebido: d.recebido, nome_arquivo: d.nome_arquivo,
    })),
    socios: (rnc.socios || []).map((s: any) => ({
      nome: s.nome, cpf: s.cpf,
      documento_url: !!s.documento_url, documento_nome: s.documento_nome,
      comprovante_url: !!s.comprovante_url, comprovante_nome: s.comprovante_nome,
    })),
    observacoes: rnc.observacoes,
  };
}

function calcularPendencias(rnc: any) {
  const pendencias: string[] = [];
  const isPJ = rnc.tipo_canal === 'PJ';

  const camposComuns = ['nome','cpf_cnpj','rg_ie','nascimento_fundacao','nacionalidade','profissao_natureza','email','telefone','cep','endereco','bairro','cidade','estado'];
  const camposPF = [...camposComuns, 'estado_civil', 'media_salarial'];
  const camposPJ = [...camposComuns, 'quantidade_funcionarios'];

  const obrigatorios = isPJ ? camposPJ : camposPF;
  const labelsBase: Record<string, string> = {
    nome: 'Nome Completo', cpf_cnpj: 'CPF/CNPJ', rg_ie: 'RG / Inscricao Estadual',
    nascimento_fundacao: 'Data de Nascimento / Fundacao', nacionalidade: 'Nacionalidade',
    profissao_natureza: 'Profissao / Natureza Juridica', email: 'E-mail', telefone: 'Telefone',
    cep: 'CEP', endereco: 'Endereco', bairro: 'Bairro', cidade: 'Cidade', estado: 'Estado (UF)',
  };
  const labels: Record<string, string> = isPJ
    ? { ...labelsBase, nome: 'Razao Social', cpf_cnpj: 'CNPJ', rg_ie: 'Inscricao Estadual', nascimento_fundacao: 'Data de Fundacao', profissao_natureza: 'Natureza Juridica', quantidade_funcionarios: 'Quantidade de Funcionarios' }
    : { ...labelsBase, nome: 'Nome Completo', cpf_cnpj: 'CPF', rg_ie: 'RG', nascimento_fundacao: 'Data de Nascimento', profissao_natureza: 'Profissao', estado_civil: 'Estado Civil', media_salarial: 'Media Salarial' };

  for (const c of obrigatorios) {
    const v = (rnc as any)[c];
    if (v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))) {
      pendencias.push('Dados: ' + (labels[c] || c));
    }
  }

  if (!isPJ && !rnc.dupla_nacionalidade) {
    pendencias.push('Dados: Confirmar dupla nacionalidade');
  }

  const docs = rnc.documentos || [];
  for (const d of docs) {
    if (d.obrigatorio && !d.recebido) {
      pendencias.push('Documento: ' + d.descricao);
    }
  }

  if (isPJ) {
    const socios = rnc.socios || [];
    if (socios.length === 0) {
      pendencias.push('Socios: Informar ao menos 1 socio/administrador');
    } else {
      socios.forEach((s: any, i: number) => {
        if (!s.nome || !s.cpf) pendencias.push(`Socio ${i+1}: Nome e CPF`);
        if (!s.documento_url) pendencias.push(`Socio ${i+1}: Documento de identificacao`);
        if (!s.comprovante_url) pendencias.push(`Socio ${i+1}: Comprovante de endereco`);
      });
    }
  }

  return pendencias;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, token } = body;

    if (!token) return Response.json({ error: 'Token obrigatorio' }, { status: 400 });

    const rncs = await base44.asServiceRole.entities.RncCanalBancario.filter({ link_token: token });
    if (rncs.length === 0) return Response.json({ error: 'Link invalido ou expirado' }, { status: 404 });
    const rnc = rncs[0];

    if (action === 'buscar') {
      return Response.json({ rnc: sanitizeRnc(rnc), pendencias: calcularPendencias(rnc) });
    }

    if (action === 'salvar') {
      const dados = body.dados || {};
      const updateData: any = { ...dados };

      // Converter campos numericos
      if (updateData.media_salarial !== undefined) {
        updateData.media_salarial = updateData.media_salarial ? Number(updateData.media_salarial) : null;
      }
      if (updateData.quantidade_funcionarios !== undefined) {
        updateData.quantidade_funcionarios = updateData.quantidade_funcionarios ? Number(updateData.quantidade_funcionarios) : null;
      }

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
            } catch (e) {
              // ignora erro individual
            }
          }
        }
        updateData.documentos = documentos;
      }

      // Upload de documentos de socios (PJ)
      const socioUploads = body.socio_uploads || [];
      if (socioUploads.length > 0 && rnc.tipo_canal === 'PJ') {
        const socios = [...(rnc.socios || [])];
        for (const su of socioUploads) {
          if (su.socio_index < 0 || su.socio_index >= socios.length) continue;
          try {
            const binary = atob(su.base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const blob = new Blob([bytes], { type: su.mime || 'application/octet-stream' });
            const file = new File([blob], su.nome, { type: su.mime || 'application/octet-stream' });
            const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });
            if (su.campo === 'documento') {
              socios[su.socio_index] = { ...socios[su.socio_index], documento_url: file_url, documento_nome: su.nome };
            } else {
              socios[su.socio_index] = { ...socios[su.socio_index], comprovante_url: file_url, comprovante_nome: su.nome };
            }
          } catch (e) {}
        }
        updateData.socios = socios;
      }

      // Atualizar dados de socios (nome/cpf) se enviados
      if (dados.socios_dados && rnc.tipo_canal === 'PJ') {
        const socios = [...(rnc.socios || [])];
        for (const sd of dados.socios_dados) {
          if (sd.index >= 0 && sd.index < socios.length) {
            socios[sd.index] = { ...socios[sd.index], nome: sd.nome, cpf: sd.cpf };
          }
        }
        updateData.socios = socios;
        delete updateData.socios_dados;
      }

      updateData.link_preenchido_em = new Date().toISOString();
      if (!updateData.data_preenchimento) updateData.data_preenchimento = new Date().toISOString();

      await base44.asServiceRole.entities.RncCanalBancario.update(rnc.id, updateData);
      const updated = await base44.asServiceRole.entities.RncCanalBancario.get(rnc.id);
      return Response.json({
        rnc: sanitizeRnc(updated),
        pendencias: calcularPendencias(updated),
        pendencias_restantes: calcularPendencias(updated).length,
      });
    }

    return Response.json({ error: 'Acao invalida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}