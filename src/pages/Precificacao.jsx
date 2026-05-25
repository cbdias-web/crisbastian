import { useState } from 'react';
import { Calculator, Globe, Shield, Settings } from 'lucide-react';
import SimuladorDolarize from '@/components/precificacao/SimuladorDolarize';
import SimuladorContaInternacional from '@/components/precificacao/SimuladorContaInternacional';
import SimuladorSeguroGarantia from '@/components/precificacao/SimuladorSeguroGarantia';
import ConfigPrecificacao from '@/components/precificacao/ConfigPrecificacao';

const TABS = [
  { id: 'dolarize', label: 'Dolarize', icon: Calculator },
  { id: 'conta-internacional', label: 'Conta Internacional', icon: Globe },
  { id: 'seguro-garantia', label: 'Seguro Garantia', icon: Shield },
  { id: 'config', label: 'Configurações', icon: Settings },
];

export default function Precificacao() {
  const [tab, setTab] = useState('dolarize');

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Calculator className="w-6 h-6 text-blue-600" />
          Hub de Precificação
        </h1>
        <p className="text-sm text-gray-500 mt-1">Gere propostas customizadas por produto</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6 flex-wrap">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center
                ${tab === t.id
                  ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {tab === 'dolarize' && <SimuladorDolarize />}
      {tab === 'conta-internacional' && <SimuladorContaInternacional />}
      {tab === 'seguro-garantia' && <SimuladorSeguroGarantia />}
      {tab === 'config' && <ConfigPrecificacao />}
    </div>
  );
}