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

      // ── GARANTIAS: contrato completo com cláusulas ──────────────────────────
      if (contrato.tipo === 'GARANTIAS') {
        const gDoc = await PDFDocument.create();
        const font     = await gDoc.embedFont('Helvetica');
        const fontBold = await gDoc.embedFont('Helvetica-Bold');
        const W = 595, H = 842, ML = 50, MR = 545, TW = 495;
        const NAVY  = { type: 'RGB', red: 0.067, green: 0.118, blue: 0.208 };
        const BLACK = { type: 'RGB', red: 0,     green: 0,     blue: 0     };
        const WHITE = { type: 'RGB', red: 1,     green: 1,     blue: 1     };

        const d = contrato;
        const dataCtrt = d.data_contrato ? new Date(d.data_contrato+'T00:00:00') : new Date();
        const diaFmt = `${String(dataCtrt.getDate()).padStart(2,'0')} de ${MESES_PT[dataCtrt.getMonth()]} de ${dataCtrt.getFullYear()}`;
        const tipos   = (d.administracao_debitos||[]).join(', ');
        const valDiv  = fmtVal(d.valor_divida);
        const valDivExt = numeroParaExtenso(d.valor_divida);
        const mens   = fmtVal(d.mensalidade);
        const diaV   = String(d.dia_vencimento || '');
        const pct    = String(d.percentual_montante || '');

        function dt(pg, text, x, y, size, bold) {
          pg.drawText(String(text||''), { x, y, size, font: bold ? fontBold : font, color: BLACK });
        }
        function dtNav(pg, text, x, y, size) {
          pg.drawText(String(text||''), { x, y, size, font: fontBold, color: NAVY });
        }
        function paraBK(pg, text, x, y, size, lineH) {
          const maxW = MR - x;
          for (const ln of wrapText(text, font, size, maxW)) {
            pg.drawText(ln, { x, y, size, font, color: BLACK });
            y -= lineH;
          }
          return y;
        }
        function box(pg, x, y, w) {
          pg.drawRectangle({ x, y: y-3, width: w, height: 14, borderColor: BLACK, borderWidth: 0.3, color: WHITE });
        }
        function hline(pg, yPos) {
          pg.drawRectangle({ x: ML, y: yPos, width: TW, height: 0.5, color: NAVY });
        }

        // ── PAGE 1 ──────────────────────────────────────────────────────────
        const p1 = gDoc.addPage([W, H]);
        let y = H - 55;

        hline(p1, y + 5);
        const titleText = 'CONTRATO DE PRESTA\u00c7\u00c3O DE SERVI\u00c7OS';
        const titleW = fontBold.widthOfTextAtSize(titleText, 13);
        dtNav(p1, titleText, (W - titleW) / 2, y, 13);
        y -= 7;
        hline(p1, y);
        y -= 20;

        // CONTRATANTE box
        dtNav(p1, 'CONTRATANTE:', ML, y, 9);
        const lW = fontBold.widthOfTextAtSize('CONTRATANTE:', 9);
        box(p1, ML + lW + 5, y, TW - lW - 5);
        dt(p1, d.nome || '', ML + lW + 8, y, 9, false);
        y -= 18;
        box(p1, ML, y, TW);
        dt(p1, d.cpf_cnpj ? `CPF/CNPJ: ${d.cpf_cnpj}` : '', ML + 4, y, 9, false);
        y -= 24;

        // CONTRATADA
        y = paraBK(p1, 'CONTRATADA: VILLAGE NEGOCIOS IMOBILIARIOS , pessoa jur\u00eddica de direito privado, devidamente inscrita no CNPJ n\u00b0 30.719.023/0001-11, com sede na Rua It\u00e1lia, 732, Cap\u00e3o da Canoa/RS.', ML, y, 9, 13);
        y -= 12;

        // CLÁUSULA PRIMEIRA
        dtNav(p1, 'CL\u00c1USULA PRIMEIRA:', ML, y, 9); y -= 14;
        y = paraBK(p1, `O presente contrato tem o \u00fanico e espec\u00edfico fim de disponibilizar bem im\u00f3vel para fins de oferta como garantia e/ou penhora, o que tem a finalidade de gerar prote\u00e7\u00e3o patrimonial e/ou possibilitar a composi\u00e7\u00e3o e administra\u00e7\u00e3o de d\u00e9bitos${tipos ? ' '+tipos : ''} at\u00e9 R$ ${valDiv} (${valDivExt}) detidos pela Contratante.`, ML, y, 9, 13); y -= 6;
        y = paraBK(p1, 'Par\u00e1grafo primeiro: A referida garantia a ser ofertada \u00e9 de responsabilidade da Contratada, devendo ser por esta substitu\u00edda sempre que necess\u00e1rio ao bom deslinde do feito e sempre de acordo com os interesses do Contratante.', ML+15, y, 9, 13); y -= 6;
        y = paraBK(p1, 'Par\u00e1grafo segundo: Ap\u00f3s a notifica\u00e7\u00e3o, a Contratada emitir\u00e1, no prazo m\u00e1ximo de 5 dias \u00fateis, a Certid\u00e3o de Disponibiliza\u00e7\u00e3o de Garantia, acompanhada da matr\u00edcula atualizada do im\u00f3vel, laudo de avalia\u00e7\u00e3o e demais documentos necess\u00e1rios para a instru\u00e7\u00e3o da defesa ou requerimento administrativo.', ML+15, y, 9, 13); y -= 6;
        y = paraBK(p1, 'Par\u00e1grafo terceiro: A operacionalidade da garantia inclui o fornecimento de subs\u00eddios t\u00e9cnicos para que o corpo jur\u00eddico do Contratante possa sustentar a idoneidade do bem oferecido, n\u00e3o incluindo, todavia, a atua\u00e7\u00e3o em ju\u00edzo por advogados da Contratada, salvo contrata\u00e7\u00e3o espec\u00edfica.', ML+15, y, 9, 13); y -= 12;

        // CLÁUSULA SEGUNDA
        dtNav(p1, 'CL\u00c1USULA SEGUNDA \u2013 DO PRE\u00c7O E DAS CONDI\u00c7\u00d5ES DE PAGAMENTO:', ML, y, 9); y -= 14;
        y = paraBK(p1, 'As partes fixam uma mensalidade, a partir da assinatura deste contrato, conforme indicadores abaixo:', ML, y, 9, 13); y -= 8;

        dt(p1, 'Valor:', ML, y, 9, false);
        box(p1, ML+33, y, 110); dt(p1, `R$ ${mens}`, ML+36, y, 9, false);
        dt(p1, 'Dia:', ML+152, y, 9, false);
        box(p1, ML+170, y, 50); dt(p1, diaV, ML+173, y, 9, false);
        dt(p1, 'dos meses subsequentes.', ML+228, y, 9, false);
        y -= 18;

        y = paraBK(p1, `Par\u00e1grafo primeiro: ser\u00e1 devida uma parcela adicional de ${pct}% sobre o montante da d\u00edvida apontada no OBJETO do presente instrumento quando da efetiva aceita\u00e7\u00e3o da garantia em execu\u00e7\u00e3o judicial, minuta de acordo com o credor, ou qualquer outro procedimento administrativo, o que dever\u00e1 ser pago em at\u00e9 5 dias \u00fateis a partir da efetiva aceita\u00e7\u00e3o.`, ML+15, y, 9, 13); y -= 6;
        y = paraBK(p1, 'Par\u00e1grafo segundo: Entende-se por aceita\u00e7\u00e3o de acordo com o par\u00e1grafo anterior: o despacho judicial que determine a penhora ou suspens\u00e3o do feito ap\u00f3s oferta do bem, a peti\u00e7\u00e3o do credor informando aceita\u00e7\u00e3o ou pedido de suspens\u00e3o do feito, e a inclus\u00e3o da garantia em minutas de acordo entre as partes.', ML+15, y, 9, 13); y -= 6;
        y = paraBK(p1, 'Par\u00e1grafo terceiro: Os pagamentos ser\u00e3o realizados mediante PIX, TED ou boleto banc\u00e1rio emitido pela pr\u00f3pria Contratada.', ML+15, y, 9, 13); y -= 6;
        y = paraBK(p1, 'Par\u00e1grafo quarto: as partes convencionam que sobre as parcelas em atraso incidir\u00e1 multa de 2% (dois por cento), mais juros legais de 1% (um por cento) ao m\u00eas, capitalizados mensalmente.', ML+15, y, 9, 13); y -= 12;

        // CLÁUSULA TERCEIRA
        dtNav(p1, 'CL\u00c1USULA TERCEIRA \u2013 DO PRAZO:', ML, y, 9); y -= 14;
        paraBK(p1, 'O presente contrato perdurar\u00e1 por prazo de 5 anos, per\u00edodo no qual a Contratante estar\u00e1 fazendo uso e gozo dos im\u00f3veis ofertados.', ML, y, 9, 13);

        const pg1Txt = 'P\u00e1gina 1 de 2';
        dt(p1, pg1Txt, (W - font.widthOfTextAtSize(pg1Txt, 8)) / 2, 30, 8, false);

        // ── PAGE 2 ──────────────────────────────────────────────────────────
        const p2 = gDoc.addPage([W, H]);
        y = H - 55;

        y = paraBK(p2, 'Par\u00e1grafo \u00fanico: Poder\u00e1 a Contratante rescindir o presente contrato a qualquer momento, sem multa ou qualquer outro \u00f4nus, desde que notificada a Contratada com 30 (trinta) dias de anteced\u00eancia.', ML+15, y, 9, 13); y -= 12;

        dtNav(p2, 'CL\u00c1USULA QUARTA \u2013 DO COMPROMISSO:', ML, y, 9); y -= 14;
        y = paraBK(p2, 'A Contratada se compromete a empreender com todo o zelo e cuidado poss\u00edvel a execu\u00e7\u00e3o dos servi\u00e7os, lan\u00e7ando m\u00e3o da melhor t\u00e9cnica e tecnologia profissional necess\u00e1ria, sempre visando obter, respeitados os limites legais, o melhor resultado \u00e0 Contratante.', ML, y, 9, 13); y -= 12;

        dtNav(p2, 'CL\u00c1USULA QUINTA \u2013 DA CONFIDENCIALIDADE:', ML, y, 9); y -= 14;
        y = paraBK(p2, 'As Partes obrigam-se a manter absoluto sigilo sobre todas as informa\u00e7\u00f5es, documentos, dados, materiais, negocia\u00e7\u00f5es, tratativas comerciais, estrat\u00e9gicas, financeiras, jur\u00eddicas, operacionais ou t\u00e9cnicas a que tiverem acesso em raz\u00e3o da rela\u00e7\u00e3o mantida entre si, sejam tais informa\u00e7\u00f5es fornecidas por escrito, verbalmente, por meio eletr\u00f4nico ou por qualquer outra forma, desde que identificadas como confidenciais ou que, pela sua natureza, devam razoavelmente ser tratadas como sigilosas.', ML, y, 9, 13); y -= 6;
        y = paraBK(p2, 'Par\u00e1grafo primeiro: As informa\u00e7\u00f5es confidenciais somente poder\u00e3o ser compartilhadas com s\u00f3cios, administradores, empregados, colaboradores, consultores, assessores, subcontratados ou representantes que necessitem conhec\u00ea-las para os fins aqui previstos, ficando a Parte receptora respons\u00e1vel por assegurar que tais pessoas observem o mesmo dever de confidencialidade, inclusive quanto \u00e0 prote\u00e7\u00e3o de dados pessoais, nos termos da Lei n\u00ba 13.709/2018 \u2014 Lei Geral de Prote\u00e7\u00e3o de Dados.', ML+15, y, 9, 13); y -= 6;
        y = paraBK(p2, 'Par\u00e1grafo segundo: N\u00e3o ser\u00e3o consideradas confidenciais as informa\u00e7\u00f5es que sejam ou venham a se tornar p\u00fablicas sem viola\u00e7\u00e3o deste instrumento, que j\u00e1 fossem legitimamente conhecidas pela Parte receptora antes de sua divulga\u00e7\u00e3o, ou que sejam obtidas de terceiro sem obriga\u00e7\u00e3o de sigilo.', ML+15, y, 9, 13); y -= 12;

        dtNav(p2, 'CL\u00c1USULA SEXTA \u2013 DO FORO:', ML, y, 9); y -= 14;
        y = paraBK(p2, 'Fica eleito o Foro da Comarca de S\u00e3o Paulo/SP, para qualquer a\u00e7\u00e3o ou procedimento judicial resultante de obriga\u00e7\u00f5es ou direitos decorrentes do presente Contrato.', ML, y, 9, 13); y -= 18;

        dt(p2, `S\u00e3o Paulo/SP, ${diaFmt}.`, ML, y, 9, false); y -= 22;
        y = paraBK(p2, 'Por terem como justas as cl\u00e1usulas supra, assinam o presente instrumento contratual, em duas (02) vias, na presen\u00e7a de testemunhas.', ML, y, 9, 13); y -= 40;

        // Signatures
        const sigW = 185;
        p2.drawLine({ start: { x: ML, y }, end: { x: ML+sigW, y }, thickness: 0.5, color: BLACK });
        p2.drawLine({ start: { x: W-ML-sigW, y }, end: { x: W-ML, y }, thickness: 0.5, color: BLACK });
        y -= 14;
        const cs = 'CONTRATANTE', cd = 'CONTRATADA';
        dt(p2, cs, ML + (sigW - fontBold.widthOfTextAtSize(cs, 9)) / 2, y, 9, true);
        dt(p2, cd, W-ML-sigW + (sigW - fontBold.widthOfTextAtSize(cd, 9)) / 2, y, 9, true);

        const f1 = 'Acesse nossos canais e saiba mais:';
        const f2 = 'grupovillela.com.br | villagenegocios.com.br | Instagram: @grupo.villela';
        dt(p2, f1, (W - font.widthOfTextAtSize(f1, 7)) / 2, 65, 7, false);
        dt(p2, f2, (W - font.widthOfTextAtSize(f2, 7)) / 2, 54, 7, false);
        const pg2Txt = 'P\u00e1gina 2 de 2';
        dt(p2, pg2Txt, (W - font.widthOfTextAtSize(pg2Txt, 8)) / 2, 30, 8, false);

        const pdfPreenchidoG = await gDoc.save();
        const uint8G = new Uint8Array(pdfPreenchidoG);
        let base64G = '';
        for (let i = 0; i < uint8G.length; i += 8192) {
          base64G += String.fromCharCode(...uint8G.slice(i, i + 8192));
        }
        return Response.json({ pdf_base64: btoa(base64G), filename: 'contrato_GARANTIAS.pdf', tipo: 'GARANTIAS' });
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