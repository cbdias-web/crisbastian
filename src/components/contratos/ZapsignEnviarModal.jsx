import { Loader2, Send, FileSignature, X } from 'lucide-react';

export default function ZapsignEnviarModal({ open, contrato, sending, usaPdfAnexado, onConfirm, onCancel }) {
  if (!open) return null;

  const podeEnviar = !!contrato?.email?.trim() && !sending;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4"
      style={{ background: 'rgba(13,17,23,0.8)', backdropFilter: 'blur(2px)', paddingTop: 100 }}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: '#161b22', border: '1px solid rgba(0,212,170,0.35)' }}>

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ background: 'linear-gradient(135deg, rgba(0,212,170,0.18), rgba(0,102,204,0.15))', borderBottom: '1px solid rgba(0,212,170,0.25)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)' }}>
              <FileSignature className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#00D4AA' }}>Assinatura Eletrônica</p>
              <p className="text-sm font-bold" style={{ color: '#e6edf3' }}>Contrato gerado</p>
            </div>
          </div>
          <button onClick={onCancel} disabled={sending} className="p-1.5 rounded-lg transition"
            style={{ color: 'rgba(230,237,243,0.5)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo */}
        <div className="px-5 py-5 space-y-4">
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(230,237,243,0.85)' }}>
            Enviar o <strong>link de assinatura online</strong> ao cliente por e-mail agora?
          </p>
          <div className="rounded-xl px-4 py-3 space-y-1"
            style={{ background: '#1c2333', border: '1px solid rgba(0,212,170,0.2)' }}>
            <p className="text-sm font-semibold" style={{ color: '#e6edf3' }}>{contrato?.nome}</p>
            <p className="text-xs" style={{ color: 'rgba(230,237,243,0.55)' }}>
              {contrato?.email?.trim() || '— e-mail do cliente não cadastrado —'}
            </p>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(230,237,243,0.45)' }}>
            {usaPdfAnexado
              ? 'O PDF anexado ao contrato será enviado para assinatura via ZapSign e o cliente receberá o link por e-mail.'
              : 'O PDF gerado agora será enviado para assinatura via ZapSign e o cliente receberá o link por e-mail.'}
            {!contrato?.email?.trim() && ' Cadastre o e-mail do cliente no contrato antes de enviar.'}
          </p>
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-end gap-2 px-5 py-4"
          style={{ borderTop: '1px solid rgba(0,212,170,0.15)', background: '#1c2333' }}>
          <button onClick={onCancel} disabled={sending}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-50"
            style={{ background: 'transparent', border: '1px solid rgba(0,212,170,0.25)', color: 'rgba(230,237,243,0.7)' }}>
            Agora não
          </button>
          <button onClick={onConfirm} disabled={!podeEnviar}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white transition disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)' }}>
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {sending ? 'Enviando...' : 'Enviar link de assinatura'}
          </button>
        </div>
      </div>
    </div>
  );
}