import { jsPDF } from 'npm:jspdf@4.0.0';
import { winAnsi } from './pdfWinAnsi.ts';
import { PRODUTOS_ESTUDO } from './estudoViabilidade.ts';
import { CLASSIFICACAO, CONDICOES_GERAIS_PADRAO, somaEtapas } from './propostaTecnica.ts';

// Gera o PDF executivo da Proposta Técnica (identidade Villela Exchange / RNC).
const NAVY: [number, number, number] = [10, 31, 53];
const NAVY2: [number, number, number] = [22, 33, 62];
const TEAL: [number, number, number] = [0, 168, 136];
const TEAL_L: [number, number, number] = [0, 212, 170];
const GOLD: [number, number, number] = [255, 210, 50];
const INK: [number, number, number] = [33, 41, 54];
const MUTED: [number, number, number] = [100, 116, 139];
const LINE: [number, number, number] = [218, 225, 234];
const ZEBRA: [number, number, number] = [246, 248, 251];
const NIVEL: Record<string, [number, number, number]> = { alto: [220, 38, 38], medio: [217, 119, 6], baixo: [5, 150, 105] };
const CLASS_RGB: Record<string, [number, number, number]> = { alta: [5, 150, 105], media: [217, 119, 6], baixa: [234, 88, 12], inviavel: [220, 38, 38] };

const brl = (v: any) => 'R$ ' + Math.round(Number(v) || 0).toLocaleString('pt-BR');
const fmtD = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

export function montarPdfProposta(p: any, user: any): Uint8Array {
    const c = p.conteudo || {};
    const prod = (PRODUTOS_ESTUDO as any)[p.produto] || { titulo: 'Estudo de Viabilidade', nome: '' };
    const etapas = Array.isArray(c.etapas) ? c.etapas : [];
    const tot = somaEtapas(etapas);
    const hoje = new Date();
    const validade = new Date(hoje.getTime() + (Number(p.validade_dias) || 15) * 86400000);

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, H = 297, M = 18, CW = W - 2 * M, TOP = 26, BOTTOM = 278;
    let y = TOP;

    const font = (sz: number, style = 'normal', color: [number, number, number] = INK) => {
      doc.setFontSize(sz); doc.setFont('helvetica', style); doc.setTextColor(...color);
    };
    const T = (s: any) => winAnsi(s);
    const lines = (s: any, w: number) => {
      const out: string[] = [];
      for (const par of String(s ?? '').split(/\n+/)) {
        const t = T(par).trim();
        if (t) out.push(...doc.splitTextToSize(t, w));
      }
      return out;
    };
    const novaPagina = () => { doc.addPage(); y = TOP + 4; };
    const ensure = (h: number) => { if (y + h > BOTTOM) novaPagina(); };

    const para = (s: any, sz = 9.5, color = INK, lh = 4.7, x = M, w = CW) => {
      font(sz, 'normal', color);
      for (const ln of lines(s, w)) { ensure(lh); doc.text(ln, x, y); y += lh; }
      y += 1.5;
    };
    const secao = (num: string, titulo: string) => {
      ensure(18);
      y += 3;
      font(8, 'bold', TEAL); doc.text(num, M, y);
      font(14, 'bold', NAVY); doc.text(T(titulo), M + 9, y);
      y += 2.5; doc.setDrawColor(...TEAL_L); doc.setLineWidth(0.6); doc.line(M, y, M + 22, y);
      doc.setLineWidth(0.2); y += 6;
    };
    const sub = (t: string) => { ensure(10); font(10, 'bold', NAVY); doc.text(T(t), M, y); y += 5; };
    const bullets = (arr: any[], sz = 9.2, x = M) => {
      for (const it of (arr || []).filter(Boolean)) {
        const ls = lines(it, CW - (x - M) - 5);
        ensure(ls.length * 4.5 + 1);
        doc.setFillColor(...TEAL); doc.circle(x + 1.2, y - 1.2, 0.8, 'F');
        font(sz, 'normal', INK);
        ls.forEach((l, i) => doc.text(l, x + 4.5, y + i * 4.5));
        y += ls.length * 4.5 + 1.2;
      }
      y += 1.5;
    };
    // tabela com quebra de linha e de página
    const tabela = (cols: { label: string; w: number; align?: string }[], rows: any[][], opts: any = {}) => {
      const pad = 2.2, lh = 4.2;
      const header = () => {
        ensure(9);
        doc.setFillColor(...NAVY); doc.rect(M, y - 4.5, CW, 7.5, 'F');
        font(8, 'bold', [255, 255, 255]);
        let x = M;
        cols.forEach(col => { doc.text(T(col.label), col.align === 'right' ? x + col.w - pad : x + pad, y, { align: col.align === 'right' ? 'right' : 'left' }); x += col.w; });
        y += 5;
      };
      header();
      rows.forEach((row, ri) => {
        const cells = row.map((cell, ci) => (typeof cell === 'object' && cell && cell.badge) ? [T(cell.text)] : lines(cell, cols[ci].w - 2 * pad));
        const h = Math.max(...cells.map(ls => Math.max(1, ls.length))) * lh + 3;
        if (y + h > BOTTOM) { novaPagina(); header(); }
        const isTotal = opts.totalRow && ri === rows.length - 1;
        if (isTotal) { doc.setFillColor(232, 247, 243); doc.rect(M, y - 3.5, CW, h, 'F'); }
        else if (ri % 2 === 0) { doc.setFillColor(...ZEBRA); doc.rect(M, y - 3.5, CW, h, 'F'); }
        let x = M;
        row.forEach((cell, ci) => {
          const col = cols[ci];
          if (typeof cell === 'object' && cell && cell.badge) {
            const rgb = NIVEL[cell.badge] || MUTED;
            doc.setFillColor(...rgb); doc.roundedRect(x + pad, y - 2.9, 16, 4.6, 1.2, 1.2, 'F');
            font(7, 'bold', [255, 255, 255]); doc.text(T(cell.text), x + pad + 8, y + 0.3, { align: 'center' });
          } else {
            font(8.3, isTotal || (opts.boldFirst && ci === 0) ? 'bold' : 'normal', isTotal ? NAVY : INK);
            cells[ci].forEach((l, li) => doc.text(l, col.align === 'right' ? x + col.w - pad : x + pad, y + li * lh, { align: col.align === 'right' ? 'right' : 'left' }));
          }
          x += col.w;
        });
        y += h;
        doc.setDrawColor(...LINE); doc.line(M, y - 3.5, M + CW, y - 3.5);
      });
      y += 4;
    };

    // ───────────────── CAPA ─────────────────
    doc.setFillColor(...NAVY); doc.rect(0, 0, W, H, 'F');
    doc.setFillColor(...NAVY2); doc.rect(0, 200, W, 97, 'F');
    doc.setFillColor(...TEAL_L); doc.rect(0, 198, W, 2.2, 'F');
    doc.setFillColor(...GOLD); doc.rect(M, 40, 14, 1.4, 'F');
    font(10, 'bold', TEAL_L); doc.text('VILLELA EXCHANGE  ·  RNC', M, 34);
    font(30, 'bold', [255, 255, 255]); doc.text('PROPOSTA TÉCNICA', M, 62);
    font(15, 'normal', [190, 214, 240]); doc.text(T(prod.titulo), M, 74);
    if (c.titulo_estrutura) {
      font(12, 'bold', GOLD);
      doc.splitTextToSize(T(c.titulo_estrutura), CW).slice(0, 3).forEach((l: string, i: number) => doc.text(l, M, 90 + i * 6));
    }
    font(8, 'bold', TEAL_L); doc.text('PREPARADA PARA', M, 128);
    font(17, 'bold', [255, 255, 255]);
    doc.splitTextToSize(T(p.cliente_nome || '—'), CW).slice(0, 2).forEach((l: string, i: number) => doc.text(l, M, 137 + i * 7));
    font(9, 'normal', [190, 214, 240]);
    doc.text(T(`${p.tipo_cliente === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}${p.cliente_documento ? '  ·  ' + p.cliente_documento : ''}`), M, 154);

    const meta = [['Código', p.codigo || '—'], ['Versão', `v${p.versao}`], ['Emissão', fmtD(hoje)], ['Validade', fmtD(validade)]];
    meta.forEach(([k, v], i) => {
      const x = M + i * (CW / 4);
      font(7.5, 'bold', TEAL_L); doc.text(T(k.toUpperCase()), x, 222);
      font(10.5, 'bold', [255, 255, 255]); doc.text(T(v), x, 229);
    });
    font(8.5, 'normal', [190, 214, 240]);
    doc.text('Elaborada pela equipe técnica RNC', M, 250);
    doc.text(T(`Consultor responsável: ${p.responsavel_nome || user.full_name || user.email}`), M, 256);
    doc.setFillColor(...GOLD); doc.roundedRect(M, 268, 34, 7, 1.5, 1.5, 'F');
    font(7.5, 'bold', NAVY); doc.text('CONFIDENCIAL', M + 17, 272.8, { align: 'center' });

    // ───────────────── SUMÁRIO (estático) ─────────────────
    novaPagina();
    font(18, 'bold', NAVY); doc.text('Sumário', M, y + 4); y += 14;
    const SEC = [
      ['01', 'Sumário executivo'], ['02', 'Contexto e objetivos'], ['03', 'Diagnóstico'],
      ['04', 'Estrutura recomendada'], ['05', 'Benefícios esperados'], ['06', 'Riscos e mitigação'],
      ['07', 'Plano de implantação por etapas'], ['08', 'Investimento'], ['09', 'Premissas e documentação'],
      ['10', 'Próximos passos'], ['11', 'Condições gerais e aceite'],
    ];
    SEC.forEach(([n, t]) => {
      font(10, 'bold', TEAL); doc.text(n, M, y);
      font(11, 'normal', INK); doc.text(T(t), M + 12, y);
      doc.setDrawColor(...LINE); doc.line(M, y + 3, M + CW, y + 3);
      y += 10;
    });

    // ───────────────── 01 SUMÁRIO EXECUTIVO ─────────────────
    novaPagina();
    secao('01', 'Sumário executivo');
    // cartões KPI
    const cls = (CLASSIFICACAO as any)[p.classificacao] || { label: '—' };
    const crgb = CLASS_RGB[p.classificacao] || MUTED;
    const cardW = (CW - 9) / 4, cardH = 24;
    const cards = [
      { k: 'Viabilidade', v: `${Math.round(Number(p.score_viabilidade) || 0)}/100`, s: cls.label, rgb: crgb },
      { k: 'Prazo estimado', v: `${tot.prazo} dias`, s: `${etapas.length} etapas`, rgb: NAVY },
      { k: 'Investimento (honorários)', v: tot.max ? `${brl(tot.min)}` : '—', s: tot.max ? `até ${brl(tot.max)}` : 'a definir', rgb: NAVY },
      { k: 'Success fee', v: c.success_fee?.aplicavel ? 'Opcional' : 'Não aplicável', s: c.success_fee?.aplicavel ? 'ver seção 08' : '', rgb: NAVY },
    ];
    ensure(cardH + 6);
    cards.forEach((cd, i) => {
      const x = M + i * (cardW + 3);
      doc.setFillColor(...ZEBRA); doc.roundedRect(x, y, cardW, cardH, 2, 2, 'F');
      doc.setFillColor(...cd.rgb); doc.rect(x, y, 1.6, cardH, 'F');
      font(7, 'bold', MUTED); doc.text(T(cd.k.toUpperCase()), x + 4.5, y + 6);
      font(12.5, 'bold', cd.rgb); doc.text(T(cd.v), x + 4.5, y + 14);
      font(7.5, 'normal', MUTED); doc.text(T(cd.s), x + 4.5, y + 19.5);
    });
    y += cardH + 4;
    // barra do score
    doc.setFillColor(...LINE); doc.roundedRect(M, y, CW, 2.4, 1.2, 1.2, 'F');
    doc.setFillColor(...crgb); doc.roundedRect(M, y, Math.max(2, CW * (Number(p.score_viabilidade) || 0) / 100), 2.4, 1.2, 1.2, 'F');
    y += 9;
    para(c.sumario_executivo || '—', 10, INK, 5);
    if (c.justificativa_score) {
      const ls = lines(c.justificativa_score, CW - 10);
      ensure(ls.length * 4.4 + 10);
      doc.setFillColor(232, 247, 243); doc.roundedRect(M, y - 2, CW, ls.length * 4.4 + 9, 2, 2, 'F');
      font(7.5, 'bold', TEAL); doc.text('LEITURA DA VIABILIDADE', M + 5, y + 3);
      font(8.8, 'normal', INK); ls.forEach((l, i) => doc.text(l, M + 5, y + 8 + i * 4.4));
      y += ls.length * 4.4 + 12;
    }

    // ───────────────── 02 CONTEXTO ─────────────────
    secao('02', 'Contexto e objetivos');
    para(c.contexto || '—');
    if ((c.objetivos_cliente || []).length) { sub('Objetivos do cliente'); bullets(c.objetivos_cliente); }

    // ───────────────── 03 DIAGNÓSTICO ─────────────────
    secao('03', 'Diagnóstico');
    if ((c.diagnostico || []).length) {
      tabela([{ label: 'Tema', w: 38 }, { label: 'Achado', w: CW - 38 - 24 }, { label: 'Impacto', w: 24 }],
        c.diagnostico.map((d: any) => [d.tema, d.achado, { badge: d.impacto, text: (d.impacto || '').toUpperCase() }]), { boldFirst: true });
    } else para('Diagnóstico a complementar após recebimento da documentação.');

    // ───────────────── 04 ESTRUTURA ─────────────────
    secao('04', 'Estrutura recomendada');
    const er = c.estrutura_recomendada || {};
    {
      const ls = lines(er.descricao || '', CW - 10);
      const h = 14 + ls.length * 4.6;
      ensure(h + 4);
      doc.setFillColor(...NAVY); doc.roundedRect(M, y - 2, CW, h, 2.5, 2.5, 'F');
      font(12, 'bold', [255, 255, 255]); doc.text(T(er.nome || c.titulo_estrutura || prod.nome), M + 5, y + 5);
      if (er.jurisdicao) { font(8.5, 'bold', GOLD); doc.text(T(er.jurisdicao), M + CW - 5, y + 5, { align: 'right' }); }
      font(9, 'normal', [210, 225, 242]); ls.forEach((l, i) => doc.text(l, M + 5, y + 12 + i * 4.6));
      y += h + 5;
    }
    if ((er.componentes || []).length) { sub('Componentes da estrutura'); bullets(er.componentes); }
    if ((c.alternativas || []).length) {
      sub('Alternativas avaliadas');
      tabela([{ label: 'Alternativa', w: 42 }, { label: 'Descrição', w: 70 }, { label: 'Por que não é a principal', w: CW - 112 }],
        c.alternativas.map((a: any) => [a.nome, a.descricao, a.motivo]), { boldFirst: true });
    }

    // ───────────────── 05 BENEFÍCIOS ─────────────────
    secao('05', 'Benefícios esperados');
    for (const b of (c.beneficios || [])) {
      const ls = lines(b.descricao, CW - 8);
      ensure(ls.length * 4.5 + 8);
      doc.setFillColor(...TEAL_L); doc.rect(M, y - 3.5, 1.2, ls.length * 4.5 + 5.5, 'F');
      font(9.5, 'bold', NAVY); doc.text(T(b.titulo), M + 4, y);
      font(9, 'normal', INK); ls.forEach((l, i) => doc.text(l, M + 4, y + 5 + i * 4.5));
      y += ls.length * 4.5 + 9;
    }

    // ───────────────── 06 RISCOS ─────────────────
    secao('06', 'Riscos e mitigação');
    if ((c.riscos || []).length) {
      tabela([{ label: 'Risco', w: 62 }, { label: 'Nível', w: 22 }, { label: 'Mitigação', w: CW - 84 }],
        c.riscos.map((r: any) => [r.risco, { badge: r.nivel, text: (r.nivel || '').toUpperCase() }, r.mitigacao]));
    } else para('Sem riscos relevantes identificados nesta etapa.');

    // ───────────────── 07 PLANO POR ETAPAS ─────────────────
    secao('07', 'Plano de implantação por etapas');
    if (etapas.length) {
      // Cronograma (Gantt)
      const total = Math.max(1, tot.prazo);
      const labelW = 52, barW = CW - labelW;
      ensure(12 + etapas.length * 8);
      font(7, 'bold', MUTED);
      [0, 0.25, 0.5, 0.75, 1].forEach(f => {
        const x = M + labelW + barW * f;
        doc.text(`D${Math.round(total * f)}`, x, y, { align: f === 1 ? 'right' : f === 0 ? 'left' : 'center' });
        doc.setDrawColor(...LINE); doc.line(x, y + 1.5, x, y + 3 + etapas.length * 8);
      });
      y += 5;
      let acc = 0;
      etapas.forEach((e: any, i: number) => {
        const d = Number(e.prazo_dias) || 0;
        font(8, 'bold', NAVY); doc.text(T(`${e.fase || 'Fase ' + (i + 1)}`), M, y + 3);
        font(7.5, 'normal', MUTED); doc.text(T(doc.splitTextToSize(T(e.titulo || ''), labelW - 16)[0] || ''), M + 15, y + 3);
        const x = M + labelW + barW * (acc / total);
        const w = Math.max(3, barW * (d / total));
        doc.setFillColor(...(i % 2 === 0 ? TEAL : NAVY)); doc.roundedRect(x, y, w, 4.6, 1.2, 1.2, 'F');
        font(6.8, 'bold', [255, 255, 255]); if (w > 12) doc.text(`${d}d`, x + w / 2, y + 3.3, { align: 'center' });
        acc += d; y += 8;
      });
      y += 4;
      // Detalhe de cada etapa
      etapas.forEach((e: any, i: number) => {
        ensure(26);
        doc.setFillColor(...ZEBRA); doc.roundedRect(M, y - 4, CW, 9, 1.5, 1.5, 'F');
        font(9.5, 'bold', NAVY); doc.text(T(`${e.fase || 'Fase ' + (i + 1)}  ·  ${e.titulo || ''}`), M + 3, y + 1.8);
        font(8, 'bold', TEAL);
        doc.text(T(`${e.prazo_dias || 0} dias  ·  ${brl(e.investimento_min)} a ${brl(e.investimento_max)}`), M + CW - 3, y + 1.8, { align: 'right' });
        y += 10;
        if (e.objetivo) para(e.objetivo, 9, INK, 4.5);
        const colW = (CW - 6) / 2;
        const at = (e.atividades || []).flatMap((a: any) => lines('• ' + a, colW - 2));
        const en = (e.entregaveis || []).flatMap((a: any) => lines('• ' + a, colW - 2));
        const n = Math.max(at.length, en.length);
        if (n) {
          ensure(8 + Math.min(n, 30) * 4.2);
          font(7.5, 'bold', TEAL); doc.text('ATIVIDADES', M, y); doc.text('ENTREGÁVEIS', M + colW + 6, y); y += 4.5;
          font(8.5, 'normal', INK);
          for (let k = 0; k < n; k++) {
            ensure(4.2);
            if (at[k]) doc.text(at[k], M, y);
            if (en[k]) doc.text(en[k], M + colW + 6, y);
            y += 4.2;
          }
          y += 4;
        }
      });
    } else para('Etapas a definir.');

    // ───────────────── 08 INVESTIMENTO ─────────────────
    secao('08', 'Investimento');
    para('Os honorários da equipe técnica RNC são apresentados em faixas por etapa, refletindo a complexidade a ser confirmada na validação documental.', 9, MUTED);
    if (etapas.length) {
      tabela(
        [{ label: 'Fase', w: 22 }, { label: 'Etapa', w: CW - 22 - 22 - 34 - 34 }, { label: 'Prazo', w: 22, align: 'right' }, { label: 'Mínimo', w: 34, align: 'right' }, { label: 'Máximo', w: 34, align: 'right' }],
        [...etapas.map((e: any, i: number) => [e.fase || `Fase ${i + 1}`, e.titulo, `${e.prazo_dias || 0} d`, brl(e.investimento_min), brl(e.investimento_max)]),
          ['Total', 'Honorários estimados', `${tot.prazo} d`, brl(tot.min), brl(tot.max)]],
        { totalRow: true, boldFirst: true });
    }
    if ((c.custos_recorrentes || []).length) {
      sub('Custos recorrentes e de terceiros (não inclusos nos honorários)');
      tabela([{ label: 'Item', w: 92 }, { label: 'Valor estimado', w: 46 }, { label: 'Periodicidade', w: CW - 138 }],
        c.custos_recorrentes.map((r: any) => [r.item, r.valor, r.periodicidade]));
    }
    if (c.success_fee?.aplicavel && c.success_fee?.descricao) {
      const ls = lines(c.success_fee.descricao, CW - 10);
      ensure(ls.length * 4.5 + 12);
      doc.setFillColor(255, 248, 225); doc.roundedRect(M, y - 2, CW, ls.length * 4.5 + 10, 2, 2, 'F');
      font(7.5, 'bold', [146, 100, 0]); doc.text('SUCCESS FEE (OPCIONAL)', M + 5, y + 3);
      font(8.8, 'normal', [90, 62, 0]); ls.forEach((l, i) => doc.text(l, M + 5, y + 8 + i * 4.5));
      y += ls.length * 4.5 + 13;
    }

    // ───────────────── 09 PREMISSAS ─────────────────
    secao('09', 'Premissas e documentação');
    if ((c.premissas || []).length) { sub('Premissas adotadas'); bullets(c.premissas); }
    if ((c.documentos_pendentes || []).length) { sub('Documentos e informações pendentes'); bullets(c.documentos_pendentes); }
    if ((c.base_legal || []).length) { sub('Referências normativas'); bullets(c.base_legal, 8.5); }

    // ───────────────── 10 PRÓXIMOS PASSOS ─────────────────
    secao('10', 'Próximos passos');
    (c.proximos_passos || []).forEach((s: any, i: number) => {
      const ls = lines(s, CW - 12);
      ensure(ls.length * 4.6 + 3);
      doc.setFillColor(...NAVY); doc.circle(M + 3, y - 1.3, 3, 'F');
      font(8, 'bold', [255, 255, 255]); doc.text(String(i + 1), M + 3, y - 0.2, { align: 'center' });
      font(9.3, 'normal', INK); ls.forEach((l, k) => doc.text(l, M + 9, y + k * 4.6));
      y += ls.length * 4.6 + 3.5;
    });

    // ───────────────── 11 CONDIÇÕES E ACEITE ─────────────────
    secao('11', 'Condições gerais e aceite');
    bullets([...(c.condicoes_gerais && c.condicoes_gerais.length ? c.condicoes_gerais : CONDICOES_GERAIS_PADRAO),
      `Proposta válida até ${fmtD(validade)} (${Number(p.validade_dias) || 15} dias a partir da emissão).`], 8.6);
    ensure(40);
    y = Math.max(y + 14, Math.min(BOTTOM - 22, y + 14));
    doc.setDrawColor(...MUTED);
    doc.line(M, y, M + 72, y); doc.line(M + CW - 72, y, M + CW, y);
    font(8, 'bold', NAVY);
    doc.text(T(p.cliente_nome || 'Contratante'), M, y + 5);
    doc.text('RNC — Villela Exchange', M + CW - 72, y + 5);
    font(7.5, 'normal', MUTED);
    doc.text('De acordo — local e data', M, y + 9.5);
    doc.text('equipe técnica RNC', M + CW - 72, y + 9.5);

    // ───────────────── cabeçalho/rodapé ─────────────────
    const n = doc.getNumberOfPages();
    for (let i = 2; i <= n; i++) {
      doc.setPage(i);
      doc.setFillColor(...NAVY); doc.rect(0, 0, W, 14, 'F');
      doc.setFillColor(...TEAL_L); doc.rect(0, 14, W, 0.8, 'F');
      font(8, 'bold', TEAL_L); doc.text('VILLELA EXCHANGE  ·  RNC', M, 9);
      font(7.5, 'normal', [190, 214, 240]);
      doc.text(T(`Proposta Técnica — ${prod.nome}  ·  ${p.codigo || ''}`), W - M, 9, { align: 'right' });
      doc.setDrawColor(...LINE); doc.line(M, 286, W - M, 286);
      font(7, 'normal', MUTED);
      doc.text('Documento confidencial  ·  Elaborado pela equipe técnica RNC', M, 291);
      doc.text(`Página ${i - 1} de ${n - 1}`, W - M, 291, { align: 'right' });
    }

    return new Uint8Array(doc.output('arraybuffer'));
}
