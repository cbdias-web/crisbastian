import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Upload, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import AvatarPickerModal from '@/components/vendedores/AvatarPickerModal';
import { abrirModalGoogleCalendar } from '@/components/GoogleCalendarConectarModal';
import { getImpersonatedVendedor } from '@/lib/impersonation';

const A = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  accentDim: 'rgba(0,212,170,0.12)',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.5)',
};

export default function ProfileModal({ user, userAvatar, onAvatarChange, onClose }) {
  const [profileForm, setProfileForm] = useState({ full_name: '', email: '', nome_tratamento: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [impersonado, setImpersonado] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(userAvatar);

  useEffect(() => {
    setProfileForm({
      full_name: user?.full_name || '',
      email: user?.email || '',
      nome_tratamento: user?.nome_tratamento || '',
    });
    const imp = getImpersonatedVendedor();
    if (imp) {
      setImpersonado(imp);
      setAvatarUrl(imp.avatar_url || userAvatar);
    } else {
      setImpersonado(null);
      setAvatarUrl(userAvatar);
    }
  }, [user, userAvatar]);

  const displayName = impersonado
    ? impersonado.nome
    : user?.nome_tratamento || user?.full_name || 'Usuário';

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await base44.auth.updateMe({ nome_tratamento: profileForm.nome_tratamento });
      const updatedUser = await base44.auth.me();
      onAvatarChange?.(avatarUrl, updatedUser);
      toast.success('Perfil atualizado!');
      onClose();
    } catch {
      toast.error('Erro ao atualizar perfil');
    }
    setSavingProfile(false);
  };

  const applyAvatar = async (url) => {
    const imp = getImpersonatedVendedor();
    if (imp) {
      await base44.entities.Vendedor.update(imp.id, { avatar_url: url });
      toast.success('Avatar de ' + imp.nome.split(' ')[0] + ' atualizado!');
    } else {
      if (!user?.email) { toast.error('Usuário sem e-mail vinculado'); return; }
      const vinculados = await base44.entities.Vendedor.filter({ email: user.email });
      if (vinculados.length > 0) {
        await base44.entities.Vendedor.update(vinculados[0].id, { avatar_url: url });
      }
      await base44.auth.updateMe({ avatar_url: url });
      toast.success('Avatar atualizado!');
    }
    setAvatarUrl(url);
    onAvatarChange?.(url);
  };

  const uploadAvatar = async (file) => {
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await applyAvatar(file_url);
    } catch {
      toast.error('Erro ao atualizar avatar');
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-2xl shadow-2xl w-full max-w-md" style={{ background: A.surface2, border: `1px solid ${A.border}` }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${A.border}` }}>
          <h3 className="font-semibold" style={{ color: A.text }}>Meu Perfil</h3>
          <button onClick={onClose}
            className="p-1.5 rounded-lg transition"
            style={{ color: A.textMuted }}
            onMouseEnter={e => e.currentTarget.style.background = A.accentDim}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex flex-col items-center gap-3 pb-4" style={{ borderBottom: `1px solid ${A.border}` }}>
            <div className="relative">
              <div className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${A.accent}, #0066cc)`, color: A.bg }}>
                {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : displayName.charAt(0).toUpperCase()}
              </div>
              <label className="absolute bottom-0 right-0 p-1.5 rounded-full cursor-pointer shadow-lg"
                style={{ background: A.accent, color: A.bg }}>
                <Upload className="w-3.5 h-3.5" />
                <input type="file" accept="image/*" onChange={e => e.target.files[0] && uploadAvatar(e.target.files[0])} className="hidden" />
              </label>
            </div>
            <p className="text-xs" style={{ color: A.textMuted }}>Clique no ícone para enviar sua foto</p>
            <button type="button" onClick={() => setShowAvatarPicker(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition"
              style={{ background: A.accentDim, border: `1px solid ${A.border}`, color: A.accent }}>
              🎭 Escolher Personagem
            </button>
            {avatarUrl && (
              <button type="button" onClick={() => applyAvatar('')} className="text-xs" style={{ color: '#f87171' }}>Remover foto</button>
            )}
            <button type="button" onClick={() => { onClose(); abrirModalGoogleCalendar(); }}
              className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition"
              style={{ background: 'rgba(26,115,232,0.12)', border: '1px solid rgba(26,115,232,0.35)', color: '#60a5fa' }}>
              <Calendar className="w-3.5 h-3.5" /> Conectar Google Agenda
            </button>
          </div>
          {[
            { label: 'Nome completo', key: 'full_name', disabled: true },
            { label: 'E-mail', key: 'email', disabled: true, type: 'email' },
            { label: 'Nome de tratamento (como aparece no sistema)', key: 'nome_tratamento', disabled: false },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs font-medium mb-1 block" style={{ color: A.textMuted }}>{f.label}</label>
              <input type={f.type || 'text'} value={profileForm[f.key]} disabled={f.disabled}
                onChange={e => setProfileForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                style={{ background: f.disabled ? 'rgba(0,0,0,0.2)' : A.accentDim, border: `1px solid ${A.border}`, color: f.disabled ? A.textMuted : A.text, cursor: f.disabled ? 'not-allowed' : 'text' }} />
            </div>
          ))}
        </div>
        <div className="px-6 py-4 flex justify-end gap-2" style={{ borderTop: `1px solid ${A.border}` }}>
          <button onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg transition"
            style={{ color: A.textMuted, border: `1px solid ${A.border}` }}>
            Cancelar
          </button>
          <button onClick={saveProfile} disabled={savingProfile}
            className="px-5 py-2 text-sm rounded-lg font-medium transition disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${A.accent}, #0066cc)`, color: A.bg }}>
            {savingProfile ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {showAvatarPicker && (
        <AvatarPickerModal
          onSelect={url => { applyAvatar(url); setShowAvatarPicker(false); }}
          onClose={() => setShowAvatarPicker(false)} />
      )}
    </div>
  );
}