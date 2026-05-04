import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';

const PDF_URLS = {
  'CONTA GLOBAL': 'https://base44.app/api/apps/698a1739c50002e4d14fa547/files/mp/public/698a1739c50002e4d14fa547/440bfe20e_Contrato-ContaGlobal.pdf',
  'CONTA INTERNACIONAL': 'https://base44.app/api/apps/698a1739c50002e4d14fa547/files/mp/public/698a1739c50002e4d14fa547/f9b7f91fb_Contrato-ContaInternacional.pdf',
  'DOLARIZE': 'https://base44.app/api/apps/698a1739c50002e4d14fa547/files/mp/public/698a1739c50002e4d14fa547/bd9fb551e_ContratoDolarizeAqui.pdf',
  'DOLARIZE AQUI': 'https://base44.app/api/apps/698a1739c50002e4d14fa547/files/mp/public/698a1739c50002e4d14fa547/bd9fb551e_ContratoDolarizeAqui.pdf',
  // ROF e CANAL BANCÁRIO usam geração por texto (sem template PDF externo)
  'ROF': null,
  'CANAL BANCÁRIO': null,
};

const MESES_PT = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function fmtVal(v) {
  // Sempre retorna valor formatado, mesmo zero
  return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  // Pula apenas undefined/null — zero e string vazia são válidos
  if (valor === undefined || valor === null) return;
  const str = String(valor);
  try {
    const field = form.getTextField(nome);
    field.setText(str);
  } catch (_) {
    // campo não existe ou tipo incompatível, ignorar silenciosamente
  }
}

// Lista todos os campos do PDF para debug
function listarCampos(form) {
  return form.getFields().map(f => f.getName());
}

// Campos comuns a todos os contratos (nomes exatos dos AcroFields verificados via diagnóstico)
function camposComuns(contrato, dia, mesNome, ano) {
  return {
    'RAZ\u00c3O SOCIAL': contrato.nome || '',
    'E-MAIL': contrato.email || '',
    'NOME RESPONS\u00c1VEL': contrato.responsavel_legal || '',
    'CPF/CNPJ': contrato.cpf_cnpj || '',
    'CPF': contrato.cpf_responsavel || '',
    'ENDERE\u00c7O': contrato.endereco || '',
    'MUNIC\u00cdPIO': contrato.cidade || '',
    'BAIRRO': contrato.bairro || '',
    'UF': contrato.estado || '',
    'CEP': contrato.cep || '',
    'DDD': extrairDDD(contrato.telefone),
    'TELEFONE': extrairTelefone(contrato.telefone),
    'DIIA': dia,
    'MES': mesNome,
    'ANO': ano,
  };
}

// Mapeamento por tipo de contrato — campos EXATOS confirmados via diagnóstico dos AcroFields
function mapearCampos(contrato) {
  const data = contrato.data_contrato ? new Date(contrato.data_contrato + 'T00:00:00') : new Date();
  const dia = String(data.getDate()).padStart(2, '0');
  const mesNome = MESES_PT[data.getMonth()];
  const ano = String(data.getFullYear());

  const numParcelas = Math.round(contrato.num_parcelas || 0);
  const valorParcela = numParcelas > 0 ? fmtVal(contrato.valor_parcela || 0) : '0,00';
  const diaVenc = contrato.dia_vencimento ? String(Math.round(contrato.dia_vencimento)) : '';

  const base = camposComuns(contrato, dia, mesNome, ano);

  if (contrato.tipo === 'CONTA GLOBAL') {
    // Campos financeiros confirmados: VALOR DA ADESÃO, VALOR DA MENSALIDADE, PAGAMENTO TODO DIA
    return {
      ...base,
      'VALOR DA ADES\u00c3O': fmtVal(contrato.valor_total || 0),
      'VALOR DA MENSALIDADE': valorParcela,
      'PAGAMENTO TODO DIA': diaVenc,
    };
  }

  if (contrato.tipo === 'CONTA INTERNACIONAL') {
    // Se não há entrada separada (valor_adesao = 0), a entrada = valor total
    const entradaInt = (contrato.valor_adesao && contrato.valor_adesao > 0)
      ? contrato.valor_adesao
      : contrato.valor_total || 0;
    return {
      ...base,
      'VALOR TOTAL DA ADESAO': fmtVal(contrato.valor_total || 0),
      'VALOR DA ENTRADA': fmtVal(entradaInt),
      'VALOR PARCELAS': valorParcela,
      'VALOR DA MENSALIDADE': valorParcela,
      'TOD DIA': diaVenc,
    };
  }

  if (contrato.tipo === 'DOLARIZE' || contrato.tipo === 'DOLARIZE AQUI') {
    // Campos financeiros confirmados via diagnóstico:
    // VALOR DA ADESÃO (= total), numero de parcelas, PAGAMENTO TODO DIA, Data1_af_date
    // Não há campo de valor de parcela neste PDF
    return {
      ...base,
      'VALOR DA ADES\u00c3O': fmtVal(contrato.valor_total || 0),
      'numero de parcelas': numParcelas > 0 ? String(numParcelas) : '',
      'PAGAMENTO TODO DIA': diaVenc,
      'Data1_af_date': contrato.data_primeiro_pagamento ? fmtDate(contrato.data_primeiro_pagamento) : '',
      'MOEDA': contrato.moeda || 'USD',
      'PRAZO': contrato.prazo_meses ? String(contrato.prazo_meses) : '',
    };
  }

  // Fallback genérico
  return base;
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
    
    // ROF e CANAL BANCÁRIO: gerar PDF textual (sem template AcroForm)
    if (pdfUrl === null) {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont('Helvetica');
      const fontBold = await pdfDoc.embedFont('Helvetica-Bold');
      
      const data = contrato;
      const dataContrato = data.data_contrato ? new Date(data.data_contrato + 'T00:00:00') : new Date();
      const diaStr = String(dataContrato.getDate()).padStart(2, '0');
      const mesStr = MESES_PT[dataContrato.getMonth()];
      const anoStr = String(dataContrato.getFullYear());
      
      let y = height - 60;
      const drawText = (text, x, yPos, size = 10, bold = false) => {
        page.drawText(String(text || ''), { x, y: yPos, size, font: bold ? fontBold : font, color: { type: 'RGB', red: 0, green: 0, blue: 0 } });
      };
      const line = (label, value, yPos) => {
        drawText(label + ':', 50, yPos, 9, true);
        drawText(value || '—', 200, yPos, 9);
      };
      
      drawText(`CONTRATO — ${data.tipo}`, 50, y, 16, true); y -= 30;
      drawText(`${diaStr} de ${mesStr} de ${anoStr}`, 50, y, 10); y -= 30;
      
      drawText('DADOS DO CONTRATANTE', 50, y, 11, true); y -= 18;
      line('Nome / Razão Social', data.nome, y); y -= 16;
      line('CPF / CNPJ', data.cpf_cnpj, y); y -= 16;
      line('Responsável Legal', data.responsavel_legal, y); y -= 16;
      line('CPF Responsável', data.cpf_responsavel, y); y -= 16;
      line('Nascimento', data.nascimento ? new Date(data.nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : '', y); y -= 16;
      line('Profissão', data.profissao, y); y -= 16;
      line('Estado Civil', data.estado_civil, y); y -= 16;
      line('Nacionalidade', data.nacionalidade, y); y -= 16;
      line('E-mail', data.email, y); y -= 16;
      line('Telefone', data.telefone, y); y -= 24;
      
      drawText('ENDEREÇO', 50, y, 11, true); y -= 18;
      line('Endereço', data.endereco, y); y -= 16;
      line('Bairro', data.bairro, y); y -= 16;
      line('Cidade / Estado', `${data.cidade || ''} / ${data.estado || ''}`, y); y -= 16;
      line('CEP', data.cep, y); y -= 24;
      
      drawText('DADOS FINANCEIROS', 50, y, 11, true); y -= 18;
      line('Valor Total', `R$ ${fmtVal(data.valor_total)}`, y); y -= 16;
      line('Valor de Entrada', `R$ ${fmtVal(data.valor_adesao || data.valor_total)}`, y); y -= 16;
      if ((data.num_parcelas || 0) > 0) {
        line('Nº de Parcelas', `${data.num_parcelas}x`, y); y -= 16;
        line('Valor da Parcela', `R$ ${fmtVal(data.valor_parcela)}`, y); y -= 16;
      }
      line('Forma de Pagamento', data.forma_pagamento, y); y -= 16;
      if (data.dia_vencimento) { line('Dia de Vencimento', `Dia ${data.dia_vencimento}`, y); y -= 16; }
      if (data.data_primeiro_pagamento) { line('1º Pagamento', new Date(data.data_primeiro_pagamento + 'T00:00:00').toLocaleDateString('pt-BR'), y); y -= 16; }
      if (data.prazo_meses) { line('Prazo', `${data.prazo_meses} meses`, y); y -= 16; }
      if (data.moeda && data.valor_em_moeda) {
        line('Moeda', data.moeda, y); y -= 16;
        line('Cotação', data.cotacao ? `R$ ${Number(data.cotacao).toFixed(4)}` : '', y); y -= 16;
        line(`Valor em ${data.moeda}`, `${data.moeda} ${Number(data.valor_em_moeda).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, y); y -= 16;
      }
      
      if (data.observacoes) {
        y -= 8;
        drawText('OBSERVAÇÕES', 50, y, 11, true); y -= 18;
        // Quebrar texto longo
        const obs = data.observacoes;
        const maxChars = 80;
        for (let i = 0; i < obs.length; i += maxChars) {
          drawText(obs.slice(i, i + maxChars), 50, y, 9); y -= 14;
        }
      }
      
      // Assinaturas
      y -= 30;
      drawText('_________________________________', 50, y, 10);
      drawText('_________________________________', 320, y, 10);
      y -= 14;
      drawText('Contratante', 50, y, 9);
      drawText('Villela Exchange', 320, y, 9);
      
      const pdfPreenchido = await pdfDoc.save();
      const uint8 = new Uint8Array(pdfPreenchido);
      let base64 = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8.length; i += chunkSize) {
        base64 += String.fromCharCode(...uint8.slice(i, i + chunkSize));
      }
      base64 = btoa(base64);
      const nomeArq = `contrato_${data.tipo.replace(/ /g, '_')}.pdf`;
      return Response.json({ pdf_base64: base64, filename: nomeArq, tipo: data.tipo });
    }

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