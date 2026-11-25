import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Loader2, ChevronRight, UserRound, Handshake, Inbox } from 'lucide-react';
import { JORNADAS } from '@/lib/celulas';
import { resolverVendedorDoUsuarioLogado } from '@/lib/vendedorContrato';

// Início da jornada dentro da célula: leads (base/lotes) com interesse no produto e indicações de
// parceiros. "Iniciar negociação" leva o lead para a base de clientes (carteira do gerente) e abre a
// operação — negociação no Pipeline ou estudo de viabilidade, conforme a célula.
const C = { card: 'rgba(255,255,255,0.025)', card2: 'rgba(255,255,255,0.045)', line: 'rgba(255,255,255,0.07)', txt: '#F4EFE3', txt2: '#C8D0DC', muted: '#8E97A8', muted2: '#7D8799' };
const dig = (s) => String(s || '').replace(/\D/g, '');
const fmtDoc = (s) => {
  const d = dig(s);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return String(s || '').trim();
};
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '');

// Normaliza lead da base e indicação de parceiro num formato único
const doLead = (l) => ({ id: 'l_' + l.id, fonte: 'lead', raw: l, nome: l.nome, doc: l.cpf_cnpj, tipo: l.tipo_pessoa, email: l.email, telefone: l.telefone, cidade: l.cidade, estado: l.uf, valor: l.valor_contrato, origem: l.lote_nome ? `Lote ${l.lote_nome}` : (l.origem || 'Base'), resp: l.vendedor_nome, quando: l.created_date, cliente_id: l.cliente_id, segmento: l.segmento, obs: l.observacao });
const daIndicacao = (i) => {
  const pf = i.tipo === 'PF';
  return { id: 'i_' + i.id, fonte: 'indicacao', raw: i, nome: pf ? i.pf_nome : i.pj_razao_social, doc: pf ? i.pf_cpf : i.pj_cnpj, tipo: i.tipo, email: pf ? i.pf_email : i.pj_email, telefone: pf ? (i.pf_whatsapp || i.pf_telefone) : (i.pj_whatsapp || i.pj_telefone), cidade: pf ? i.pf_cidade : i.pj_cidade, estado: pf ? i.pf_estado : i.pj_estado, responsavel_legal: pf ? '' : i.pj_nome_responsavel, cpf_responsavel: pf ? '' : i.pj_cpf_responsavel, valor: i.valor_estimado, origem: `Indicação · ${i.parceiro_nome || 'parceiro'}${i.parceiro_percentual ? ` (${i.parceiro_percentual}%)` : ''}`, resp: i.parceiro_nome, quando: i.created_date, cliente_id: i.cliente_id, obs: i.observacoes };
};

export default function LeadsDaJornada({ celula, produto, t, user, isAdmin, onIniciada, onFicha }) {
  const jornada = JORNADAS[produto];
  const [itens, setItens] = useState(null);
  const [vend, setVend] = useState(null);
  const [soMeus, setSoMeus] = useState(!isAdmin);
  const [iniciando, setIniciando] = useState(null);

  useEffect(() => { setSoMeus(!isAdmin); }, [isAdmin]);

  useEffect(() => {
    let vivo = true;
    setItens(null);
    (async () => {
      let v = null;
      try { v = await resolverVendedorDoUsuarioLogado(); } catch { /* sem vínculo */ }
      const chaves = [...(jornada.pipeline || []), jornada.nome].filter(Boolean);
      const ors = chaves.map(k => ({ produto_interesse: { $regex: esc(k), $options: 'i' } }));
      const filtroLead = soMeus && v?.id ? { $and: [{ $or: ors }, { vendedor_id: v.id }] } : { $or: ors };
      const [leads, inds] = await Promise.all([
        base44.entities.Lead.filter(filtroLead, '-created_date', 200).catch(() => []),
        jornada.tipoContrato ? base44.entities.LeadIndicacao.filter({ produto: jornada.tipoContrato }, '-created_date', 200).catch(() => []) : Promise.resolve([]),
      ]);
      const fora = JORNADAS[produto].pipelineExcluir || [];
      const ls = (leads || []).filter(l => !l.convertido && !fora.some(f => String(l.produto_interesse || '').toLowerCase().includes(f))).map(doLead);
      const is = (inds || []).filter(i => ['novo', 'em_atendimento'].includes(i.status) && !i.convertido).map(daIndicacao);
      if (vivo) { setVend(v); setItens([...is, ...ls].sort((a, b) => new Date(b.quando || 0) - new Date(a.quando || 0))); }
    })();
    return () => { vivo = false; };
  }, [produto, soMeus]);

  const iniciar = async (it) => {
    if (!it.nome) { toast.error('Lead sem nome — complete o cadastro antes.'); return; }
    setIniciando(it.id);
    try {
      const me = await base44.auth.me().catch(() => null);
      const vendOk = vend?.id && vend.ativo !== false;
      const respNome = (vendOk && vend.nome) || me?.nome_tratamento || me?.full_name || me?.email || '';
      // 1) Cliente na base (vincula pelo ID ou CPF/CNPJ; senão cria na carteira de quem iniciou)
      let c = it.cliente_id ? await base44.entities.Cliente.get(it.cliente_id).catch(() => null) : null;
      if (!c && dig(it.doc)) {
        const r = await base44.entities.Cliente.filter({ $or: [{ cpf_cnpj: fmtDoc(it.doc) }, { cpf_cnpj: dig(it.doc) }] }, '-created_date', 1).catch(() => []);
        c = r?.[0] || null;
      }
      if (!c) {
        const dados = { nome: it.nome, cpf_cnpj: fmtDoc(it.doc), tipo_pessoa: it.tipo || (dig(it.doc).length === 11 ? 'PF' : 'PJ'), email: it.email, telefone: it.telefone, cidade: it.cidade, estado: it.estado, responsavel_legal: it.responsavel_legal, cpf_responsavel: it.cpf_responsavel };
        c = await base44.entities.Cliente.create({
          ...Object.fromEntries(Object.entries(dados).filter(([, x]) => String(x || '').trim())),
          origem: 'lead_convertido',
          responsavel_origem: `${celula.nome} · ${jornada.nome}`,
          // lead_id aponta para a indicação: o contrato puxa o parceiro como indicador automaticamente
          ...(it.fonte === 'indicacao' ? { lead_id: it.raw.id } : {}),
          observacao: `Cadastro criado ao iniciar a negociação a partir de ${it.fonte === 'indicacao' ? 'indicação de parceiro' : 'lead'}.`,
          ...(vendOk ? { vendedor_id: vend.id, vendedor_nome: vend.nome } : {}),
        });
      } else if (it.fonte === 'indicacao' && !c.lead_id) {
        await base44.entities.Cliente.update(c.id, { lead_id: it.raw.id }).catch(() => {});
      }
      // 2) Operação
      let opId;
      if (celula.fonte === 'estudo') {
        const e = await base44.entities.EstudoViabilidade.create({
          produto, tipo_cliente: c.tipo_pessoa || 'PJ', cliente_id: c.id, cliente_nome: c.nome, cliente_documento: c.cpf_cnpj || '',
          cliente_email: c.email || '', cliente_telefone: c.telefone || '', responsavel_email: me?.email || '', responsavel_nome: respNome,
          status: 'rascunho', respostas: {}, documentos: [], observacoes_internas: [it.origem, it.obs].filter(Boolean).join(' — '),
        });
        opId = e.id;
      } else {
        const p = await base44.entities.Pipeline.create({
          ...(vendOk ? { vendedor_id: vend.id, vendedor_nome: vend.nome } : { vendedor_nome: respNome }),
          cliente_id: c.id, cliente_nome: c.nome, cliente_cpf_cnpj: c.cpf_cnpj || '', cliente_telefone: c.telefone || '',
          produto: jornada.nome, valor_estimado: Number(it.valor) || 0, temperatura: 'Morno',
          origem: it.fonte === 'indicacao' ? 'Indicação' : 'Lead',
          descricao: [it.origem, it.obs].filter(Boolean).join(' — '),
        });
        opId = 'p_' + p.id;
      }
      // 3) Marca a origem como em atendimento/convertida
      if (it.fonte === 'lead') await base44.entities.Lead.update(it.raw.id, { convertido: true, convertido_em: new Date().toISOString(), cliente_id: c.id }).catch(() => {});
      else await base44.entities.LeadIndicacao.update(it.raw.id, { status: 'em_atendimento', cliente_id: c.id }).catch(() => {});
      toast.success(`Operação ${jornada.nome} iniciada para ${c.nome}.`);
      onIniciada?.(opId);
    } catch (e) { toast.error(e.message || 'Não foi possível iniciar.'); }
    setIniciando(null);
  };

  return (
    <div style={{ borderRadius: 18, background: C.card, border: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', minHeight: 200, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: `1px solid ${C.line}`, gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: C.txt, flex: 1 }}>Leads e indicações para {jornada.nome}</span>
        {vend?.id && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.muted, cursor: 'pointer' }}>
            <input type="checkbox" checked={soMeus} onChange={e => setSoMeus(e.target.checked)} /> Só os meus leads
          </label>
        )}
        <span style={{ fontSize: 12, color: C.muted2 }}>{itens?.length ?? ''}</span>
      </div>
      {itens === null && <div style={{ padding: 24, display: 'flex', gap: 8, alignItems: 'center', color: C.muted, fontSize: 13 }}><Loader2 className="w-4 h-4 animate-spin" /> Buscando leads…</div>}
      {itens?.length === 0 && (
        <div style={{ padding: '28px 18px', fontSize: 14, color: C.muted, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <Inbox className="w-6 h-6" /> Nenhum lead ou indicação aguardando para {jornada.nome}.
        </div>
      )}
      {(itens || []).map(it => (
        <div key={it.id} className="vx-row-hover" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderTop: `1px solid ${C.line}`, fontSize: 14 }}>
          <span style={{ width: 32, height: 32, flex: 'none', borderRadius: 16, background: t.dim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {it.fonte === 'indicacao' ? <Handshake className="w-4 h-4" style={{ color: t.txt }} /> : <UserRound className="w-4 h-4" style={{ color: t.txt }} />}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', color: C.txt, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.nome || 'Sem nome'}</span>
            <span style={{ display: 'block', fontSize: 12, color: C.muted2 }}>{[fmtDoc(it.doc), it.telefone, it.origem, dataBR(it.quando)].filter(Boolean).join(' · ')}</span>
          </span>
          {it.valor ? <span style={{ fontSize: 13, color: C.txt2 }}>{brl(it.valor)}</span> : null}
          {(it.cliente_id || dig(it.doc)) && (
            <button onClick={() => onFicha?.(it.cliente_id, it.doc)} className="vx-btn vx-btn-ghost" style={{ height: 32, padding: '0 10px', fontSize: 12 }}>Ficha</button>
          )}
          <button onClick={() => iniciar(it)} disabled={!!iniciando} className="vx-btn vx-btn-primary" style={{ height: 34, padding: '0 14px', fontSize: 13 }}>
            {iniciando === it.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {celula.fonte === 'estudo' ? 'Abrir operação' : 'Iniciar negociação'} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
