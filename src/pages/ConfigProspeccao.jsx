import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Loader2, Settings, Plus, Trash2, Save, Download, ShieldCheck } from 'lucide-react';
import { ROTEIROS, FAQ } from '@/components/fila/roteirosPadrao';
import { PESOS_PADRAO } from '@/lib/leadUtils';

const A = { bg: '#0d1117', surface: '#161b22', surface2: '#1c2333', border: 'rgba(0,212,170,0.15)', accent: '#00D4AA', text: '#e6edf3', muted: 'rgba(230,237,243,0.55)' };
const inp = { background: A.surface2, color: A.text, border: `1px solid ${A.border}` };
const cls = 'w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none';

const MODELOS_PADRAO = [
  { k: 'm1', nome: 'Reativação — 1º contato (base)', publico: 'base_clientes', primeiro_contato: true, texto: 'Olá, {{primeiro_nome}}! Aqui é {{gerente}}, da Villela Exchange (Grupo Villela). Você já é cliente do grupo pelo contrato {{produto_contratado}} e temos soluções de proteção patrimonial e câmbio para clientes como você. Posso te explicar em 2 minutos?' },
  { k: 'm2', nome: 'Reativação — follow-up', publico: 'base_clientes', texto: 'Oi, {{primeiro_nome}}, {{gerente}} aqui de novo, da Villela Exchange. Tentei falar com você sobre soluções de proteção patrimonial para clientes do Grupo Villela. Qual o melhor horário para conversarmos?' },
  { k: 'm3', nome: 'Reativação — encerramento', publico: 'base_clientes', texto: '{{primeiro_nome}}, vou encerrar por aqui para não incomodar. Se em algum momento quiser conversar sobre proteção patrimonial ou câmbio, é só me chamar. Um abraço, {{gerente}}.' },
  { k: 'm4', nome: 'Indicação — 1º contato', publico: 'indicacao', primeiro_contato: true, texto: 'Olá, {{primeiro_nome}}! Aqui é {{gerente}}, da Villela Exchange. Recebi sua indicação para {{produto}} e queria te apresentar como funciona. Podemos falar agora por alguns minutos?' },
  { k: 'm5', nome: 'Indicação — follow-up', publico: 'indicacao', texto: 'Oi, {{primeiro_nome}}, {{gerente}} da Villela Exchange. Separei um resumo rápido sobre {{produto}}. Quando posso te ligar para tirar suas dúvidas?' },
  { k: 'm6', nome: 'Indicação — encerramento', publico: 'indicacao', texto: '{{primeiro_nome}}, não consegui falar com você e vou pausar o contato. Fico à disposição quando fizer sentido conversarmos sobre {{produto}}. — {{gerente}}, Villela Exchange' },
  { k: 'm7', nome: 'Pós-reunião — resumo', publico: 'pos_reuniao', texto: '{{primeiro_nome}}, obrigado pela conversa! Vou te enviar o resumo dos próximos passos. Qualquer dúvida, estou à disposição. — {{gerente}}' },
  { k: 'm8', nome: 'No-show — remarcar', publico: 'no_show', texto: 'Oi, {{primeiro_nome}}, não conseguimos nos encontrar na reunião de hoje. Quer remarcar? Posso sugerir novos horários.' },
];
const CADENCIAS_PADRAO = [
  { nome: 'Indicação / inbound (speed-to-lead)', padrao_para: 'indicacao', descricao: 'Ligar em até 5 min; 8 toques em 10 dias úteis.', passos: [
    { canal: 'ligacao', dias_uteis: 0, imediato: true, titulo: 'Ligar em até 5 min' }, { canal: 'whatsapp', dias_uteis: 0, horas_apos_anterior: 0.1, m: 'm4', titulo: 'WhatsApp de apresentação' },
    { canal: 'ligacao', dias_uteis: 0, horas_apos_anterior: 2, titulo: 'Segunda tentativa de ligação' }, { canal: 'ligacao', dias_uteis: 1, periodo: 'tarde', titulo: 'Ligar (D1)' },
    { canal: 'whatsapp', dias_uteis: 2, m: 'm5', titulo: 'WhatsApp de conteúdo' }, { canal: 'ligacao', dias_uteis: 4, periodo: 'manha', titulo: 'Ligar (D4)' },
    { canal: 'whatsapp', dias_uteis: 7, m: 'm6', titulo: 'WhatsApp de encerramento' }, { canal: 'ligacao', dias_uteis: 10, titulo: 'Ligação final' }] },
  { nome: 'Reativação da base de clientes', padrao_para: 'base_clientes', descricao: '5 toques em 9 dias úteis, 2 ligações.', passos: [
    { canal: 'whatsapp', dias_uteis: 0, m: 'm1', titulo: 'WhatsApp de apresentação' }, { canal: 'ligacao', dias_uteis: 1, titulo: 'Ligar' },
    { canal: 'whatsapp', dias_uteis: 3, m: 'm2', titulo: 'WhatsApp follow-up' }, { canal: 'ligacao', dias_uteis: 5, periodo: 'tarde', titulo: 'Ligar' },
    { canal: 'whatsapp', dias_uteis: 9, m: 'm3', titulo: 'WhatsApp de encerramento' }] },
  { nome: 'Pós-reunião', padrao_para: 'pos_reuniao', descricao: 'Resumo e próximos passos.', passos: [
    { canal: 'whatsapp', dias_uteis: 0, m: 'm7', titulo: 'Resumo da reunião' }, { canal: 'ligacao', dias_uteis: 1, titulo: 'Ligar para próximo passo' },
    { canal: 'whatsapp', dias_uteis: 3, titulo: 'WhatsApp de acompanhamento' }, { canal: 'ligacao', dias_uteis: 7, titulo: 'Ligar' }] },
  { nome: 'No-show', padrao_para: 'no_show', descricao: 'Remarcar reunião.', passos: [
    { canal: 'whatsapp', dias_uteis: 0, m: 'm8', titulo: 'WhatsApp para remarcar' }, { canal: 'ligacao', dias_uteis: 1, titulo: 'Ligar para remarcar' }] },
];
const CHAVE_ROTEIRO = { DOLARIZE: 'DOLARIZE', 'CONTA INTERNACIONAL': 'CONTA INTERNACIONAL', OFFSHORE: 'OFFSHORE', RATING: 'RATING', 'CANAL BANCÁRIO': 'CANAL BANCÁRIO', 'HISTÓRIA DO GRUPO VILLELA': 'HISTÓRIA DO GRUPO VILLELA', REATIVACAO: 'REATIVACAO' };

function Campo({ l, children }) { return <div><label className="block text-[10px] mb-0.5" style={{ color: A.muted }}>{l}</label>{children}</div>; }

export default function ConfigProspeccao() {
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [aba, setAba] = useState('param');
  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);
  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;
  if (!user) return <div className="min-h-screen flex items-center justify-center" style={{ background: A.bg }}><Loader2 className="w-6 h-6 animate-spin" style={{ color: A.accent }} /></div>;
  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center text-sm" style={{ background: A.bg, color: A.muted }}>Acesso restrito a administradores.</div>;

  const ABAS = [['param', 'Parâmetros'], ['cad', 'Cadências'], ['mod', 'Modelos de mensagem'], ['rot', 'Roteiros e FAQ'], ['sup', 'Lista de supressão']];
  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: A.bg, color: A.text }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-4"><Settings className="w-5 h-5" style={{ color: A.accent }} /><h1 className="text-xl font-bold">Configuração da Prospecção</h1></div>
        <div className="flex gap-1.5 mb-4 overflow-x-auto">{ABAS.map(([k, l]) => <button key={k} onClick={() => setAba(k)} className="px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap" style={{ background: aba === k ? 'rgba(0,212,170,0.18)' : A.surface, color: aba === k ? A.accent : A.muted, border: `1px solid ${aba === k ? A.accent : A.border}` }}>{l}</button>)}</div>
        {aba === 'param' && <Parametros qc={qc} />}
        {aba === 'cad' && <Cadencias qc={qc} />}
        {aba === 'mod' && <Modelos qc={qc} />}
        {aba === 'rot' && <Roteiros qc={qc} />}
        {aba === 'sup' && <Supressao qc={qc} />}
      </div>
    </div>
  );
}

// ---------------- Parâmetros ----------------
function Parametros({ qc }) {
  const { data: cfg, isLoading } = useQuery({ queryKey: ['cfg-fila-admin'], queryFn: async () => (await base44.entities.ConfigFila.filter({ chave: 'padrao' }, '-created_date', 1))[0] || null });
  const [f, setF] = useState(null);
  const [carregando, setCarregando] = useState(false);
  useEffect(() => { if (cfg) setF({ ...cfg, score_pesos: { ...PESOS_PADRAO, ...(cfg.score_pesos || {}) }, afinidade_txt: (cfg.afinidade_produtos || []).join(', '), feriados_txt: (cfg.feriados || []).join(', ') }); }, [cfg]);

  const salvar = async () => {
    const { afinidade_txt, feriados_txt, id, created_date, updated_date, created_by, created_by_id, is_sample, ...resto } = f;
    const dados = { ...resto, chave: 'padrao', afinidade_produtos: afinidade_txt.split(',').map(s => s.trim()).filter(Boolean), feriados: feriados_txt.split(',').map(s => s.trim()).filter(Boolean) };
    for (const k of ['cap_carteira_dia', 'novos_por_dia', 'backlog_max_por_gerente', 'toques_dia', 'limite_primeiro_whatsapp_dia', 'sla_inbound_alerta_min', 'sla_inbound_escalonar_min', 'horas_inercia', 'dias_sem_contato']) dados[k] = Number(dados[k]) || undefined;
    try { cfg ? await base44.entities.ConfigFila.update(cfg.id, dados) : await base44.entities.ConfigFila.create(dados); toast.success('Parâmetros salvos.'); qc.invalidateQueries({ queryKey: ['cfg-fila-admin'] }); qc.invalidateQueries({ queryKey: ['cfg-fila'] }); } catch (e) { toast.error(e.message); }
  };

  const carregarPadroes = async () => {
    if (!confirm('Criar parâmetros, modelos de mensagem, cadências, roteiros e FAQ padrão? (Itens já existentes não são duplicados por nome.)')) return;
    setCarregando(true);
    try {
      if (!cfg) await base44.entities.ConfigFila.create({ chave: 'padrao', cap_carteira_dia: 40, novos_por_dia: 15, backlog_max_por_gerente: 60, liberacao_automatica_ativa: true, toques_dia: 80, limite_primeiro_whatsapp_dia: 40, janela_inicio: '09:00', janela_fim: '18:00', sla_inbound_alerta_min: 5, sla_inbound_escalonar_min: 10, horas_inercia: 48, dias_sem_contato: 5, texto_descadastro: 'Se preferir não receber contato, responda SAIR.', score_pesos: PESOS_PADRAO, email_plano_dia: true });
      const mExist = await base44.entities.ModeloMensagem.list('nome', 200); const ids = {};
      for (const m of MODELOS_PADRAO) { const ex = mExist.find(x => x.nome === m.nome); ids[m.k] = ex ? ex.id : (await base44.entities.ModeloMensagem.create({ nome: m.nome, canal: 'whatsapp', publico: m.publico, texto: m.texto, primeiro_contato: !!m.primeiro_contato, ativo: true, aprovado_compliance: false, versao: 1 })).id; }
      const cExist = await base44.entities.Cadencia.list('nome', 100);
      for (const c of CADENCIAS_PADRAO) if (!cExist.find(x => x.nome === c.nome)) await base44.entities.Cadencia.create({ nome: c.nome, descricao: c.descricao, padrao_para: c.padrao_para, ativa: true, ao_final: 'nutricao', passos: c.passos.map(({ m, ...p }) => ({ ...p, modelo_id: m ? ids[m] : undefined })) });
      const rExist = await base44.entities.RoteiroProduto.list('chave', 100);
      for (const [chave, r] of Object.entries(ROTEIROS)) if (CHAVE_ROTEIRO[chave] && !rExist.find(x => x.chave === chave)) await base44.entities.RoteiroProduto.create({ chave, nome: r.nome, pitch: r.pitch, objecoes: r.objecoes, ativo: true, aprovado_compliance: false, versao: 1 });
      const fExist = await base44.entities.FaqItem.list('categoria', 300);
      for (const q of FAQ) if (!fExist.find(x => x.pergunta === q.q)) await base44.entities.FaqItem.create({ categoria: q.cat, pergunta: q.q, resposta: q.a, ativo: true, aprovado_compliance: false });
      toast.success('Padrões carregados. Revise e marque como "aprovado pelo compliance" o que o jurídico liberar.');
      qc.invalidateQueries();
    } catch (e) { toast.error('Erro: ' + e.message); }
    setCarregando(false);
  };

  if (isLoading) return <Loader2 className="w-5 h-5 animate-spin" style={{ color: A.accent }} />;
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div className="space-y-4">
      {!cfg && <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>Ainda não há configuração salva: o sistema usa os valores antigos (cap 10, 5 leads/dia). Clique em “Carregar padrões” para criar tudo de uma vez.</div>}
      <button onClick={carregarPadroes} disabled={carregando} className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-40" style={{ background: A.accent, color: '#0d1117' }}>{carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Carregar padrões (parâmetros, modelos, cadências, roteiros e FAQ)</button>
      {f && (
        <div className="rounded-2xl p-4 space-y-4" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Campo l="Capacidade da fila (carteira)/gerente"><input type="number" className={cls} style={inp} value={f.cap_carteira_dia ?? ''} onChange={e => set('cap_carteira_dia', e.target.value)} /></Campo>
            <Campo l="Pausa a liberação se o gerente tiver mais de (itens em aberto)"><input type="number" className={cls} style={inp} value={f.backlog_max_por_gerente ?? ''} onChange={e => set('backlog_max_por_gerente', e.target.value)} /></Campo>
            <Campo l="Leads novos por dia/gerente (cota diária)"><input type="number" className={cls} style={inp} value={f.novos_por_dia ?? ''} onChange={e => set('novos_por_dia', e.target.value)} /></Campo>
            <Campo l="Toques por dia/gerente (meta)"><input type="number" className={cls} style={inp} value={f.toques_dia ?? ''} onChange={e => set('toques_dia', e.target.value)} /></Campo>
            <Campo l="Máx. primeiros WhatsApps/dia"><input type="number" className={cls} style={inp} value={f.limite_primeiro_whatsapp_dia ?? ''} onChange={e => set('limite_primeiro_whatsapp_dia', e.target.value)} /></Campo>
            <Campo l="Janela — início"><input type="time" className={cls} style={inp} value={f.janela_inicio || ''} onChange={e => set('janela_inicio', e.target.value)} /></Campo>
            <Campo l="Janela — fim"><input type="time" className={cls} style={inp} value={f.janela_fim || ''} onChange={e => set('janela_fim', e.target.value)} /></Campo>
            <Campo l="SLA inbound — alerta (min)"><input type="number" className={cls} style={inp} value={f.sla_inbound_alerta_min ?? ''} onChange={e => set('sla_inbound_alerta_min', e.target.value)} /></Campo>
            <Campo l="SLA inbound — escalonar (min)"><input type="number" className={cls} style={inp} value={f.sla_inbound_escalonar_min ?? ''} onChange={e => set('sla_inbound_escalonar_min', e.target.value)} /></Campo>
            <Campo l="Inércia em Em Contato (horas)"><input type="number" className={cls} style={inp} value={f.horas_inercia ?? ''} onChange={e => set('horas_inercia', e.target.value)} /></Campo>
            <Campo l="Dias na agenda sem atenção"><input type="number" className={cls} style={inp} value={f.dias_sem_contato ?? ''} onChange={e => set('dias_sem_contato', e.target.value)} /></Campo>
            <label className="flex items-center gap-2 text-xs col-span-2 mt-4"><input type="checkbox" checked={f.liberacao_automatica_ativa !== false} onChange={e => set('liberacao_automatica_ativa', e.target.checked)} /> Liberação automática de leads ligada</label>
            <label className="flex items-center gap-2 text-xs col-span-2 mt-4"><input type="checkbox" checked={f.email_plano_dia !== false} onChange={e => set('email_plano_dia', e.target.checked)} /> Enviar e-mail “Plano do Dia” às 08:00</label>
          </div>
          <Campo l="Texto de descadastro (anexado ao 1º WhatsApp)"><input className={cls} style={inp} value={f.texto_descadastro || ''} onChange={e => set('texto_descadastro', e.target.value)} /></Campo>
          <Campo l="Base legal LGPD padrão (definida pelo jurídico)"><input className={cls} style={inp} value={f.base_legal_padrao || ''} onChange={e => set('base_legal_padrao', e.target.value)} placeholder="Ex.: legítimo interesse — clientes ativos do Grupo Villela" /></Campo>
          <Campo l="Feriados/dias sem contato (AAAA-MM-DD, separados por vírgula)"><input className={cls} style={inp} value={f.feriados_txt || ''} onChange={e => set('feriados_txt', e.target.value)} /></Campo>
          <div>
            <p className="text-[11px] font-bold mb-2" style={{ color: A.accent }}>Pesos do score (0–100)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.keys(PESOS_PADRAO).map(k => <Campo key={k} l={k.replace('_', ' ')}><input type="number" className={cls} style={inp} value={f.score_pesos?.[k] ?? ''} onChange={e => set('score_pesos', { ...f.score_pesos, [k]: Number(e.target.value) })} /></Campo>)}
            </div>
            <div className="mt-3"><Campo l="Produtos contratados com afinidade (palavras-chave, vírgula)"><input className={cls} style={inp} value={f.afinidade_txt || ''} onChange={e => set('afinidade_txt', e.target.value)} placeholder="regulariz, garantia, rating" /></Campo></div>
            <p className="text-[10px] mt-1" style={{ color: A.muted }}>Os pesos valem para as próximas importações; leads já importados mantêm o score calculado.</p>
          </div>
          <button onClick={salvar} className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2" style={{ background: A.accent, color: '#0d1117' }}><Save className="w-4 h-4" /> Salvar parâmetros</button>
        </div>
      )}
    </div>
  );
}

// ---------------- Cadências ----------------
function Cadencias({ qc }) {
  const { data: cads = [] } = useQuery({ queryKey: ['cad-admin'], queryFn: () => base44.entities.Cadencia.list('nome', 100) });
  const { data: modelos = [] } = useQuery({ queryKey: ['mod-admin'], queryFn: () => base44.entities.ModeloMensagem.list('nome', 200) });
  const [ed, setEd] = useState(null);
  const salvar = async () => {
    const { id, created_date, updated_date, created_by, created_by_id, is_sample, ...d } = ed;
    try { id ? await base44.entities.Cadencia.update(id, d) : await base44.entities.Cadencia.create(d); toast.success('Cadência salva.'); setEd(null); qc.invalidateQueries({ queryKey: ['cad-admin'] }); qc.invalidateQueries({ queryKey: ['cadencias-ativas'] }); } catch (e) { toast.error(e.message); }
  };
  const apagar = async (c) => { if (!confirm(`Excluir a cadência "${c.nome}"? Leads já nela perdem o vínculo.`)) return; await base44.entities.Cadencia.delete(c.id); qc.invalidateQueries({ queryKey: ['cad-admin'] }); };
  const setPasso = (i, k, v) => setEd(e => ({ ...e, passos: e.passos.map((p, j) => (j === i ? { ...p, [k]: v } : p)) }));
  return (
    <div className="space-y-3">
      <button onClick={() => setEd({ nome: '', ativa: true, ao_final: 'nutricao', padrao_para: 'nenhum', passos: [{ canal: 'ligacao', dias_uteis: 0, titulo: '' }] })} className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5" style={{ background: A.accent, color: '#0d1117' }}><Plus className="w-4 h-4" /> Nova cadência</button>
      {cads.length === 0 && <p className="text-xs" style={{ color: A.muted }}>Nenhuma cadência. Use “Carregar padrões” na aba Parâmetros.</p>}
      {cads.map(c => (
        <div key={c.id} className="rounded-xl p-3 flex items-center justify-between gap-3" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
          <div className="min-w-0"><p className="text-sm font-semibold truncate">{c.nome} {!c.ativa && <span className="text-[10px]" style={{ color: '#f87171' }}>(inativa)</span>}</p><p className="text-[11px]" style={{ color: A.muted }}>{(c.passos || []).length} passos · padrão para: {c.padrao_para || 'nenhum'} · ao final: {c.ao_final}</p></div>
          <div className="flex gap-1.5"><button onClick={() => setEd(c)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: A.surface2, color: A.accent }}>Editar</button><button onClick={() => apagar(c)} className="p-1.5 rounded-lg" style={{ background: A.surface2, color: '#f87171' }}><Trash2 className="w-4 h-4" /></button></div>
        </div>
      ))}
      {ed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl p-5 space-y-3" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
            <div className="grid grid-cols-2 gap-3">
              <Campo l="Nome"><input className={cls} style={inp} value={ed.nome} onChange={e => setEd({ ...ed, nome: e.target.value })} /></Campo>
              <Campo l="Aplicada automaticamente a"><select className={cls} style={inp} value={ed.padrao_para || 'nenhum'} onChange={e => setEd({ ...ed, padrao_para: e.target.value })}>{['nenhum', 'base_clientes', 'indicacao', 'pos_reuniao', 'no_show'].map(o => <option key={o}>{o}</option>)}</select></Campo>
              <Campo l="Ao final sem resposta"><select className={cls} style={inp} value={ed.ao_final} onChange={e => setEd({ ...ed, ao_final: e.target.value })}><option value="nutricao">Nutrição</option><option value="descartado">Desqualificar</option><option value="manter">Manter</option></select></Campo>
              <label className="flex items-center gap-2 text-xs mt-5"><input type="checkbox" checked={ed.ativa !== false} onChange={e => setEd({ ...ed, ativa: e.target.checked })} /> Ativa</label>
            </div>
            <p className="text-[11px] font-bold" style={{ color: A.accent }}>Passos (offset em dias úteis a partir do início)</p>
            {ed.passos.map((p, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-2"><Campo l="Canal"><select className={cls} style={inp} value={p.canal} onChange={e => setPasso(i, 'canal', e.target.value)}>{['ligacao', 'whatsapp', 'email', 'tarefa'].map(o => <option key={o}>{o}</option>)}</select></Campo></div>
                <div className="col-span-2"><Campo l="D+ (dias úteis)"><input type="number" className={cls} style={inp} value={p.dias_uteis ?? 0} onChange={e => setPasso(i, 'dias_uteis', Number(e.target.value))} /></Campo></div>
                <div className="col-span-2"><Campo l="Horas após anterior"><input type="number" step="0.1" className={cls} style={inp} value={p.horas_apos_anterior ?? ''} onChange={e => setPasso(i, 'horas_apos_anterior', e.target.value === '' ? undefined : Number(e.target.value))} /></Campo></div>
                <div className="col-span-3"><Campo l="Título"><input className={cls} style={inp} value={p.titulo || ''} onChange={e => setPasso(i, 'titulo', e.target.value)} /></Campo></div>
                <div className="col-span-2"><Campo l="Modelo"><select className={cls} style={inp} value={p.modelo_id || ''} onChange={e => setPasso(i, 'modelo_id', e.target.value || undefined)}><option value="">—</option>{modelos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}</select></Campo></div>
                <button onClick={() => setEd({ ...ed, passos: ed.passos.filter((_, j) => j !== i) })} className="p-1.5 mb-0.5" style={{ color: '#f87171' }}><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            <button onClick={() => setEd({ ...ed, passos: [...ed.passos, { canal: 'ligacao', dias_uteis: (ed.passos.at(-1)?.dias_uteis ?? 0) + 1, titulo: '' }] })} className="text-xs underline" style={{ color: A.accent }}>+ adicionar passo</button>
            <div className="flex gap-2 justify-end pt-2"><button onClick={() => setEd(null)} className="px-4 py-2 rounded-xl text-xs" style={{ background: A.surface2, color: A.muted }}>Cancelar</button><button onClick={salvar} disabled={!ed.nome} className="px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-40" style={{ background: A.accent, color: '#0d1117' }}>Salvar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- Modelos ----------------
function Modelos({ qc }) {
  const { data: itens = [] } = useQuery({ queryKey: ['mod-admin'], queryFn: () => base44.entities.ModeloMensagem.list('nome', 200) });
  const [ed, setEd] = useState(null);
  const salvar = async () => { const { id, created_date, updated_date, created_by, created_by_id, is_sample, ...d } = ed; try { id ? await base44.entities.ModeloMensagem.update(id, { ...d, versao: (d.versao || 1) + 1 }) : await base44.entities.ModeloMensagem.create({ ...d, versao: 1 }); toast.success('Modelo salvo.'); setEd(null); qc.invalidateQueries({ queryKey: ['mod-admin'] }); qc.invalidateQueries({ queryKey: ['modelos-wa'] }); } catch (e) { toast.error(e.message); } };
  const apagar = async (m) => { if (!confirm('Excluir modelo?')) return; await base44.entities.ModeloMensagem.delete(m.id); qc.invalidateQueries({ queryKey: ['mod-admin'] }); };
  return (
    <div className="space-y-3">
      <button onClick={() => setEd({ nome: '', canal: 'whatsapp', publico: 'geral', texto: '', ativo: true, primeiro_contato: false, aprovado_compliance: false })} className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5" style={{ background: A.accent, color: '#0d1117' }}><Plus className="w-4 h-4" /> Novo modelo</button>
      <p className="text-[11px]" style={{ color: A.muted }}>Variáveis: {'{{primeiro_nome}} {{gerente}} {{produto_contratado}} {{produto}} {{responsavel_origem}}'}. Marque “1º contato” para anexar o texto de descadastro e contar no limite diário.</p>
      {itens.map(m => (
        <div key={m.id} className="rounded-xl p-3" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
          <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{m.nome} <span className="text-[10px]" style={{ color: A.muted }}>· {m.publico} · v{m.versao || 1} · {m.envios || 0} envios / {m.respostas || 0} respostas</span> {m.aprovado_compliance ? <ShieldCheck className="w-3.5 h-3.5 inline" style={{ color: '#34d399' }} /> : <span className="text-[10px]" style={{ color: '#fbbf24' }}>não aprovado</span>}</p>
            <div className="flex gap-1.5"><button onClick={() => setEd(m)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: A.surface2, color: A.accent }}>Editar</button><button onClick={() => apagar(m)} className="p-1.5" style={{ color: '#f87171' }}><Trash2 className="w-4 h-4" /></button></div></div>
          <p className="text-[11px] mt-1 whitespace-pre-wrap" style={{ color: A.muted }}>{m.texto}</p>
        </div>
      ))}
      {ed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-xl rounded-2xl p-5 space-y-3" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
            <div className="grid grid-cols-2 gap-3">
              <Campo l="Nome"><input className={cls} style={inp} value={ed.nome} onChange={e => setEd({ ...ed, nome: e.target.value })} /></Campo>
              <Campo l="Público"><select className={cls} style={inp} value={ed.publico} onChange={e => setEd({ ...ed, publico: e.target.value })}>{['geral', 'base_clientes', 'indicacao', 'pos_reuniao', 'no_show'].map(o => <option key={o}>{o}</option>)}</select></Campo>
            </div>
            <Campo l="Texto"><textarea rows={6} className={cls} style={inp} value={ed.texto} onChange={e => setEd({ ...ed, texto: e.target.value })} /></Campo>
            <div className="flex gap-4 text-xs flex-wrap">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!ed.primeiro_contato} onChange={e => setEd({ ...ed, primeiro_contato: e.target.checked })} /> 1º contato</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={ed.ativo !== false} onChange={e => setEd({ ...ed, ativo: e.target.checked })} /> Ativo</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!ed.aprovado_compliance} onChange={e => setEd({ ...ed, aprovado_compliance: e.target.checked })} /> Aprovado pelo compliance</label>
            </div>
            <div className="flex gap-2 justify-end"><button onClick={() => setEd(null)} className="px-4 py-2 rounded-xl text-xs" style={{ background: A.surface2, color: A.muted }}>Cancelar</button><button onClick={salvar} disabled={!ed.nome || !ed.texto} className="px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-40" style={{ background: A.accent, color: '#0d1117' }}>Salvar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- Roteiros e FAQ ----------------
function Roteiros({ qc }) {
  const { data: rots = [] } = useQuery({ queryKey: ['rot-admin'], queryFn: () => base44.entities.RoteiroProduto.list('chave', 100) });
  const { data: faqs = [] } = useQuery({ queryKey: ['faq-admin'], queryFn: () => base44.entities.FaqItem.list('categoria', 300) });
  const [ed, setEd] = useState(null); // { tipo: 'rot'|'faq', ...}
  const salvar = async () => {
    const { tipo, id, created_date, updated_date, created_by, created_by_id, is_sample, obj_txt, ...d } = ed;
    try {
      if (tipo === 'rot') { d.objecoes = (obj_txt || '').split('\n').map(s => s.trim()).filter(Boolean); id ? await base44.entities.RoteiroProduto.update(id, { ...d, versao: (d.versao || 1) + 1 }) : await base44.entities.RoteiroProduto.create({ ...d, versao: 1 }); }
      else id ? await base44.entities.FaqItem.update(id, d) : await base44.entities.FaqItem.create(d);
      toast.success('Salvo.'); setEd(null); qc.invalidateQueries({ queryKey: ['rot-admin'] }); qc.invalidateQueries({ queryKey: ['faq-admin'] }); qc.invalidateQueries({ queryKey: ['roteiros-db'] }); qc.invalidateQueries({ queryKey: ['faq-db'] });
    } catch (e) { toast.error(e.message); }
  };
  const apagar = async (tipo, id) => { if (!confirm('Excluir?')) return; await (tipo === 'rot' ? base44.entities.RoteiroProduto : base44.entities.FaqItem).delete(id); qc.invalidateQueries({ queryKey: ['rot-admin'] }); qc.invalidateQueries({ queryKey: ['faq-admin'] }); };
  return (
    <div className="space-y-4">
      <p className="text-[11px]" style={{ color: A.muted }}>Enquanto não houver registros, o app usa os roteiros e o FAQ padrão do código. A IA responde somente com base no que está aqui. Marque o que o compliance aprovou.</p>
      <div className="flex gap-2"><button onClick={() => setEd({ tipo: 'rot', chave: '', nome: '', pitch: '', obj_txt: '', ativo: true, aprovado_compliance: false })} className="px-3 py-2 rounded-xl text-xs font-bold" style={{ background: A.accent, color: '#0d1117' }}>+ Roteiro</button><button onClick={() => setEd({ tipo: 'faq', categoria: '', pergunta: '', resposta: '', ativo: true, aprovado_compliance: false })} className="px-3 py-2 rounded-xl text-xs font-bold" style={{ background: A.surface2, color: A.accent }}>+ FAQ</button></div>
      <p className="text-xs font-bold" style={{ color: A.accent }}>Roteiros ({rots.length})</p>
      {rots.map(r => <div key={r.id} className="rounded-xl p-3 flex justify-between gap-2" style={{ background: A.surface, border: `1px solid ${A.border}` }}><p className="text-xs"><b>{r.chave}</b> — {r.nome} {r.aprovado_compliance ? '✅' : <span style={{ color: '#fbbf24' }}>(não aprovado)</span>}</p><div className="flex gap-1.5"><button onClick={() => setEd({ tipo: 'rot', ...r, obj_txt: (r.objecoes || []).join('\n') })} className="text-xs" style={{ color: A.accent }}>Editar</button><button onClick={() => apagar('rot', r.id)} style={{ color: '#f87171' }}><Trash2 className="w-3.5 h-3.5" /></button></div></div>)}
      <p className="text-xs font-bold mt-2" style={{ color: A.accent }}>FAQ ({faqs.length})</p>
      {faqs.map(q => <div key={q.id} className="rounded-xl p-2.5 flex justify-between gap-2" style={{ background: A.surface, border: `1px solid ${A.border}` }}><p className="text-xs min-w-0"><b>[{q.categoria}]</b> {q.pergunta} {q.aprovado_compliance ? '✅' : ''}</p><div className="flex gap-1.5 flex-shrink-0"><button onClick={() => setEd({ tipo: 'faq', ...q })} className="text-xs" style={{ color: A.accent }}>Editar</button><button onClick={() => apagar('faq', q.id)} style={{ color: '#f87171' }}><Trash2 className="w-3.5 h-3.5" /></button></div></div>)}
      {ed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl p-5 space-y-3" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
            {ed.tipo === 'rot' ? (<>
              <div className="grid grid-cols-2 gap-3"><Campo l="Chave (DOLARIZE, OFFSHORE, REATIVACAO…)"><input className={cls} style={inp} value={ed.chave} onChange={e => setEd({ ...ed, chave: e.target.value.toUpperCase() })} /></Campo><Campo l="Nome"><input className={cls} style={inp} value={ed.nome} onChange={e => setEd({ ...ed, nome: e.target.value })} /></Campo></div>
              <Campo l="Pitch (use [NOME] e [GERENTE])"><textarea rows={10} className={cls} style={inp} value={ed.pitch} onChange={e => setEd({ ...ed, pitch: e.target.value })} /></Campo>
              <Campo l="Objeções comuns (uma por linha)"><textarea rows={4} className={cls} style={inp} value={ed.obj_txt} onChange={e => setEd({ ...ed, obj_txt: e.target.value })} /></Campo>
            </>) : (<>
              <Campo l="Categoria"><input className={cls} style={inp} value={ed.categoria || ''} onChange={e => setEd({ ...ed, categoria: e.target.value })} /></Campo>
              <Campo l="Pergunta"><input className={cls} style={inp} value={ed.pergunta} onChange={e => setEd({ ...ed, pergunta: e.target.value })} /></Campo>
              <Campo l="Resposta aprovada"><textarea rows={5} className={cls} style={inp} value={ed.resposta} onChange={e => setEd({ ...ed, resposta: e.target.value })} /></Campo>
            </>)}
            <div className="flex gap-4 text-xs"><label className="flex items-center gap-1.5"><input type="checkbox" checked={ed.ativo !== false} onChange={e => setEd({ ...ed, ativo: e.target.checked })} /> Ativo</label><label className="flex items-center gap-1.5"><input type="checkbox" checked={!!ed.aprovado_compliance} onChange={e => setEd({ ...ed, aprovado_compliance: e.target.checked })} /> Aprovado pelo compliance</label></div>
            <div className="flex gap-2 justify-end"><button onClick={() => setEd(null)} className="px-4 py-2 rounded-xl text-xs" style={{ background: A.surface2, color: A.muted }}>Cancelar</button><button onClick={salvar} className="px-4 py-2 rounded-xl text-xs font-bold" style={{ background: A.accent, color: '#0d1117' }}>Salvar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- Supressão ----------------
function Supressao({ qc }) {
  const { data: itens = [] } = useQuery({ queryKey: ['sup-admin'], queryFn: () => base44.entities.ListaSupressao.list('-created_date', 500) });
  const [nome, setNome] = useState(''); const [doc, setDoc] = useState(''); const [tel, setTel] = useState('');
  const add = async () => { try { await base44.entities.ListaSupressao.create({ nome, cpf_cnpj: doc.replace(/\D/g, ''), telefone_e164: tel ? `+55${tel.replace(/\D/g, '').replace(/^55/, '')}` : '', motivo: 'opt_out', criado_por: 'admin' }); setNome(''); setDoc(''); setTel(''); qc.invalidateQueries({ queryKey: ['sup-admin'] }); toast.success('Adicionado à supressão.'); } catch (e) { toast.error(e.message); } };
  const rem = async (i) => { if (!confirm('Remover da lista de supressão?')) return; await base44.entities.ListaSupressao.delete(i.id); qc.invalidateQueries({ queryKey: ['sup-admin'] }); };
  return (
    <div className="space-y-3">
      <p className="text-[11px]" style={{ color: A.muted }}>Quem pediu para não ser contatado nunca volta à fila nem a importações. Entradas são criadas automaticamente pelo botão “Não quer contato”.</p>
      <div className="flex gap-2 flex-wrap"><input placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} className={cls + ' !w-40'} style={inp} /><input placeholder="CPF/CNPJ" value={doc} onChange={e => setDoc(e.target.value)} className={cls + ' !w-40'} style={inp} /><input placeholder="Telefone (DDD+número)" value={tel} onChange={e => setTel(e.target.value)} className={cls + ' !w-44'} style={inp} /><button onClick={add} disabled={!doc && !tel} className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40" style={{ background: A.accent, color: '#0d1117' }}>Adicionar</button></div>
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${A.border}` }}>
        {itens.length === 0 && <p className="p-4 text-xs" style={{ color: A.muted }}>Lista vazia.</p>}
        {itens.map(i => <div key={i.id} className="flex justify-between items-center px-3 py-2 text-xs" style={{ background: A.surface, borderTop: `1px solid ${A.border}` }}><span>{i.nome || '—'} · {i.cpf_cnpj || '—'} · {i.telefone_e164 || '—'} · <span style={{ color: A.muted }}>{i.motivo}</span></span><button onClick={() => rem(i)} style={{ color: '#f87171' }}><Trash2 className="w-3.5 h-3.5" /></button></div>)}
      </div>
    </div>
  );
}
