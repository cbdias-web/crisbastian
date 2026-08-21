import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PortalIndicadorAuth from '@/components/portal/PortalIndicadorAuth';

const AURORA = {
  bg: '#0d1117',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

export default function PortalIndicadorAdmin() {
  const { parceiroId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [parceiro, setParceiro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const u = await base44.auth.me();
        if (!alive) return;
        if (u?.role !== 'admin') { setErro('Acesso restrito a administradores.'); setLoading(false); return; }
        setUser(u);
        const ps = await base44.entities.Parceiro.filter({ id: parceiroId });
        if (!alive) return;
        if (!ps.length) { setErro('Indicador não encontrado.'); setLoading(false); return; }
        setParceiro(ps[0]);
      } catch (e) {
        if (alive) setErro('Erro ao carregar o indicador: ' + (e?.message || ''));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [parceiroId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: AURORA.bg }}>
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'rgba(0,212,170,0.2)', borderTopColor: AURORA.accent }} />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: AURORA.bg }}>
        <div className="text-center max-w-sm">
          <p className="font-bold mb-2" style={{ color: AURORA.text }}>{erro}</p>
          <button onClick={() => navigate('/DashParceiro')}
            className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: AURORA.accent, color: '#0d1117' }}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <PortalIndicadorAuth
      user={user}
      parceiro={parceiro}
      modoAdmin
      onSairAdmin={() => navigate('/DashParceiro')}
    />
  );
}