import { useState, useRef } from 'react';
import { Paperclip, X, FileText, Loader2, Download, UploadCloud } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AnexoUpload({ anexos = [], onChange, compact = false }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const novos = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        novos.push({ url: file_url, nome: file.name });
      }
      onChange([...anexos, ...novos]);
      toast.success(`${novos.length} arquivo(s) anexado(s).`);
    } catch (e) {
      toast.error('Erro ao enviar arquivo: ' + (e.message || ''));
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  function removerAnexo(idx) {
    onChange(anexos.filter((_, i) => i !== idx));
  }

  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (uploading) return;
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }

  function onDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }

  function onDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`rounded-xl transition-all ${dragOver ? 'ring-2 ring-blue-400 bg-blue-50' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
      />
      <div className="flex flex-wrap gap-2 mb-2">
        {anexos.map((a, i) => (
          <div key={i} className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg pl-2.5 pr-1.5 py-1.5 group">
            <FileText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            <a href={a.url} target="_blank" rel="noopener noreferrer"
              className="text-xs font-medium text-blue-700 hover:underline max-w-[140px] truncate">
              {a.nome}
            </a>
            <a href={a.url} target="_blank" rel="noopener noreferrer" download
              className="text-blue-400 hover:text-blue-600 p-0.5">
              <Download className="w-3 h-3" />
            </a>
            <button onClick={() => removerAnexo(i)}
              className="text-gray-400 hover:text-red-500 p-0.5">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {dragOver ? (
        <div className="flex items-center justify-center gap-2 py-4 border-2 border-dashed border-blue-400 rounded-xl text-blue-600 text-sm font-semibold">
          <UploadCloud className="w-5 h-5" />
          Solte os arquivos aqui para anexar
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`flex items-center gap-1.5 text-xs font-semibold transition disabled:opacity-60 ${compact ? 'text-blue-600 hover:text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
          {uploading ? 'Enviando...' : 'Anexar documento'}
          {!compact && <span className="text-gray-400 font-normal hidden sm:inline">· arraste e solte ou clique</span>}
        </button>
      )}
    </div>
  );
}