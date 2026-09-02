import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Handshake, Eye } from 'lucide-react';
import FiltroIndicadores from '@/components/portal/FiltroIndicadores';
import ConsolidadoIndicadores from '@/components/portal/ConsolidadoIndicadores';
import ParceirosTabelaLeitura from '@/components/portal/ParceirosTabelaLeitura';
import IndicacoesTabelaLeitura from '@/components/portal/IndicacoesTabelaLeitura';

const AURORA = {
  bg: '#0d1117',
  surface: '#161b22',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

// Visão SOMENTE LEITURA do Dash Parceiro, para gerentes/SDRs atuando na esteira
// de Fila de Contatos: os mesmos números e listas do painel admin, sem nenhuma
// ação (criar/editar/converter/convites).
export default function DashParceiroSomenteLeitura() {
  const [periodo, setPeriodo] = useState('mes');
  const [parceiroFiltro, setParceiroFiltro] = useState('todos');

  const { data: parceiros = [] } = useQuery({
    queryKey: ['parceiros-dash-leitura'],
    queryFn: () => base44.entities.Parceiro.list('nome'),
  });

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: AURORA.bg, color: AURORA.text }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,212,170,0.15)' }}>
                <Handshake className="w-4 h-4" style={{ color: AURORA.accent }} />
              </div>
              <h1 className="text-xl font-bold" style={{ color: AURORA.text }}>Dash Parceiro</h1>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24' }}>
                <Eye className="w-3 h-3" /> Somente leitura
              </span>
            </div>
            <p className="text-sm" style={{ color: AURORA.textMuted }}>
              Acompanhamento de indicadores e indicações — visualização sem interação
            </p>
          </div>
        </div>

        <FiltroIndicadores
          periodo={periodo}
          setPeriodo={setPeriodo}
          parceiroId={parceiroFiltro}
          setParceiroId={setParceiroFiltro}
          parceiros={parceiros}
        />

        <ConsolidadoIndicadores periodo={periodo} parceiroId={parceiroFiltro} parceiros={parceiros} />

        <IndicacoesTabelaLeitura periodo={periodo} parceiroIdFiltro={parceiroFiltro} />
        <ParceirosTabelaLeitura parceiros={parceiros} parceiroFiltro={parceiroFiltro} />
      </div>
    </div>
  );
}