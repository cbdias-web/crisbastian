import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Loader2, Search, ChevronLeft, ChevronRight, Save, Trash2, Flame } from 'lucide-react';
import { hojeBrasilia, fmtDataBR } from '@/lib/leadUtils';
import { STATUS_LABEL, horasParadoItem } from './filaContatoUtils';

const A = { surface: '#161b22', surface2: '#1c2333', border: 'rgba(0,212,170,0.15)', accent: '#00D4AA', text: '#e6edf3', muted: 'rgba(230,237,243,0.55)' };
const SEG = { quente: '#f87171', morno: '#fbbf24', frio: '#60a5fa' };
const PAGE = 25;
const STORE = 'fila_smart_views_v1';

const VIEWS = {
  ligar_hoje: { label: 'Ligar hoje', sort: '-score', q: () => ({ status: 'pendente' }) },
  retornos: { label: 'Retornos vencidos', sort: 'proximo_contato', q: (h) => ({ status: 'atendeu', proximo_contato: { $lte: h } }) },
  atrasados: { label: 'Atrasados (+48h)', sort: 'status_desde', q: () => ({ status: 'atendeu', status_desde: { $lte: new Date(Date.now() - 48 * 3600000).toISOString() } }) },
  reunioes: { label: 'Reunião marcada', sort: 'reuniao_em', q: () => ({ status: 'reuniao_marcada' }) },
  quentes: { label: 'Quentes sem contato', sort: '-score', q: () => ({ status: 'pendente', segmento: 'quente' }) },
  sem_tel: { label: 'Sem telefone válido', sort: '-updated_date', q: () => ({ telefone_valido: false }) },
  nutricao: { label: 'Nutrição', sort: '-updated_date', q: () => ({ status: 'nutricao' }) },
  convertidos: { label: 'Convertidos', sort: '-updated_date', q: () => ({ status: 'convertido' }) },
  todos: { label: 'Todos', sort: '-updated_date', q: () => ({}) },
};
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default function FilaLista({ vendedor, isAdmin, adminTudo, vendedores = [], cadencias = [], onSelect }) {
  const qc = useQueryClient();
  const [view, setView] = useState('ligar_hoje');
  const [segmento, setSegmento] = useState('');
  const [gerentes, setGerentes] = useState([]); // multisseleção (administrador)
  const [menuGerentes, setMenuGerentes] = useState(false);
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [pagina, setPagina] = useState(0);
  const [sel, setSel] = useState(new Set());
  const [salvas, setSalvas] = useState(() => { try { return JSON.parse(localStorage.getItem(STORE) || '[]'); } catch { return []; } });
  const [acao, setAcao] = useState(null); // { tipo }
  const [executando, setExecutando] = useState(false);
  const [destino, setDestino] = useState('');
  const hoje = hojeBrasilia();

  useEffect(() => { setPagina(0); setSel(new Set()); }, [view, segmento, gerentes, buscaAplicada]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['fila-lista', view, segmento, gerentes.join(','), buscaAplicada, pagina, vendedor?.id, adminTudo],
    keepPreviousData: true,
    queryFn: async () => {
      const v = VIEWS[view];
      const q = { ...v.q(hoje) };
      if (segmento) q.segmento = segmento;
      if (adminTudo) { if (gerentes.length === 1) q.vendedor_id = gerentes[0]; else if (gerentes.length > 1) q.vendedor_id = { $in: gerentes }; }
      else if (vendedor?.id) q.vendedor_id = vendedor.id;
      const comBusca = { ...q };
      const b = buscaAplicada.trim();
      const dig = b.replace(/\D/g, '');
      if (b.length >= 2) {
        if (dig.length >= 4 && dig.length === b.replace(/[\s().+-]/g, '').length) comBusca.telefone_e164 = { $regex: escRe(dig), $options: 'i' };
        else comBusca.nome = { $regex: escRe(b), $options: 'i' };
      }
      try {
        const rows = await base44.entities.FilaContato.filter(comBusca, v.sort, PAGE + 1, pagina * PAGE);
        return { rows: rows.slice(0, PAGE), mais: rows.length > PAGE, filtradoNoCliente: false };
      } catch (e) {
        // Fallback: sem regex no servidor; filtra no cliente dentro da página
        const rows = await base44.entities.FilaContato.filter(q, v.sort, 200, pagina * 200);
        const low = b.toLowerCase();
        const f = b ? rows.filter(r => (r.nome || '').toLowerCase().includes(low) || (r.telefone || '').includes(b)) : rows;
        return { rows: f.slice(0, PAGE), mais: f.length > PAGE, filtradoNoCliente: true };
      }
    },
  });
  const rows = data?.rows || [];

  const salvarVisao = () => {
    const nome = prompt('Nome da visão salva:'); if (!nome) return;
    const nova = [...salvas.filter(s => s.nome !== nome), { nome, view, segmento, gerentes }];
    setSalvas(nova); localStorage.setItem(STORE, JSON.stringify(nova)); toast.success('Visão salva neste navegador.');
  };
  const aplicarSalva = (s) => { setView(s.view); setSegmento(s.segmento || ''); setGerentes(s.gerentes || (s.gerente ? [s.gerente] : [])); };
  const apagarSalva = (nome) => { const nova = salvas.filter(s => s.nome !== nome); setSalvas(nova); localStorage.setItem(STORE, JSON.stringify(nova)); };

  const toggle = (id) => setSel(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const todosPagina = rows.length > 0 && rows.every(r => sel.has(r.id));

  const executar = async () => {
    const itens = rows.filter(r => sel.has(r.id));
    if (!itens.length || !acao) return;
    if (acao === 'opt_out' && !confirm(`Registrar OPT-OUT para ${itens.length} contato(s)? Eles serão colocados na lista de supressão.`)) return;
    setExecutando(true);
    let ok = 0;
    for (const f of itens) {
      try {
        const agora = new Date().toISOString();
        if (acao === 'opt_out') await base44.functions.invoke('registrarResultadoContato', { fila_id: f.id, canal: 'ligacao', resultado: 'opt_out', observacao: 'Opt-out em lote' });
        else if (acao === 'nutricao' || acao === 'descartado') await base44.entities.FilaContato.update(f.id, { status: acao, status_desde: agora, alerta_stale: false, historico: [...(f.historico || []), { status: acao, observacao: 'Movido em lote', data: agora }] });
        else if (acao === 'reatribuir') {
          const n = vendedores.find(x => x.id === destino); if (!n) continue;
          await base44.entities.FilaContato.update(f.id, { vendedor_id: n.id, vendedor_nome: n.nome, vendedor_email: n.email || '' });
          if (f.tipo_origem === 'carteira' && (f.cliente_id || f.ref_id)) await base44.entities.Cliente.update(f.cliente_id || f.ref_id, { vendedor_id: n.id, vendedor_nome: n.nome }).catch(() => {});
        } else if (acao === 'cadencia') {
          await base44.entities.FilaContato.update(f.id, { cadencia_id: destino || null, cadencia_passo: destino ? 0 : -1, proximo_toque_em: destino ? agora : null });
        }
        ok++;
      } catch (e) { /* segue */ }
    }
    toast.success(`${ok} de ${itens.length} atualizado(s).`);
    setExecutando(false); setAcao(null); setSel(new Set()); setDestino('');
    qc.invalidateQueries({ queryKey: ['fila-lista'] }); qc.invalidateQueries({ queryKey: ['fila-contato'] });
  };

  const Chip = ({ k, children }) => (
    <button onClick={() => setView(k)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition"
      style={{ background: view === k ? 'rgba(0,212,170,0.18)' : A.surface, color: view === k ? A.accent : A.muted, border: `1px solid ${view === k ? A.accent : A.border}` }}>{children}</button>
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1">{Object.entries(VIEWS).map(([k, v]) => <Chip key={k} k={k}>{v.label}</Chip>)}</div>
      {salvas.length > 0 && (
        <div className="flex gap-1.5 flex-wrap items-center text-[10px]" style={{ color: A.muted }}>Minhas visões:
          {salvas.map(s => <span key={s.nome} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: A.surface2 }}><button onClick={() => aplicarSalva(s)} style={{ color: A.accent }}>{s.nome}</button><button onClick={() => apagarSalva(s.nome)}><Trash2 className="w-3 h-3" /></button></span>)}
        </div>
      )}
      <div className="flex gap-2 flex-wrap items-center">
        <form onSubmit={e => { e.preventDefault(); setBuscaAplicada(busca); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl flex-1 min-w-[200px]" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
          <Search className="w-3.5 h-3.5" style={{ color: A.muted }} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nome ou telefone (Enter para buscar)" className="bg-transparent text-xs flex-1 focus:outline-none" style={{ color: A.text }} />
        </form>
        <select value={segmento} onChange={e => setSegmento(e.target.value)} className="px-2 py-2 rounded-xl text-xs" style={{ background: A.surface, color: A.text, border: `1px solid ${A.border}` }}>
          <option value="">Todos os segmentos</option><option value="quente">Quentes</option><option value="morno">Mornos</option><option value="frio">Frios</option>
        </select>
        {adminTudo && (
          <div className="relative">
            <button type="button" onClick={() => setMenuGerentes(m => !m)} className="px-3 py-2 rounded-xl text-xs flex items-center gap-1.5" style={{ background: A.surface, color: A.text, border: `1px solid ${gerentes.length ? A.accent : A.border}`, minWidth: 170 }}>
              {gerentes.length === 0 ? 'Todos os gerentes' : gerentes.length === 1 ? (vendedores.find(v => v.id === gerentes[0])?.nome || '1 gerente') : `${gerentes.length} gerentes`}
              <span className="ml-auto opacity-60">▾</span>
            </button>
            {menuGerentes && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuGerentes(false)} />
                <div className="absolute z-40 mt-1 w-64 max-h-72 overflow-y-auto rounded-xl p-1.5 shadow-2xl" style={{ background: A.surface2, border: `1px solid ${A.border}` }}>
                  <button type="button" onClick={() => setGerentes([])} className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-white/5" style={{ color: A.accent }}>Limpar seleção (todos)</button>
                  {vendedores.map(v => (
                    <label key={v.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-white/5" style={{ color: A.text }}>
                      <input type="checkbox" checked={gerentes.includes(v.id)} onChange={() => setGerentes(g => g.includes(v.id) ? g.filter(x => x !== v.id) : [...g, v.id])} /> {v.nome}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        <button onClick={salvarVisao} className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1" style={{ background: A.surface, color: A.accent, border: `1px solid ${A.border}` }}><Save className="w-3.5 h-3.5" /> Salvar visão</button>
      </div>

      {sel.size > 0 && (
        <div className="rounded-xl p-2.5 flex items-center gap-2 flex-wrap text-xs" style={{ background: 'rgba(0,212,170,0.08)', border: `1px solid ${A.border}`, color: A.text }}>
          <b>{sel.size} selecionado(s)</b>
          <select value={acao || ''} onChange={e => { setAcao(e.target.value || null); setDestino(''); }} className="px-2 py-1.5 rounded-lg" style={{ background: A.surface, color: A.text, border: `1px solid ${A.border}` }}>
            <option value="">Ação em lote…</option><option value="nutricao">Mover para Nutrição</option><option value="descartado">Mover para Desqualificado</option>
            <option value="cadencia">Aplicar/remover cadência</option>{isAdmin && <option value="reatribuir">Reatribuir gerente</option>}<option value="opt_out">Marcar opt-out</option>
          </select>
          {acao === 'reatribuir' && <select value={destino} onChange={e => setDestino(e.target.value)} className="px-2 py-1.5 rounded-lg" style={{ background: A.surface, color: A.text, border: `1px solid ${A.border}` }}><option value="">Gerente…</option>{vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}</select>}
          {acao === 'cadencia' && <select value={destino} onChange={e => setDestino(e.target.value)} className="px-2 py-1.5 rounded-lg" style={{ background: A.surface, color: A.text, border: `1px solid ${A.border}` }}><option value="">Remover cadência</option>{cadencias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>}
          <button onClick={executar} disabled={!acao || executando || (acao === 'reatribuir' && !destino)} className="px-3 py-1.5 rounded-lg font-bold disabled:opacity-40 flex items-center gap-1" style={{ background: A.accent, color: '#0d1117' }}>{executando && <Loader2 className="w-3 h-3 animate-spin" />} Aplicar</button>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr style={{ background: A.surface2, color: A.muted }}>
              <th className="p-2 w-8"><input type="checkbox" checked={todosPagina} onChange={() => setSel(todosPagina ? new Set() : new Set(rows.map(r => r.id)))} /></th>
              {['Nome', 'Telefone', 'Contratou', 'Valor', 'Score', 'Status', 'Cadência', 'Próx. contato', 'Gerente', 'Parado'].map(h => <th key={h} className="p-2 text-left font-semibold whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={11} className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin inline" style={{ color: A.accent }} /></td></tr>}
              {!isLoading && rows.length === 0 && <tr><td colSpan={11} className="p-8 text-center" style={{ color: A.muted }}>Nada nesta visão.</td></tr>}
              {rows.map(r => {
                const h = horasParadoItem(r); const d = Math.floor(h / 24);
                return (
                  <tr key={r.id} className="cursor-pointer hover:bg-white/5" style={{ borderTop: `1px solid ${A.border}`, color: A.text }} onClick={() => onSelect(r)}>
                    <td className="p-2" onClick={e => e.stopPropagation()}><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} /></td>
                    <td className="p-2 font-semibold max-w-[220px] truncate">{r.nome}</td>
                    <td className="p-2 whitespace-nowrap font-mono" style={{ color: r.telefone_valido === false ? '#f87171' : A.text }}>{r.telefone || '—'}</td>
                    <td className="p-2 max-w-[140px] truncate" style={{ color: A.muted }}>{r.produto_contratado || r.produto || '—'}</td>
                    <td className="p-2 whitespace-nowrap">{r.valor_contrato != null ? Number(r.valor_contrato).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}</td>
                    <td className="p-2 whitespace-nowrap">{r.segmento ? <span className="inline-flex items-center gap-1 font-semibold" style={{ color: SEG[r.segmento] }}><Flame className="w-3 h-3" />{r.score}</span> : '—'}</td>
                    <td className="p-2 whitespace-nowrap">{STATUS_LABEL[r.status] || r.status}</td>
                    <td className="p-2 whitespace-nowrap" style={{ color: A.muted }}>{r.cadencia_id && (r.cadencia_passo ?? 0) >= 0 ? `passo ${(r.cadencia_passo ?? 0) + 1}` : '—'}</td>
                    <td className="p-2 whitespace-nowrap" style={{ color: A.muted }}>{r.proximo_contato ? `${fmtDataBR(r.proximo_contato)} ${r.proximo_contato_hora || ''}` : '—'}</td>
                    <td className="p-2 whitespace-nowrap" style={{ color: A.muted }}>{(r.vendedor_nome || '').split(' ')[0]}</td>
                    <td className="p-2 whitespace-nowrap" style={{ color: r.status === 'atendeu' && h >= 48 ? '#f87171' : A.muted }}>{r.status === 'pendente' ? '' : d > 0 ? `${d}d` : `${Math.floor(h)}h`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-2.5 text-xs" style={{ borderTop: `1px solid ${A.border}`, color: A.muted }}>
          <span>{isFetching ? 'Atualizando…' : `Página ${pagina + 1}${data?.filtradoNoCliente ? ' (busca limitada à página)' : ''}`}</span>
          <div className="flex gap-1.5">
            <button disabled={pagina === 0} onClick={() => setPagina(p => p - 1)} className="p-1.5 rounded-lg disabled:opacity-30" style={{ background: A.surface2 }}><ChevronLeft className="w-4 h-4" /></button>
            <button disabled={!data?.mais} onClick={() => setPagina(p => p + 1)} className="p-1.5 rounded-lg disabled:opacity-30" style={{ background: A.surface2 }}><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
