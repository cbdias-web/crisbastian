import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Label } from "@/components/ui/label";
import { Paperclip, X, FileText, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const ACEITOS = '.pdf,.jpg,.jpeg,.png,.txt';

export default function ComprovantesUpload({ comprovantes = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const novos = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        novos.push({ url: file_url, nome: file.name });
      }
      onChange([...(comprovantes || []), ...novos]);
      toast.success(`${novos.length} comprovante(s) anexado(s)`);
    } catch (e) {
      toast.error('Erro ao anexar comprovante');
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const remover = (idx) => {
    onChange((comprovantes || []).filter((_, i) => i !== idx));
  };

  return (
    <div>
      <Label>Comprovantes de Pagamento</Label>
      <input
        ref={inputRef}
        type="file"
        accept={ACEITOS}
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-input border-dashed rounded-md text-sm bg-background hover:bg-gray-50 transition text-gray-500 disabled:opacity-60"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
        {uploading ? 'Enviando...' : 'Anexar comprovante(s) (PDF, JPG, PNG, TXT)'}
      </button>

      {(comprovantes || []).length > 0 && (
        <div className="mt-2 space-y-1.5">
          {comprovantes.map((c, i) => (
            <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs">
              <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <a href={c.url} target="_blank" rel="noopener noreferrer"
                className="flex-1 truncate text-gray-700 hover:text-[#1a3150] flex items-center gap-1">
                {c.nome || `Comprovante ${i + 1}`}
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
              <button type="button" onClick={() => remover(i)}
                className="p-1 hover:bg-red-50 rounded transition flex-shrink-0">
                <X className="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}