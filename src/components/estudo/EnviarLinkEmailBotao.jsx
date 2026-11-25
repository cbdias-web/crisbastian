import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const A = { accent: '#00D4AA', accentDim: 'rgba(0,212,170,0.12)', border: 'rgba(255,255,255,0.08)', text: '#e6edf3' };

// Envia ao cliente o link do formulário de Estudo de Viabilidade por e-mail.
export default function EnviarLinkEmailBotao({ estudo, compacto = false, onEnviado }) {
  const [enviando, setEnviando] = useState(false);

  const enviar = async (ev) => {
    ev?.stopPropagation();
    if (enviando) return;
    if (!estudo?.cliente_email) return toast.error('Este estudo não tem e-mail do cliente cadastrado.');
    if (!estudo?.link_token) return toast.error('Gere o link do formulário antes de enviar.');
    setEnviando(true);
    try {
      const res = await base44.functions.invoke('enviarLinkEstudoEmail', { estudo_id: estudo.id });
      const data = res?.data || {};
      if (data.error) throw new Error(data.error);
      toast.success(`Link enviado para ${data.to || estudo.cliente_email}`);
      onEnviado?.(data);
    } catch (err) {
      toast.error(err?.message || 'Não foi possível enviar o e-mail.');
    } finally {
      setEnviando(false);
    }
  };

  if (compacto) {
    return (
      <button type="button" onClick={enviar} disabled={enviando}
        className="p-1.5 rounded-md transition disabled:opacity-50" style={{ color: A.accent }}
        title="Enviar link por e-mail">
        {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
      </button>
    );
  }

  return (
    <button type="button" onClick={enviar} disabled={enviando}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold disabled:opacity-60"
      style={{ background: A.accentDim, border: `1px solid ${A.border}`, color: A.accent }}>
      {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
      {enviando ? 'Enviando...' : 'Enviar por e-mail'}
    </button>
  );
}