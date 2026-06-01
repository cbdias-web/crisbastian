const AVATARS = [
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
];

export default function AvatarPickerModal({ onSelect, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Banco de Avatares</h3>
            <p className="text-xs text-gray-400 mt-0.5">Selecione um personagem como avatar</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition">✕</button>
        </div>
        <div className="p-5 grid grid-cols-4 gap-3">
          {AVATARS.map((avatar) => (
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
        <div className="px-6 py-3 border-t border-gray-100 text-center">
          <p className="text-[11px] text-gray-400">Ou use o botão "Escolher foto" para enviar uma imagem própria</p>
        </div>
      </div>
    </div>
  );
}