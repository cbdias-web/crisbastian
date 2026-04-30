import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';

const PDF_URLS = {
  'CONTA GLOBAL': 'https://base44.app/api/apps/698a1739c50002e4d14fa547/files/mp/public/698a1739c50002e4d14fa547/440bfe20e_Contrato-ContaGlobal.pdf',
  'CONTA INTERNACIONAL': 'https://base44.app/api/apps/698a1739c50002e4d14fa547/files/mp/public/698a1739c50002e4d14fa547/f9b7f91fb_Contrato-ContaInternacional.pdf',
  'DOLARIZE': 'https://base44.app/api/apps/698a1739c50002e4d14fa547/files/mp/public/698a1739c50002e4d14fa547/bd9fb551e_ContratoDolarizeAqui.pdf',
  'DOLARIZE AQUI': 'https://base44.app/api/apps/698a1739c50002e4d14fa547/files/mp/public/698a1739c50002e4d14fa547/bd9fb551e_ContratoDolarizeAqui.pdf',
};

const MESES_PT = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

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
  if (!valor) return;
  try {
    const field = form.getTextField(nome);
    field.setText(String(valor));
  } catch (e) {
    // Pode ser campo de data ou outro tipo — tenta como texto genérico
    try {
      const field = form.getField(nome);
      if (field && field.setText) field.setText(String(valor));
    } catch (_) {
      // campo não existe ou tipo incompatível, ignorar
    }
  }
}

// Lista todos os campos do PDF para debug
function listarCampos(form) {
  return form.getFields().map(f => f.getName());
}

// Mapeamento dos campos do formulário para os AcroFields de cada contrato
function mapearCampos(contrato) {
  const data = contrato.data_contrato ? new Date(contrato.data_contrato + 'T00:00:00') : new Date();
  const dia = String(data.getDate()).padStart(2, '0');
  const mesNum = data.getMonth(); // 0-indexed
  const mesNome = MESES_PT[mesNum]; // por extenso: "abril"
  const ano = String(data.getFullYear());

  // Data de pagamento separada em dia/mês/ano
  let diaPagamento = '', mesPagamento = '', anoPagamento = '';
  if (contrato.data_primeiro_pagamento) {
    const dp = new Date(contrato.data_primeiro_pagamento + 'T00:00:00');
    diaPagamento = String(dp.getDate()).padStart(2, '0');
    mesPagamento = String(dp.getMonth() + 1).padStart(2, '0');
    anoPagamento = String(dp.getFullYear());
  }

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
    'MUNIC\u00cdPIO': contrato.cidade || '',
    'UF': contrato.estado || '',
    'CEP': contrato.cep || '',

    // Telefone
    'DDD': extrairDDD(contrato.telefone),
    'TELEFONE': extrairTelefone(contrato.telefone),

    // Financeiro
    'VALOR DA ADESÃO': contrato.valor_adesao ? `R$ ${fmtVal(contrato.valor_adesao)}` : '',
    // Conta Internacional usa "VALOR DA ENTRADA" no lugar de adesão
    'VALOR DA ENTRADA': contrato.valor_adesao ? `R$ ${fmtVal(contrato.valor_adesao)}` : '',
    'VALOR DA PARCELA': contrato.valor_parcela ? `R$ ${fmtVal(contrato.valor_parcela)}` : '',
    'VALOR DA MENSALIDADE': contrato.valor_parcela ? `R$ ${fmtVal(contrato.valor_parcela)}` : '',
    'VALOR MENSALIDADE': contrato.valor_parcela ? `R$ ${fmtVal(contrato.valor_parcela)}` : '',
    // Nomes exatos dos campos de parcelas em cada PDF
    'Nº PARCELAS DA ADESÃO': contrato.num_parcelas ? String(contrato.num_parcelas) : '',
    'numero de parcelas': contrato.num_parcelas ? String(contrato.num_parcelas) : '', // Dolarize Aqui
    'PARCELAS': contrato.num_parcelas ? String(contrato.num_parcelas) : '',
    'PAGAMENTO TODO DIA': contrato.dia_vencimento ? String(contrato.dia_vencimento) : '',
    // DATA DE PAGAMENTO como data completa
    'DATA DE PAGAMENTO': contrato.data_primeiro_pagamento ? fmtDate(contrato.data_primeiro_pagamento) : '',
    // Campo Data1_af_date (Dolarize Aqui) — campo de data Adobe, formato DD/MM/YYYY
    'Data1_af_date': contrato.data_primeiro_pagamento ? fmtDate(contrato.data_primeiro_pagamento) : '',
    'DIA PAGAMENTO': diaPagamento,
    'MES PAGAMENTO': mesPagamento,
    'ANO PAGAMENTO': anoPagamento,
    'DIA': contrato.dia_vencimento ? String(contrato.dia_vencimento) : '',

    // Moeda (para Dolarize/Internacional)
    'MOEDA': contrato.moeda || 'USD',
    'COTAÇÃO': contrato.cotacao ? fmtVal(contrato.cotacao) : '',
    'VALOR EM MOEDA': contrato.valor_em_moeda ? fmtVal(contrato.valor_em_moeda) : '',
    'PRAZO': contrato.prazo_meses ? String(contrato.prazo_meses) : '',

    // Data do contrato — MES por extenso ("abril")
    'DIIA': dia,
    'MES': mesNome,
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

    // Log dos campos disponíveis neste PDF para debug
    const camposDisponiveis = listarCampos(form);
    console.log(`[PDF ${contrato.tipo}] Campos disponíveis:`, JSON.stringify(camposDisponiveis));

    const campos = mapearCampos(contrato);
    for (const [nome, valor] of Object.entries(campos)) {
      preencherCampo(form, nome, valor);
    }

    // Salvar cliente na carteira vinculado ao gerente (se ainda não existir)
    if (contrato.nome && contrato.cpf_cnpj) {
      try {
        const clientesExistentes = await base44.asServiceRole.entities.Cliente.filter({ cpf_cnpj: contrato.cpf_cnpj });
        if (clientesExistentes.length === 0) {
          await base44.asServiceRole.entities.Cliente.create({
            nome: contrato.nome,
            cpf_cnpj: contrato.cpf_cnpj,
            email: contrato.email || '',
            telefone: contrato.telefone || '',
            cidade: contrato.cidade || '',
            estado: contrato.estado || '',
            vendedor_id: contrato.vendedor_id || '',
            vendedor_nome: contrato.vendedor_nome || '',
            observacao: `Cliente gerado pelo contrato ${contrato.tipo}.`,
            origem: 'nativo',
          });
          console.log(`[PDF] Cliente "${contrato.nome}" salvo na carteira do gerente "${contrato.vendedor_nome}"`);
        } else {
          console.log(`[PDF] Cliente "${contrato.nome}" já existe na carteira.`);
        }
      } catch (e) {
        console.log(`[PDF] Aviso: não foi possível salvar cliente na carteira: ${e.message}`);
      }
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