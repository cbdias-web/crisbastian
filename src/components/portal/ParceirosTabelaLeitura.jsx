import { Users } from 'lucide-react';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

// Tabela SOMENTE LEITURA dos indicadores (sem ações de editar/convite/link)
export default function ParceirosTabelaLeitura({ parceiros, parceiroFiltro }) {
  const lista = parceiroFiltro && parceiroFiltro !== 'todos'
    ? parceiros.filter((p) => p.id === parceiroFiltro)
    : parceiros;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${AURORA.border}` }}>
        <Users className="w-4 h-4" style={{ color: AURORA.accent }} />
        <h2 className="text-sm font-bold" style={{ color: AURORA.text }}>Indicadores ({lista.length})</h2>
      </div>
      {lista.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs" style={{ color: AURORA.textMuted }}>Nenhum indicador encontrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: AURORA.surface2, color: AURORA.textMuted }}>
                <th className="text-left px-4 py-2 font-semibold">Nome</th>
                <th className="text-left px-4 py-2 font-semibold">Contato</th>
                <th className="text-left px-4 py-2 font-semibold">Comissão</th>
                <th className="text-left px-4 py-2 font-semibold">Situação</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id} style={{ borderTop: `1px solid ${AURORA.border}` }}>
                  <td className="px-4 py-2 font-medium" style={{ color: AURORA.text }}>{p.nome}</td>
                  <td className="px-4 py-2" style={{ color: AURORA.textMuted }}>{p.email || p.telefone || '—'}</td>
                  <td className="px-4 py-2" style={{ color: AURORA.textMuted }}>
                    {p.percentual_comissao != null ? `${p.percentual_comissao}%` : '—'}
                  </td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={p.ativo !== false
                        ? { background: 'rgba(52,211,153,0.12)', color: '#34d399' }
                        : { background: 'rgba(248,113,113,0.12)', color: '#f87171' }}>
                      {p.ativo !== false ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}