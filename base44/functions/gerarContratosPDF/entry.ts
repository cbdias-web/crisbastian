import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';

const PDF_URLS = {
  'CONTA GLOBAL': 'https://base44.app/api/apps/698a1739c50002e4d14fa547/files/mp/public/698a1739c50002e4d14fa547/440bfe20e_Contrato-ContaGlobal.pdf',
  'CONTA INTERNACIONAL': 'https://base44.app/api/apps/698a1739c50002e4d14fa547/files/mp/public/698a1739c50002e4d14fa547/f9b7f91fb_Contrato-ContaInternacional.pdf',
  'DOLARIZE': 'https://base44.app/api/apps/698a1739c50002e4d14fa547/files/mp/public/698a1739c50002e4d14fa547/bd9fb551e_ContratoDolarizeAqui.pdf',
  'DOLARIZE AQUI': 'https://base44.app/api/apps/698a1739c50002e4d14fa547/files/mp/public/698a1739c50002e4d14fa547/bd9fb551e_ContratoDolarizeAqui.pdf',
  // ROF, CANAL BANCÁRIO, OFFSHORE, GARANTIAS e HORA TÉCNICA usam geração por texto (sem template PDF externo)
  'ROF': null,
  'CANAL BANCÁRIO': null,
  'OFFSHORE': null,
  'GARANTIAS': null,
  'HORA TÉCNICA': null,
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

function numeroParaExtenso(n) {
  const num = Math.abs(Math.round(Number(n) || 0));
  if (num === 0) return 'zero reais';
  const u = ['','um','dois','tr\u00eas','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
  const t = ['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
  const h = ['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];
  function b1k(x) {
    if (!x) return '';
    if (x === 100) return 'cem';
    if (x < 20) return u[x];
    if (x < 100) return t[Math.floor(x/10)] + (x%10 ? ' e '+u[x%10] : '');
    const r = x%100;
    return h[Math.floor(x/100)] + (r ? ' e '+b1k(r) : '');
  }
  if (num < 1000) return b1k(num) + (num === 1 ? ' real' : ' reais');
  if (num < 1000000) {
    const k = Math.floor(num/1000), r = num%1000;
    return (k === 1 ? 'mil' : b1k(k)+' mil') + (r ? ' e '+b1k(r) : '') + ' reais';
  }
  const mi = Math.floor(num/1000000), r = num%1000000;
  return (mi === 1 ? 'um milh\u00e3o' : b1k(mi)+' milh\u00f5es') + (r ? ' e '+b1k(r)+' reais' : ' reais');
}

function wrapText(text, f, size, maxW) {
  const words = String(text||'').split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line+' '+w : w;
    if (f.widthOfTextAtSize(test, size) > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
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
    
    // ROF, CANAL BANCÁRIO, OFFSHORE, GARANTIAS e HORA TÉCNICA: gerar PDF textual (sem template AcroForm)
    if (pdfUrl === null) {

      // ── GARANTIAS: geração completa do zero com logo Village e todo o conteúdo ──
      if (contrato.tipo === 'GARANTIAS') {
        const gDoc = await PDFDocument.create();
        const font     = await gDoc.embedFont('Helvetica');
        const fontBold = await gDoc.embedFont('Helvetica-Bold');
        const fontBoldObl = await gDoc.embedFont('Helvetica-BoldOblique');
        const BLACK  = { type: 'RGB', red: 0,    green: 0,    blue: 0 };
        const WHITE  = { type: 'RGB', red: 1,    green: 1,    blue: 1 };
        const GRAY   = { type: 'RGB', red: 0.45, green: 0.45, blue: 0.45 };
        const DKGRAY = { type: 'RGB', red: 0.25, green: 0.25, blue: 0.25 };
        const RED2   = { type: 'RGB', red: 0.73, green: 0.25, blue: 0.22 };

        const PW = 595, PH = 842, ML = 65, MR = 530, TW = MR - ML;
        const FS = 10, LH = 14.5;

        let page = gDoc.addPage([PW, PH]);
        let y = PH - 48;

        const d = contrato;
        const dataCtrt = d.data_contrato ? new Date(d.data_contrato + 'T00:00:00') : new Date();
        const diaFmt   = `${String(dataCtrt.getDate()).padStart(2,'0')} de ${MESES_PT[dataCtrt.getMonth()]} de ${dataCtrt.getFullYear()}`;
        const tipos    = (d.administracao_debitos || []).join(', ') || '________________';
        const valDiv   = fmtVal(d.valor_divida);
        const valDivExt= numeroParaExtenso(d.valor_divida);
        const mens     = fmtVal(d.mensalidade);
        const diaV     = String(d.dia_vencimento || '____');
        const pct      = String(d.percentual_montante || '____');

        // Helper: próxima linha, com quebra de página automática
        function nextLine(extra = 0) {
          y -= LH + extra;
          if (y < 60) { page = gDoc.addPage([PW, PH]); y = PH - 60; }
        }

        // Desenha texto simples em y atual
        function dt(text, x, sz, f, col = BLACK) {
          if (y < 60) { page = gDoc.addPage([PW, PH]); y = PH - 60; }
          page.drawText(String(text || ''), { x, y, size: sz, font: f, color: col });
        }

        // Padrão para parágrafo: label negrito + texto normal em sequência, com wrap
        function para(label, text, gapAfter = 8) {
          const bW   = label ? fontBold.widthOfTextAtSize(label, FS) : 0;
          const words = (text || '').split(' ');
          let firstLine = '';
          let firstMaxW = TW - bW;
          let splitIdx  = 0;

          for (let i = 0; i < words.length; i++) {
            const test = firstLine ? firstLine + ' ' + words[i] : words[i];
            if (font.widthOfTextAtSize(test, FS) > firstMaxW && firstLine) {
              splitIdx = i; break;
            }
            firstLine = test;
            splitIdx  = i + 1;
          }

          if (label) dt(label, ML, FS, fontBold);
          if (firstLine) dt(firstLine, ML + bW, FS, font);
          nextLine();

          const rest = words.slice(splitIdx).join(' ');
          if (rest) {
            const moreLines = wrapText(rest, font, FS, TW);
            for (const ln of moreLines) { dt(ln, ML, FS, font); nextLine(); }
          }
          y -= gapAfter;
        }

        // Parágrafo inteiramente em negrito
        function paraBold(text, gapAfter = 8) {
          const lines = wrapText(text, fontBold, FS, TW);
          for (const ln of lines) { dt(ln, ML, FS, fontBold); nextLine(); }
          y -= gapAfter;
        }

        // Texto puro com wrap
        function paraText(text, sz = FS, gapAfter = 8) {
          const lines = wrapText(text, font, sz, TW);
          for (const ln of lines) { dt(ln, ML, sz, font); nextLine(); }
          y -= gapAfter;
        }

        // ── LOGO Village Negócios ──
        // Ícone: dois quadrados sobrepostos em vermelho/salmão
        const iconX = ML, iconY = y;
        page.drawRectangle({ x: iconX,    y: iconY-24, width: 22, height: 22, color: RED2 });
        page.drawRectangle({ x: iconX+12, y: iconY-36, width: 16, height: 16, color: WHITE, borderColor: RED2, borderWidth: 1.5 });
        // Texto VILLAGE em escuro
        page.drawText('VILLAGE',  { x: iconX+32, y: iconY-6,  size: 16, font: fontBold, color: DKGRAY });
        page.drawText('NEGÓCIOS', { x: iconX+34, y: iconY-20, size: 8,  font,          color: GRAY   });
        y -= 60;

        // ── TÍTULO ──
        const titulo = 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS';
        const tW = fontBold.widthOfTextAtSize(titulo, 12);
        dt(titulo, (PW - tW) / 2, 12, fontBold);
        // Sublinhado
        page.drawLine({ start: { x: (PW-tW)/2, y: y-1 }, end: { x: (PW-tW)/2+tW, y: y-1 }, thickness: 0.8, color: BLACK });
        y -= 30;

        // ── CONTRATANTE ──
        para('CONTRATANTE: ', (d.nome || '') + (d.cpf_cnpj ? ', inscrito(a) sob CPF/CNPJ nº ' + d.cpf_cnpj : ''), 12);

        // ── CONTRATADA ──
        para('CONTRATADA: ', 'VILLAGE NEGOCIOS IMOBILIARIOS, pessoa jurídica de direito privado, devidamente inscrita no CNPJ nº 30.719.023/0001-11, com sede na Rua Itália, 732, Capão da Canoa/RS.', 18);

        // ── CLÁUSULA PRIMEIRA ──
        para('CLÁUSULA PRIMEIRA: ',
          `O presente contrato tem o único e específico fim de disponibilizar bem imóvel para fins de oferta como garantia e/ou penhora, o que tem a finalidade de gerar proteção patrimonial e/ou possibilitar a composição e administração de débitos (${tipos}) de até R$ (${valDiv}) (${valDivExt}) detidos pela Contratante.`, 10);

        para('Parágrafo primeiro: ',
          'A referida garantia a ser ofertada é de responsabilidade da Contratada, devendo ser por esta substituída sempre que necessário ao bom deslinde do feito e sempre de acordo com os interesses do Contratante.', 10);

        para('Parágrafo segundo: ',
          'Após a notificação, a Contratada emitirá, no prazo máximo de 5 dias úteis, a Certidão de Disponibilização de Garantia, acompanhada da matrícula atualizada do imóvel, laudo de avaliação e demais documentos necessários para a instrução da defesa ou requerimento administrativo.', 10);

        para('Parágrafo terceiro: ',
          'A operacionalidade da garantia inclui o fornecimento de subsídios técnicos para que o corpo jurídico do Contratante possa sustentar a idoneidade do bem oferecido, não incluindo, todavia, a atuação em juízo por advogados da Contratada, salvo contratação específica.', 18);

        // ── CLÁUSULA SEGUNDA ──
        para('CLÁUSULA SEGUNDA – DO PREÇO E DAS CONDIÇÕES DE PAGAMENTO: ',
          `As partes fixam uma mensalidade de R$ (${mens}), a ser paga todo dia (${diaV}) a partir da assinatura deste contrato.`, 10);

        para('Parágrafo primeiro: ',
          `será devida uma parcela adicional de (${pct})% sobre o montante da dívida apontada no OBJETO do presente instrumento quando da efetiva aceitação da garantia em execução judicial, minuta de acordo com o credor, ou qualquer outro procedimento administrativo, o que deverá ser pago em até 5 dias úteis a partir da efetiva aceitação.`, 10);

        para('Parágrafo segundo: ',
          'Entende-se por aceitação de acordo com o parágrafo anterior: o despacho judicial que determine a penhora ou suspensão do feito após oferta do bem, a petição do credor informando aceitação ou pedido de suspensão do feito, e a inclusão da garantia em minutas de acordo entre as partes.', 18);

        // ── CLÁUSULA TERCEIRA ──
        para('CLÁUSULA TERCEIRA – DO PRAZO: ',
          'O presente contrato vigorará pelo prazo indeterminado, a contar da data de sua assinatura, podendo ser rescindido por qualquer das partes mediante notificação prévia de 30 (trinta) dias.', 18);

        // ── CLÁUSULA QUARTA ──
        paraBold('CLÁUSULA QUARTA – DAS OBRIGAÇÕES DA CONTRATADA:', 6);
        paraText('I – Disponibilizar o bem imóvel como garantia nas condições acordadas;', FS, 4);
        paraText('II – Emitir Certidão de Disponibilização de Garantia no prazo estipulado;', FS, 4);
        paraText('III – Manter o imóvel livre de ônus e pendências que comprometam sua utilização como garantia;', FS, 4);
        paraText('IV – Prestar os subsídios técnicos necessários ao corpo jurídico do Contratante.', FS, 18);

        // ── CLÁUSULA QUINTA ──
        paraBold('CLÁUSULA QUINTA – DAS OBRIGAÇÕES DO CONTRATANTE:', 6);
        paraText('I – Efetuar o pagamento da mensalidade na data acordada;', FS, 4);
        paraText('II – Fornecer todos os documentos necessários para a instrução dos procedimentos;', FS, 4);
        paraText('III – Comunicar imediatamente a Contratada sobre quaisquer alterações nos processos relacionados ao objeto deste contrato.', FS, 18);

        // ── CLÁUSULA SEXTA ──
        para('CLÁUSULA SEXTA – DA RESCISÃO: ',
          'O presente contrato poderá ser rescindido por qualquer das partes, mediante notificação prévia e por escrito, com antecedência mínima de 30 (trinta) dias, sem ônus para a parte notificante, desde que não haja pendências financeiras ou processuais em aberto.', 10);

        para('Parágrafo único: ',
          'O inadimplemento de qualquer das cláusulas do presente contrato dará direito à parte prejudicada de rescindi-lo imediatamente, com direito a perdas e danos.', 18);

        // ── CLÁUSULA SÉTIMA ──
        para('CLÁUSULA SÉTIMA – DO FORO: ',
          'As partes elegem o foro da Comarca de Capão da Canoa/RS para dirimir quaisquer controvérsias oriundas do presente contrato, com renúncia a qualquer outro, por mais privilegiado que seja.', 18);

        // ── DATA E ASSINATURA ──
        if (y < 200) { page = gDoc.addPage([PW, PH]); y = PH - 60; }
        para('', `Capão da Canoa/RS, ${diaFmt}.`, 30);

        // Assinaturas
        const sigY = y;
        page.drawLine({ start: { x: ML, y: sigY }, end: { x: ML + 180, y: sigY }, thickness: 0.8, color: BLACK });
        page.drawLine({ start: { x: MR - 180, y: sigY }, end: { x: MR, y: sigY }, thickness: 0.8, color: BLACK });
        y -= 14;
        dt('Contratante', ML + 60, 9, font);
        dt('Contratada', MR - 130, 9, font);
        y -= 18;
        const nomeContratante = wrapText(d.nome || '', font, 9, 180);
        if (nomeContratante.length > 0) dt(nomeContratante[0], ML, 9, font, GRAY);
        dt('Village Negócios Imobiliários', MR - 200, 9, font, GRAY);

        const pdfG = await gDoc.save();
        const u8G  = new Uint8Array(pdfG);
        let b64G   = '';
        for (let i = 0; i < u8G.length; i += 8192) {
          b64G += String.fromCharCode(...u8G.slice(i, i + 8192));
        }
        return Response.json({ pdf_base64: btoa(b64G), filename: 'contrato_GARANTIAS.pdf', tipo: 'GARANTIAS' });
      }

      // Generic fallback for ROF, CANAL BANCÁRIO, OFFSHORE, HORA TÉCNICA
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
        drawText(value || '\u2014', 200, yPos, 9);
      };
      
      drawText(`CONTRATO \u2014 ${data.tipo}`, 50, y, 16, true); y -= 30;
      drawText(`${diaStr} de ${mesStr} de ${anoStr}`, 50, y, 10); y -= 30;
      
      drawText('DADOS DO CONTRATANTE', 50, y, 11, true); y -= 18;
      line('Nome / Raz\u00e3o Social', data.nome, y); y -= 16;
      line('CPF / CNPJ', data.cpf_cnpj, y); y -= 16;
      line('Respons\u00e1vel Legal', data.responsavel_legal, y); y -= 16;
      line('CPF Respons\u00e1vel', data.cpf_responsavel, y); y -= 16;
      line('Nascimento', data.nascimento ? new Date(data.nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : '', y); y -= 16;
      line('Profiss\u00e3o', data.profissao, y); y -= 16;
      line('Estado Civil', data.estado_civil, y); y -= 16;
      line('Nacionalidade', data.nacionalidade, y); y -= 16;
      line('E-mail', data.email, y); y -= 16;
      line('Telefone', data.telefone, y); y -= 24;
      
      drawText('ENDERE\u00c7O', 50, y, 11, true); y -= 18;
      line('Endere\u00e7o', data.endereco, y); y -= 16;
      line('Bairro', data.bairro, y); y -= 16;
      line('Cidade / Estado', `${data.cidade || ''} / ${data.estado || ''}`, y); y -= 16;
      line('CEP', data.cep, y); y -= 24;
      
      drawText('DADOS FINANCEIROS', 50, y, 11, true); y -= 18;
      line('Valor Total', `R$ ${fmtVal(data.valor_total)}`, y); y -= 16;
      line('Valor de Entrada', `R$ ${fmtVal(data.valor_adesao || data.valor_total)}`, y); y -= 16;
      if ((data.num_parcelas || 0) > 0) {
        line('N\u00ba de Parcelas', `${data.num_parcelas}x`, y); y -= 16;
        line('Valor da Parcela', `R$ ${fmtVal(data.valor_parcela)}`, y); y -= 16;
      }
      line('Forma de Pagamento', data.forma_pagamento, y); y -= 16;
      if (data.dia_vencimento) { line('Dia de Vencimento', `Dia ${data.dia_vencimento}`, y); y -= 16; }
      if (data.data_primeiro_pagamento) { line('1\u00ba Pagamento', new Date(data.data_primeiro_pagamento + 'T00:00:00').toLocaleDateString('pt-BR'), y); y -= 16; }
      if (data.prazo_meses) { line('Prazo', `${data.prazo_meses} meses`, y); y -= 16; }
      if (data.moeda && data.valor_em_moeda) {
        line('Moeda', data.moeda, y); y -= 16;
        line('Cota\u00e7\u00e3o', data.cotacao ? `R$ ${Number(data.cotacao).toFixed(4)}` : '', y); y -= 16;
        line(`Valor em ${data.moeda}`, `${data.moeda} ${Number(data.valor_em_moeda).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, y); y -= 16;
      }
      
      if (data.observacoes) {
        y -= 8;
        drawText('OBSERVA\u00c7\u00d5ES', 50, y, 11, true); y -= 18;
        const obs = data.observacoes;
        for (let i = 0; i < obs.length; i += 80) {
          drawText(obs.slice(i, i + 80), 50, y, 9); y -= 14;
        }
      }
      
      y -= 30;
      drawText('_________________________________', 50, y, 10);
      drawText('_________________________________', 320, y, 10);
      y -= 14;
      drawText('Contratante', 50, y, 9);
      drawText('Villela Exchange', 320, y, 9);
      
      const pdfPreenchido = await pdfDoc.save();
      const uint8 = new Uint8Array(pdfPreenchido);
      let base64 = '';
      for (let i = 0; i < uint8.length; i += 8192) {
        base64 += String.fromCharCode(...uint8.slice(i, i + 8192));
      }
      const nomeArq = `contrato_${data.tipo.replace(/ /g, '_')}.pdf`;
      return Response.json({ pdf_base64: btoa(base64), filename: nomeArq, tipo: data.tipo });
    }

    if (!pdfUrl) return Response.json({ error: `Tipo de contrato n\u00e3o suportado: ${contrato.tipo}` }, { status: 400 });

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