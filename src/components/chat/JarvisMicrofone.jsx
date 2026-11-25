import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Mic, Square, Loader2 } from 'lucide-react';

const MAX_SEG = 120;

/**
 * Botão de áudio do Jarvis: grava a instrução falada, transcreve e devolve o texto
 * para o campo de mensagem (o usuário revisa antes de enviar).
 * O áudio é enviado ao armazenamento privado e usado apenas para a transcrição.
 */
export default function JarvisMicrofone({ onTexto, onErro, desabilitado }) {
  const [gravando, setGravando] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const limiteRef = useRef(null);
  const tickRef = useRef(null);

  const limparTimers = () => {
    clearTimeout(limiteRef.current);
    clearInterval(tickRef.current);
  };

  useEffect(() => () => {
    limparTimers();
    const rec = recRef.current;
    if (rec && rec.state === 'recording') { try { rec.stop(); } catch {} }
  }, []);

  const transcrever = async (blob, tipo) => {
    if (!blob.size) { onErro?.('Não capturei nenhum áudio. Tente novamente.'); return; }
    setProcessando(true);
    try {
      const ext = tipo.includes('mp4') ? 'm4a' : tipo.includes('ogg') ? 'ogg' : 'webm';
      const file = new File([blob], `jarvis-audio.${ext}`, { type: tipo });
      const up = await base44.integrations.Core.UploadPrivateFile({ file });
      const retorno = await base44.integrations.Core.TranscribeAudio({ audio_url: up.file_uri });
      const texto = (typeof retorno === 'string' ? retorno : retorno?.text || '').trim();
      if (texto) onTexto?.(texto);
      else onErro?.('Não consegui entender o áudio. Tente falar novamente.');
    } catch (e) {
      onErro?.('Não consegui transcrever o áudio agora. Tente novamente.');
    }
    setProcessando(false);
  };

  const iniciar = async () => {
    if (processando || desabilitado) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      onErro?.('Seu navegador não permite gravar áudio aqui. Use o Chrome, Edge ou Safari atualizado.');
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      onErro?.('Não consegui acessar o microfone. Libere a permissão do microfone no navegador.');
      return;
    }
    const tipos = ['audio/webm', 'audio/mp4', 'audio/ogg'];
    const mime = tipos.find(t => window.MediaRecorder.isTypeSupported?.(t)) || '';
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      limparTimers();
      setGravando(false);
      setSegundos(0);
      transcrever(new Blob(chunksRef.current, { type: rec.mimeType || mime || 'audio/webm' }), rec.mimeType || mime || 'audio/webm');
    };
    rec.start();
    recRef.current = rec;
    setSegundos(0);
    setGravando(true);
    tickRef.current = setInterval(() => setSegundos(s => s + 1), 1000);
    limiteRef.current = setTimeout(() => { try { rec.stop(); } catch {} }, MAX_SEG * 1000);
  };

  const parar = () => { try { recRef.current?.stop(); } catch {} };

  const ocupado = desabilitado || processando;

  return (
    <button
      type="button"
      onClick={gravando ? parar : iniciar}
      disabled={ocupado}
      title={gravando ? 'Parar e transcrever' : 'Falar com o Jarvis (instrução por áudio)'}
      aria-label={gravando ? 'Parar gravação' : 'Gravar instrução por áudio'}
      className="p-1.5 rounded-lg transition flex-shrink-0 disabled:opacity-40 flex items-center gap-1"
      style={gravando
        ? { color: '#fff', background: 'rgba(239,68,68,0.85)' }
        : { color: '#00D4AA', background: 'rgba(0,212,170,0.1)' }}
    >
      {processando
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : gravando
          ? <Square className="w-3.5 h-3.5" />
          : <Mic className="w-3.5 h-3.5" />}
      {gravando && <span className="text-[10px] font-bold tabular-nums">{segundos}s</span>}
    </button>
  );
}