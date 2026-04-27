import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';

const PDF_URLS = {
  'CONTA GLOBAL': 'https://base44.app/api/apps/698a1739c50002e4d14fa547/files/mp/public/698a1739c50002e4d14fa547/440bfe20e_Contrato-ContaGlobal.pdf',
  'CONTA INTERNACIONAL': 'https://base44.app/api/apps/698a1739c50002e4d14fa547/files/mp/public/698a1739c50002e4d14fa547/f9b7f91fb_Contrato-ContaInternacional.pdf',
  'DOLARIZE AQUI': 'https://base44.app/api/apps/698a1739c50002e4d14fa547/files/mp/public/698a1739c50002e4d14fa547/bd9fb551e_ContratoDolarizeAqui.pdf',
};

function fmtVal(v) {
  if (!v) return '';
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('pt-BR');
}

function extrairDDD(telefone) {
  if (!telefone) return '';
  const nums = telefone.replace(/\D/g, '');
  return nums.substring(0, 2);
}

function extrairTelefone(telefone) {
  if (!telefone) return '';
  const nums = telefone.replace(/\D/g, '');
  return nums.substring(2);
}

function preencherCampo(form, nome, valor) {
  try {
    const field = form.getTextField(nome);
    field.setText(String(valor || ''));
  } catch (e) {
    // campo não existe neste PDF, ignorar
  }
}

// Mapeamento dos campos do formulário para os AcroFields de cada contrato
function mapearCampos(contrato) {
  const data = contrato.data_contrato ? new Date(contrato.data_contrato + 'T00:00:00') : new Date();
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = String(data.getFullYear());

  return {
    // Dados pessoais
    'RAZÃO SOCIAL': contrato.nome || '',
    'E-MAIL': contrato.email || '',
    'NOME RESPONSÁVEL': contrato.responsavel_legal || '',
    'CPF/CNPJ': contrato.cpf_cnpj || '',
    'CPF': contrato.cpf_responsavel || '',

    // Endereço
    'ENDEREÇO': contrato.endereco || '',
    'BAIRRO': contrato.bairro || '',
    'MUNICÍPIO': contrato.cidade || '',
    'UF': contrato.estado || '',
    'CEP': contrato.cep || '',

    // Telefone
    'DDD': extrairDDD(contrato.telefone),
    'TELEFONE': extrairTelefone(contrato.telefone),

    // Financeiro
    'VALOR DA ADESÃO': contrato.valor_adesao ? `R$ ${fmtVal(contrato.valor_adesao)}` : '',
    'VALOR DA MENSALIDADE': contrato.valor_parcela ? `R$ ${fmtVal(contrato.valor_parcela)}` : '',
    'VALOR MENSALIDADE': contrato.valor_parcela ? `R$ ${fmtVal(contrato.valor_parcela)}` : '',
    'Nº PARCELAS DA ADESÃO': contrato.num_parcelas ? String(contrato.num_parcelas) : '',
    'PARCELAS': contrato.num_parcelas ? String(contrato.num_parcelas) : '',
    'PAGAMENTO TODO DIA': contrato.dia_vencimento ? String(contrato.dia_vencimento) : '',
    'DATA DE PAGAMENTO': contrato.data_primeiro_pagamento ? fmtDate(contrato.data_primeiro_pagamento) : '',
    'DIA': contrato.dia_vencimento ? String(contrato.dia_vencimento) : '',

    // Moeda (para Dolarize/Internacional)
    'MOEDA': contrato.moeda || 'USD',
    'COTAÇÃO': contrato.cotacao ? fmtVal(contrato.cotacao) : '',
    'VALOR EM MOEDA': contrato.valor_em_moeda ? fmtVal(contrato.valor_em_moeda) : '',
    'PRAZO': contrato.prazo_meses ? String(contrato.prazo_meses) : '',

    // Data do contrato
    'DIIA': dia,
    'MES': mes,
    'ANO': ano,
    'DATA': fmtDate(contrato.data_contrato || new Date().toISOString().split('T')[0]),

    // Forma de pagamento
    'FORMA DE PAGAMENTO': contrato.forma_pagamento || '',

    // Banco
    'BANCO': contrato.banco || '',
    'AGÊNCIA': contrato.agencia || '',
    'CONTA': contrato.conta || '',
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { contrato_id } = body;

    if (!contrato_id) return Response.json({ error: 'contrato_id obrigatório' }, { status: 400 });

    // Buscar contrato
    const contrato = await base44.entities.Contrato.get(contrato_id);
    if (!contrato) return Response.json({ error: 'Contrato não encontrado' }, { status: 404 });

    const pdfUrl = PDF_URLS[contrato.tipo];
    if (!pdfUrl) return Response.json({ error: `Tipo de contrato não suportado: ${contrato.tipo}` }, { status: 400 });

    // Baixar o PDF original
    const res = await fetch(pdfUrl);
    if (!res.ok) throw new Error(`Erro ao baixar PDF original: HTTP ${res.status}`);
    const pdfBytes = await res.arrayBuffer();

    // Carregar e preencher
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();

    const campos = mapearCampos(contrato);
    for (const [nome, valor] of Object.entries(campos)) {
      preencherCampo(form, nome, valor);
    }

    // Achatar o formulário para não ser editável
    form.flatten();

    const pdfPreenchido = await pdfDoc.save();
    
    // Converter para base64 para transmissão segura via JSON
    const uint8 = new Uint8Array(pdfPreenchido);
    let base64 = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8.length; i += chunkSize) {
      base64 += String.fromCharCode(...uint8.slice(i, i + chunkSize));
    }
    base64 = btoa(base64);

    const nomeArquivo = `contrato_${contrato.tipo.replace(/ /g, '_')}.pdf`;

    return Response.json({
      pdf_base64: base64,
      filename: nomeArquivo,
      tipo: contrato.tipo,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});