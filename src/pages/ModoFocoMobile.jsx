import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, PhoneCall, MessageCircle, X, Smartphone, BellRing } from 'lucide-react';
import ModoFoco from '@/components/fila/ModoFoco';
import AlertasSino from '@/components/fila/AlertasSino';
import PosChamadaSheet from '@/components/fila/PosChamadaSheet';
import { telParaTel, waLink } from '@/components/fila/QrCodeContato';

const A = { bg: '#0d1117', surface: '#161b22', surface2: '#1c2333', border: 'rgba(0,212,170,0.2)', accent: '#00D4AA', text: '#e6edf3', muted: 'rgba(230,237,243,0.55)' };

// Rota /m — app do celular do gerente (PWA): recebe comandos "Ligar"/"WhatsApp" enviados do computador
// e roda o Modo Foco. A ligação sai do chip do próprio aparelho (sem custo de telefonia no CRM).
export default function ModoFocoMobile() {
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [vendedor, setVendedor] = useState(null);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState(null); // { fila, canal, cmdId }
  const [permissao, setPermissao] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'denied');
  const avisadosRef = useRef(new Set());
  const aguardandoRef = useRef(null);

  useEffect(() => {
    document.title = 'Villela Foco';
    // Manifest próprio (start_url /m) + service worker
    const link = document.querySelector('link[rel="manifest"]');
    if (link) link.setAttribute('href', '/manifest-m.json');
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    base44.auth.me().then(async (u) => {
      setUser(u);
      const vs = await base44.entities.Vendedor.filter({ email: u.email });
      if (vs[0]) setVendedor(vs[0]); else setErro('Seu usuário não está cadastrado como gerente. Peça ao administrador para vincular seu e-mail.');
    }).catch(() => base44.auth.redirectToLogin?.(window.location.href));
    return () => { if (link) link.setAttribute('href', '/manifest.json'); };
  }, []);

  const vid = vendedor?.id;
  const { data: comandos = [] } = useQuery({
    queryKey: ['comandos-discagem', vid], enabled: !!vid, refetchInterval: 4000,
    queryFn: async () => {
      const desde = new Date(Date.now() - 15 * 60000).toISOString();
      return base44.entities.ComandoDiscagem.filter({ vendedor_id: vid, status: 'enviado', criado_em: { $gte: desde } }, '-criado_em', 5);
    },
  });

  // Tempo real + notificação/vibração ao chegar comando novo
  useEffect(() => {
    if (!vid || !base44.entities.ComandoDiscagem.subscribe) return;
    let unsub; try { unsub = base44.entities.ComandoDiscagem.subscribe((ev) => { if (ev?.data?.vendedor_id === vid) qc.invalidateQueries({ queryKey: ['comandos-discagem', vid] }); }); } catch {}
    return () => { try { unsub?.(); } catch {} };
  }, [vid, qc]);
  useEffect(() => {
    for (const c of comandos) {
      if (avisadosRef.current.has(c.id)) continue;
      avisadosRef.current.add(c.id);
      try { navigator.vibrate?.([200, 100, 200]); } catch {}
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
        try { new Notification(c.canal === 'ligar' ? `Ligar para ${c.nome}` : `WhatsApp para ${c.nome}`, { body: 'Toque para abrir', tag: c.id }); } catch {}
      }
    }
  }, [comandos]);

  // Ao voltar para o app depois de tocar em Ligar/WhatsApp, abre o resultado
  useEffect(() => {
    const h = async () => {
      if (document.visibilityState !== 'visible' || !aguardandoRef.current) return;
      const { fila_id, canal } = aguardandoRef.current; aguardandoRef.current = null;
      try { const f = fila_id ? await base44.entities.FilaContato.get(fila_id) : null; if (f) setResultado({ fila: f, canal }); } catch {}
    };
    document.addEventListener('visibilitychange', h); return () => document.removeEventListener('visibilitychange', h);
  }, []);

  const executar = async (c) => {
    await base44.entities.ComandoDiscagem.update(c.id, { status: 'aberto' }).catch(() => {});
    aguardandoRef.current = { fila_id: c.fila_id, canal: c.canal === 'ligar' ? 'ligacao' : 'whatsapp' };
    qc.invalidateQueries({ queryKey: ['comandos-discagem', vid] });
    if (c.canal === 'ligar') window.location.href = telParaTel(c.telefone_e164);
    else window.open(waLink(c.telefone_e164, c.mensagem || ''), '_blank');
  };
  const dispensar = async (c) => { await base44.entities.ComandoDiscagem.update(c.id, { status: 'concluido' }).catch(() => {}); qc.invalidateQueries({ queryKey: ['comandos-discagem', vid] }); };
  const pedirPermissao = async () => { if (typeof Notification !== 'undefined') setPermissao(await Notification.requestPermission()); };

  if (erro) return <div className="min-h-screen flex items-center justify-center p-6 text-center text-sm" style={{ background: A.bg, color: A.text }}>{erro}</div>;
  if (!vendedor) return <div className="min-h-screen flex items-center justify-center" style={{ background: A.bg }}><Loader2 className="w-6 h-6 animate-spin" style={{ color: A.accent }} /></div>;

  return (
    <div className="min-h-screen p-3 pb-10" style={{ background: A.bg, color: A.text }}>
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><Smartphone className="w-4 h-4" style={{ color: A.accent }} /><div><p className="text-sm font-bold leading-tight">Modo Foco</p><p className="text-[10px]" style={{ color: A.muted }}>{vendedor.nome}</p></div></div>
          <div className="flex items-center gap-1"><AlertasSino vendedorId={vid} /><a href="/FilaContato" className="text-[11px] px-2 py-1 rounded-lg" style={{ background: A.surface2, color: A.muted }}>Painel</a></div>
        </div>

        {permissao === 'default' && <button onClick={pedirPermissao} className="w-full mb-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5" style={{ background: A.surface2, color: A.accent, border: `1px solid ${A.border}` }}><BellRing className="w-3.5 h-3.5" /> Ativar notificações neste celular</button>}

        {/* Comandos enviados do computador */}
        {comandos.map(c => (
          <div key={c.id} className="rounded-2xl p-3 mb-3 flex items-center gap-3" style={{ background: c.canal === 'ligar' ? 'rgba(59,130,249,0.15)' : 'rgba(52,211,153,0.15)', border: `1px solid ${c.canal === 'ligar' ? 'rgba(59,130,249,0.5)' : 'rgba(52,211,153,0.5)'}` }}>
            <button onClick={() => executar(c)} className="flex-1 flex items-center gap-3 text-left active:scale-95 transition">
              {c.canal === 'ligar' ? <PhoneCall className="w-7 h-7" style={{ color: '#60a5fa' }} /> : <MessageCircle className="w-7 h-7" style={{ color: '#34d399' }} />}
              <span className="min-w-0"><span className="block text-[11px]" style={{ color: A.muted }}>{c.canal === 'ligar' ? 'Toque para ligar' : 'Toque para abrir o WhatsApp'}</span><span className="block text-base font-bold truncate">{c.nome}</span><span className="block text-[11px] font-mono" style={{ color: A.muted }}>{c.telefone_e164}</span></span>
            </button>
            <button onClick={() => dispensar(c)} className="p-2" style={{ color: A.muted }}><X className="w-4 h-4" /></button>
          </div>
        ))}

        <ModoFoco vendedor={vendedor} user={user} mobile />
      </div>
      {resultado && <PosChamadaSheet fila={resultado.fila} canal={resultado.canal} onDone={() => { setResultado(null); qc.invalidateQueries({ queryKey: ['plano-dia', vid] }); }} onClose={() => setResultado(null)} />}
    </div>
  );
}
