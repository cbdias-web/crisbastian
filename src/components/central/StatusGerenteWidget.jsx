import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, CheckCircle2, Lock, Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

const MOTIVOS = [
  { value: 'almoço', label: '🍽️ Almoço', duracao: 60 },
  { value: 'reunião', label: '📋 Reunião', duracao: 90 },
  { value: 'fora do expediente', label: '🏠 Fora do expediente', duracao: 480 },
  { value: 'outro', label: '⏸️ Outro motivo', duracao: 60 },
];

export default function StatusGerenteWidget({ user }) {
  const [status, setStatus] = useState(null);
  const [vendedor, setVendedor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [duracaoCustom, setDuracaoCustom] = useState('');

  useEffect(() => {
    if (!user) return;
    carregarStatus();
  }, [user]);

  const carregarStatus = async () => {
    try {
      const vends = await base44.entities.Vendedor.filter({ email: user.email });
      if (!vends.length) { setLoading(false); return; }
      const v = vends[0];
      setVendedor(v);
      const statuses = await base44.entities.StatusGerente.filter({ vendedor_id: v.id });
      // Verificar se o bloqueio expirou
      if (statuses.length) {
        const st = statuses[0];
        if (!st.disponivel && st.bloqueado_ate && new Date(st.bloqueado_ate) < new Date()) {
          await base44.entities.StatusGerente.update(st.id, { disponivel: true, motivo_bloqueio: null, bloqueado_ate: null });
          setStatus({ ...st, disponivel: true });
        } else {
          setStatus(st);
        }
      }
    } catch (e) {}
    setLoading(false);
  };

  const bloquear = async (motivo, duracaoMin) => {
    if (!vendedor) return;
    setSalvando(true);
    setShowMenu(false);
    const bloqueado_ate = new Date(Date.now() + duracaoMin * 60000).toISOString();
    try {
      if (status?.id) {
        const s = await base44.entities.StatusGerente.update(status.id, {
          disponivel: false, motivo_bloqueio: motivo, bloqueado_ate, atualizado_em: new Date().toISOString(),
        });
        setStatus(s);
      } else {
        const s = await base44.entities.StatusGerente.create({
          vendedor_id: vendedor.id, vendedor_nome: vendedor.nome,
          disponivel: false, motivo_bloqueio: motivo, bloqueado_ate, atualizado_em: new Date().toISOString(),
        });
        setStatus(s);
      }
      toast.success(`Agenda bloqueada por ${duracaoMin} min — você não receberá novos leads neste período.`);
    } catch (e) { toast.error('Erro ao atualizar status'); }
    setSalvando(false);
  };

  const liberar = async () => {
    if (!vendedor) return;
    setSalvando(true);
    try {
      if (status?.id) {
        const s = await base44.entities.StatusGerente.update(status.id, {
          disponivel: true, motivo_bloqueio: null, bloqueado_ate: null, atualizado_em: new Date().toISOString(),
        });
        setStatus(s);
      } else {
        const s = await base44.entities.StatusGerente.create({
          vendedor_id: vendedor.id, vendedor_nome: vendedor.nome,
          disponivel: true, atualizado_em: new Date().toISOString(),
        });
        setStatus(s);
      }
      toast.success('Agenda liberada — você voltará a receber leads!');
    } catch (e) { toast.error('Erro ao atualizar status'); }
    setSalvando(false);
  };

  if (loading || !vendedor) return null;

  const isDisponivel = !status || status.disponivel;
  const bloqueadoAte = status?.bloqueado_ate ? new Date(status.bloqueado_ate) : null;
  const minutosRestantes = bloqueadoAte ? Math.max(0, Math.round((bloqueadoAte - new Date()) / 60000)) : null;

  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: AURORA.surface, border: `1px solid ${isDisponivel ? 'rgba(0,212,170,0.25)' : 'rgba(239,68,68,0.3)'}` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: isDisponivel ? 'rgba(0,212,170,0.15)' : 'rgba(239,68,68,0.15)' }}>
            {isDisponivel ? <CheckCircle2 className="w-4 h-4" style={{ color: '#00D4AA' }} /> : <Lock className="w-4 h-4" style={{ color: '#f87171' }} />}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: AURORA.text }}>
              {isDisponivel ? '✅ Disponível para receber leads' : `🔒 Agenda bloqueada — ${status?.motivo_bloqueio || 'outro'}`}
            </p>
            {!isDisponivel && minutosRestantes !== null && minutosRestantes > 0 && (
              <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: '#fbbf24' }}>
                <Clock className="w-3 h-3" /> Libera em {minutosRestantes} min
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isDisponivel ? (
            <button onClick={liberar} disabled={salvando}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
              style={{ background: 'rgba(0,212,170,0.15)', color: '#00D4AA', border: '1px solid rgba(0,212,170,0.3)' }}>
              {salvando ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Liberar agenda
            </button>
          ) : (
            <div className="relative">
              <button onClick={() => setShowMenu(p => !p)} disabled={salvando}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                {salvando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
                Travar agenda
                <ChevronDown className={`w-3 h-3 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-52 rounded-xl shadow-2xl py-2 z-50" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                  {MOTIVOS.map(m => (
                    <button key={m.value} onClick={() => bloquear(m.value, m.duracao)}
                      className="w-full text-left px-3 py-2 text-sm transition"
                      style={{ color: AURORA.text }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      {m.label} <span className="text-xs" style={{ color: AURORA.textMuted }}>({m.duracao} min)</span>
                    </button>
                  ))}
                  <div className="px-3 py-2 border-t" style={{ borderColor: AURORA.border }}>
                    <p className="text-[10px] mb-1" style={{ color: AURORA.textMuted }}>Duração customizada (min):</p>
                    <div className="flex gap-1">
                      <input type="number" min="5" max="480" value={duracaoCustom}
                        onChange={e => setDuracaoCustom(e.target.value)}
                        placeholder="ex: 45"
                        className="flex-1 px-2 py-1 text-xs rounded-lg focus:outline-none"
                        style={{ background: '#0d1117', border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
                      <button onClick={() => { if (duracaoCustom) bloquear('outro', parseInt(duracaoCustom)); }}
                        className="px-2 py-1 text-xs rounded-lg font-semibold"
                        style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171' }}>OK</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}