import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload } from 'lucide-react';

const CATEGORIAS = [
  {
    label: '🏰 Disney & Aventura',
    avatars: [
      { url: 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/84de7734b_generated_image.png', nome: 'Ratinho' },
      { url: 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/1621c8d62_generated_image.png', nome: 'Pato Marinheiro' },
      { url: 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/d53d3f782_generated_image.png', nome: 'Leãozinho' },
      { url: 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/baaeff4fe_generated_image.png', nome: 'Ursinho' },
      { url: 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/2408329e1_generated_image.png', nome: 'Princesa Azul' },
      { url: 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/fd4528faa_generated_image.png', nome: 'Rainha do Gelo' },
      { url: 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/2f062e0b4_generated_image.png', nome: 'Princesa Tropical' },
      { url: 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/654c9c7a7_generated_image.png', nome: 'Sereinha' },
      { url: 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/10cdf17ad_generated_image.png', nome: 'Cowboy' },
      { url: 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/cb022df3a_generated_image.png', nome: 'Fadinha' },
      { url: 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/ba0dcb105_generated_image.png', nome: 'Pirata' },
    ],
  },
  {
    label: '⚡ Super-Heróis',
    avatars: [
      { url: 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/4325c2a19_generated_image.png', nome: 'Homem de Ferro' },
      { url: 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/0ae80318f_generated_image.png', nome: 'Aranhão' },
      { url: 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/df7ab8f23_generated_image.png', nome: 'Capitão Escudo' },
      { url: 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/77577ddbc_generated_image.png', nome: 'Hulk' },
      { url: 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/0e346a58d_generated_image.png', nome: 'Deus do Trovão' },
      { url: 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/be74176d6_generated_image.png', nome: 'Feiticeira' },
      { url: 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/7b69eb202_generated_image.png', nome: 'Arqueiro Verde' },
      { url: 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/6542ff0f3_generated_image.png', nome: 'Mercenário' },
      { url: 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/6168e011a_generated_image.png', nome: 'Capitã Vermelha' },
      { url: 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/374e56291_generated_image.png', nome: 'Guaxinim Atirador' },
      { url: 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/f8303a21e_generated_image.png', nome: 'Formiguinha' },
      { url: 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/195ba6191_generated_image.png', nome: 'Vespinha' },
      { url: 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/0148730b0_generated_image.png', nome: 'Mago Supremo' },
    ],
  },
];

export default function AvatarPickerModal({ onSelect, onClose }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onSelect(file_url);
      onClose();
    } catch (e) {
      alert('Erro ao fazer upload da imagem.');
    }
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-semibold text-gray-900">Banco de Avatares</h3>
            <p className="text-xs text-gray-400 mt-0.5">Selecione um personagem como avatar</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition">✕</button>
        </div>
        {/* Zona de drag-and-drop */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`mx-5 mt-4 rounded-xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-2 py-5 ${
            dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
          }`}
        >
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
          {uploading ? (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Enviando...</span>
            </div>
          ) : (
            <>
              <Upload className="w-6 h-6 text-gray-400" />
              <p className="text-sm text-gray-500">Arraste uma foto aqui ou <span className="text-blue-500 font-medium">clique para escolher</span></p>
            </>
          )}
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-6">
          {CATEGORIAS.map((cat) => (
            <div key={cat.label}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{cat.label}</p>
              <div className="grid grid-cols-4 gap-3">
                {cat.avatars.map((avatar) => (
                  <button
                    key={avatar.url}
                    onClick={() => { onSelect(avatar.url); onClose(); }}
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-transparent group-hover:border-blue-400 transition-all duration-150 shadow-sm group-hover:shadow-md group-hover:scale-105">
                      <img src={avatar.url} alt={avatar.nome} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] text-gray-500 group-hover:text-blue-600 font-medium text-center leading-tight">{avatar.nome}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}