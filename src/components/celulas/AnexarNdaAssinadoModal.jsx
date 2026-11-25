import { useState } from 'react';
import { X, UploadCloud, FileText, Loader2 } from 'lucide-react';

const C = { line: 'rgba(255,255,255,0.07)', txt: '#F4EFE3', txt2: '#C8D0DC', muted: '#8E97A8' };

/**
 * Anexo da via assinada do NDA dentro da célula.
 * Arrastar/soltar ou escolher o arquivo; ao anexar, a etapa NDA é concluída e o estudo é liberado.
 */
export default function AnexarNdaAssinadoModal({ estudo, t, onEnviar, onClose }) {
  const [arquivo, setArquivo] = useState(null);
  const [arrastando, setArrastando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const receber = (f) => { if (f) setArquivo(f); };

  const enviar = async () => {
    if (!arquivo || enviando) return;
    setEnviando(true);
    const ok = await onEnviar(arquivo);
    setEnviando(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Anexar NDA assinado"
      style={{ background: 'rgba(3,6,10,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="vx-suspensa" style={{ width: '100%', maxWidth: 480, borderRadius: 22, background: '#0E141F', border: `1px solid ${C.line}`, boxShadow: `0 40px 100px -30px rgba(0,0,0,.9), 0 0 60px -40px ${t.glow}`, color: C.txt2 }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: `1px solid ${C.line}` }}>
          <FileText className="w-5 h-5" style={{ color: t.acc, flex: 'none' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: C.txt }}>NDA assinado</p>
            <p style={{ fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{estudo.cliente_nome}</p>
          </div>
          <button onClick={onClose} className="vx-btn vx-btn-ghost vx-icon-btn" aria-label="Fechar"><X className="w-4 h-4" /></button>
        </header>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
            Anexe a via assinada do NDA. Ao anexar, a etapa NDA é concluída e o estudo de viabilidade é liberado nesta operação.
          </p>

          <label
            onDragOver={(ev) => { ev.preventDefault(); setArrastando(true); }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(ev) => { ev.preventDefault(); setArrastando(false); receber(ev.dataTransfer.files?.[0]); }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '22px 16px', borderRadius: 16, cursor: 'pointer',
              background: arrastando ? t.dim : 'rgba(255,255,255,0.025)',
              border: `1px dashed ${arrastando ? t.acc : C.line}`,
            }}>
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={(ev) => receber(ev.target.files?.[0])} />
            <UploadCloud className="w-6 h-6" style={{ color: t.acc }} />
            <span style={{ fontSize: 13, color: C.txt2, textAlign: 'center', lineHeight: 1.5 }}>
              Arraste o NDA assinado aqui<br />ou clique para selecionar (PDF, PNG ou JPG)
            </span>
          </label>

          {arquivo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.045)', border: `1px solid ${C.line}` }}>
              <FileText className="w-4 h-4" style={{ color: t.acc, flex: 'none' }} />
              <span style={{ flex: 1, fontSize: 13, color: C.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{arquivo.name}</span>
              <button onClick={() => setArquivo(null)} style={{ background: 'transparent', border: 0, color: C.muted, cursor: 'pointer' }} aria-label="Remover arquivo">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="vx-btn vx-btn-ghost" style={{ height: 40, padding: '0 16px', fontSize: 13 }}>Cancelar</button>
            <button onClick={enviar} disabled={!arquivo || enviando} className="vx-btn vx-btn-primary" style={{ height: 40, padding: '0 18px', fontSize: 13 }}>
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />} Anexar e liberar estudo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}