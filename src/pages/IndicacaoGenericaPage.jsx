import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, Send, Handshake, ArrowRight, Lock, LogIn } from 'lucide-react';
import { toast } from 'sonner';

const AURORA = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

const WATERMARK_IMG = 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/ed94a18f2_generated_image.png';

const inputStyle = { background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text };
const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none";

function Field({ label, children, required }) {
  return (
    <div>
      <label className="text-[11px] font-semibold mb-1 block" style={{ color: AURORA.textMuted }}>
        {label}{required && <span style={{ color: '#f87171' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

export default function IndicacaoGenericaPage() {
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [emailLogado, setEmailLogado] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [telefone, setTelefone] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [checandoAcesso, setChecandoAcesso] = useState(true);

  // O cadastro do indicador é SEMPRE vinculado ao e-mail da conta logada:
  // é esse e-mail que o portal usa para reconhecer o indicador depois.
  // Sem login ativo, a pessoa precisa entrar (ou criar conta) antes de continuar.
  useEffect(() => {
    base44.auth.me()
      .then(u => {
        if (u?.email) {
          setEmailLogado(u.email);
          setNome(u.full_name || '');
        }
        setChecandoAcesso(false);
      })
      .catch(() => setChecandoAcesso(false));
  }, []);

  const entrarComConta = () => {
    try { localStorage.setItem('indicar_next', '/indicar'); } catch {}
    base44.auth.redirectToLogin(window.location.origin + '/indicar');
  };

  const continuar = async () => {
    if (!emailLogado) { entrarComConta(); return; }
    if (!nome.trim()) { toast.error('Informe seu nome completo'); return; }
    if (!telefone.trim()) { toast.error('Informe seu telefone/WhatsApp — é necessário para o comissionamento'); return; }

    setEnviando(true);
    try {
      const res = await base44.functions.invoke('indicacaoGenerica', {
        action: 'registrar', nome, email: emailLogado, telefone,
      });
      const r = res?.data || res;
      if (r?.success && r?.token) {
        const conviteMsg = r?.convite_enviado ? ' Enviamos um convite de acesso ao portal para o seu e-mail.' : '';
        if (r?.novo) toast.success(`Cadastro criado! Bem-vindo(a), ${r.nome.split(' ')[0]}.${conviteMsg}`);
        else if (r?.reativado) toast.success(`Cadastro reativado!${conviteMsg}`);
        else if (conviteMsg) toast.success(conviteMsg.trim());
        navigate(`/indicacao/${r.token}`, { replace: true });
      } else {
        toast.error(r?.error || 'Erro ao registrar seus dados');
        setEnviando(false);
      }
    } catch (e) {
      toast.error('Erro ao registrar: ' + (e?.message || ''));
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 relative" style={{ background: AURORA.bg, color: AURORA.text }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: `url("${WATERMARK_IMG}")`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.45, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'linear-gradient(180deg, rgba(13,17,23,0.55) 0%, rgba(13,17,23,0.45) 40%, rgba(13,17,23,0.60) 100%)', pointerEvents: 'none' }} />
      <div className="max-w-md mx-auto relative" style={{ zIndex: 1 }}>
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)' }}>
            <Handshake className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold" style={{ color: AURORA.text }}>Indique e Ganhe</h1>
          <p className="text-sm mt-1" style={{ color: AURORA.textMuted }}>
            Cadastre-se como indicador e receba comissionamento sobre as indicações convertidas.
          </p>
        </div>

        {checandoAcesso ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: AURORA.accent }} />
          </div>
        ) : !emailLogado ? (
          <div className="rounded-2xl p-5 md:p-6 space-y-4 text-center" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
            <Lock className="w-8 h-8 mx-auto" style={{ color: AURORA.accent }} />
            <p className="text-sm font-semibold" style={{ color: AURORA.text }}>Acesse sua conta para continuar</p>
            <p className="text-xs" style={{ color: AURORA.textMuted }}>
              Para garantir que suas indicações fiquem restritas ao seu perfil, entre com sua conta (ou crie uma) antes de se cadastrar como indicador.
            </p>
            <button onClick={entrarComConta}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition"
              style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)', color: '#fff' }}>
              <LogIn className="w-4 h-4" /> Entrar / Criar conta
            </button>
          </div>
        ) : (
          <div className="rounded-2xl p-5 md:p-6 space-y-4" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: AURORA.accent }}>Seus dados</p>
            <Field label="Nome completo" required>
              <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: João da Silva" className={inputCls} style={inputStyle} />
            </Field>
            <Field label="E-mail da conta (fixado)">
              <input value={emailLogado} readOnly
                className={`${inputCls} opacity-70 cursor-not-allowed`} style={inputStyle} />
              <p className="text-[10px] mt-1" style={{ color: AURORA.textMuted }}>
                Seu acesso ao portal é vinculado a este e-mail — é por ele que você volta a entrar depois.
              </p>
            </Field>
            <Field label="Telefone / WhatsApp" required>
              <input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="Ex: 5511999998888" className={inputCls} style={inputStyle} />
            </Field>

            <button onClick={continuar} disabled={enviando}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)', color: '#fff' }}>
              {enviando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
              Continuar para a Indicação
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <p className="text-center text-[11px] mt-4" style={{ color: AURORA.textMuted }}>
          Ao continuar, seu cadastro de indicador é criado automaticamente, você recebe por e-mail o convite de acesso ao portal para acompanhar suas indicações e é levado ao formulário de indicação.
        </p>
      </div>
    </div>
  );
}