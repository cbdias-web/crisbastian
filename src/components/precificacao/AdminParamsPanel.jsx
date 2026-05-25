/**
 * Painel colapsável de ajuste de parâmetros — visível apenas para admins.
 */
import { SlidersHorizontal } from 'lucide-react';

export default function AdminParamsPanel({ isAdmin, edited, onSave, onReset, children }) {
  if (!isAdmin) return null;

  return (
    <details className={`rounded-2xl border shadow-sm bg-white overflow-hidden ${edited ? 'border-amber-300' : 'border-gray-200'}`}>
      <summary className={`flex items-center gap-2 px-5 py-4 cursor-pointer select-none list-none`}>
        <SlidersHorizontal className={`w-4 h-4 ${edited ? 'text-amber-500' : 'text-gray-400'}`} />
        <span className={`text-sm font-semibold flex-1 ${edited ? 'text-amber-700' : 'text-gray-700'}`}>
          Ajuste de Parâmetros (Admin)
        </span>
        {edited && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">Editado</span>}
        <span className="text-xs text-gray-400">▼</span>
      </summary>

      <div className="px-5 pb-5 pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-400 mb-4">
          Estes ajustes afetam apenas esta sessão até você salvar como padrão.
        </p>
        {children}
        <div className="flex gap-3 mt-4 flex-wrap">
          <button onClick={onSave}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold transition">
            💾 Salvar como padrão
          </button>
          <button onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-semibold transition">
            ↩ Resetar
          </button>
        </div>
      </div>
    </details>
  );
}