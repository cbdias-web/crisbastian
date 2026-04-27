import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Printer, CheckCircle2, TrendingUp, Edit2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ContratoForm from './ContratoForm';

const TIPO_COLOR = {
  'CONTA GLOBAL': '#0f1e35',
  'CONTA INTERNACIONAL': '#1a3a6b',
  'DOLARIZE AQUI': '#b45309',
};

const STATUS_CONFIG = {
  rascunho: { label: 'Rascunho', cls: 'bg-gray-100 text-gray-500' },
  gerado: { label: 'PDF Gerado', cls: 'bg-blue-100 text-blue-700' },
  assinado: { label: 'Assinado', cls: 'bg-emerald-100 text-emerald-700' },
  no_pipeline: { label: 'No Pipeline', cls: 'bg-purple-100 text-purple-700' },
};

export default function ContratoViewer({ contrato, onBack, onUpdate }) {
  const [editando, setEditando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [enviandoPipeline, setEnviandoPipeline] = useState(false);
  const queryClient = useQueryClient();
  const cor = TIPO_COLOR[contrato.tipo] || '#0f1e35';

  const marcarAssinado = useMutation({
    mutationFn: () => base44.entities.Contrato.update(contrato.id, { status: 'assinado' }),
    onSuccess: (c) => { onUpdate(c); toast.success('Contrato marcado como assinado!'); },
  });

  const enviarPipeline = async () => {
    if (!confirm('Enviar este contrato para o Pipeline como nova prospecção?')) return;
    setEnviandoPipeline(true);
    try {
      const pipeline = await base44.entities.Pipeline.create({
        cliente_nome: contrato.nome,
        cliente_cpf_cnpj: contrato.cpf_cnpj,
        cliente_telefone: contrato.telefone,
        produto: contrato.tipo,
        valor_estimado: contrato.valor_total || contrato.valor_adesao || 0,
        temperatura: 'Quente',
        origem: 'Carteira',
        vendedor_id: contrato.vendedor_id || '',
        vendedor_nome: contrato.vendedor_nome || '',
        descricao: `Contrato ${contrato.tipo} gerado. Aguardando finalização da venda.`,
        data_prevista: contrato.data_primeiro_pagamento || '',
      });
      await base44.entities.Contrato.update(contrato.id, { status: 'no_pipeline', pipeline_id: pipeline.id });
      queryClient.invalidateQueries(['contratos']);
      queryClient.invalidateQueries(['pipeline']);
      onUpdate({ ...contrato, status: 'no_pipeline', pipeline_id: pipeline.id });
      toast.success('Enviado para o Pipeline com sucesso!');
    } catch (err) {
      toast.error('Erro: ' + err.message);
    }
    setEnviandoPipeline(false);
  };

  const gerarPDF = async () => {
    setGerando(true);
    try {
      const res = await base44.functions.invoke('gerarContratosPDF', { contrato_id: contrato.id });
      const { pdf_base64, filename } = res.data;

      // Converter base64 → Blob → download
      const binary = atob(pdf_base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `contrato_${contrato.tipo.replace(/ /g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      await base44.entities.Contrato.update(contrato.id, { status: contrato.status === 'rascunho' ? 'gerado' : contrato.status });
      queryClient.invalidateQueries(['contratos']);
      toast.success('PDF preenchido e baixado com sucesso!');
    } catch (err) {
      toast.error('Erro ao gerar PDF: ' + err.message);
    }
    setGerando(false);
  };

  if (editando) {
    return (
      <ContratoForm
        tipo={contrato.tipo}
        user={{ id: contrato.vendedor_id, email: contrato.created_by }}
        contratoExistente={contrato}
        onSaved={(c) => { onUpdate(c); setEditando(false); }}
        onCancel={() => setEditando(false)}
      />
    );
  }

  const stCfg = STATUS_CONFIG[contrato.status] || STATUS_CONFIG.rascunho;
  const fmtVal = (v) => v != null && v > 0 ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null;
  const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4 transition">
          <ArrowLeft className="w-4 h-4" /> Voltar para Contratos
        </button>

        {/* Header */}
        <div className="rounded-2xl p-5 mb-5 text-white flex items-start justify-between shadow-lg" style={{ background: cor }}>
          <div>
            <p className="text-xs opacity-60 uppercase tracking-widest font-semibold mb-1">{contrato.tipo}</p>
            <h2 className="text-xl font-bold">{contrato.nome}</h2>
            <p className="text-sm opacity-70 mt-0.5">{contrato.cpf_cnpj}</p>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${stCfg.cls}`}>{stCfg.label}</span>
        </div>

        {/* Ações */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <button onClick={gerarPDF} disabled={gerando}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl text-white text-xs font-semibold transition hover:opacity-90 shadow-md disabled:opacity-50"
            style={{ background: cor }}>
            {gerando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
            {gerando ? 'Gerando...' : 'Gerar PDF'}
          </button>
          <button onClick={() => setEditando(true)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-white border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition shadow-sm">
            <Edit2 className="w-5 h-5" />
            Editar
          </button>
          <button
            onClick={() => marcarAssinado.mutate()}
            disabled={contrato.status === 'assinado' || contrato.status === 'no_pipeline' || marcarAssinado.isPending}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition shadow-md disabled:opacity-40">
            <CheckCircle2 className="w-5 h-5" />
            Assinado
          </button>
          <button
            onClick={enviarPipeline}
            disabled={contrato.status === 'no_pipeline' || enviandoPipeline}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition shadow-md disabled:opacity-40">
            {enviandoPipeline ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
            {enviandoPipeline ? 'Enviando...' : 'Enviar ao Pipeline'}
          </button>
        </div>

        {/* Dados do contrato */}
        <div className="space-y-4">
          <Section title="Dados Pessoais">
            <Grid>
              <Item label="Nome" value={contrato.nome} />
              <Item label="CPF / CNPJ" value={contrato.cpf_cnpj} />
              <Item label="Responsável Legal" value={contrato.responsavel_legal} />
              <Item label="CPF Responsável" value={contrato.cpf_responsavel} />
              <Item label="Nascimento" value={fmtDate(contrato.nascimento)} />
              <Item label="Profissão" value={contrato.profissao} />
              <Item label="Estado Civil" value={contrato.estado_civil} />
              <Item label="Nacionalidade" value={contrato.nacionalidade} />
              <Item label="E-mail" value={contrato.email} />
              <Item label="Telefone" value={contrato.telefone} />
            </Grid>
          </Section>

          <Section title="Endereço">
            <Grid>
              <Item label="Endereço" value={contrato.endereco} span />
              <Item label="Bairro" value={contrato.bairro} />
              <Item label="Cidade" value={contrato.cidade} />
              <Item label="Estado" value={contrato.estado} />
              <Item label="CEP" value={contrato.cep} />
            </Grid>
          </Section>

          <Section title="Dados Financeiros">
            <Grid>
              <Item label="Valor Total" value={fmtVal(contrato.valor_total)} highlight />
              <Item label="Valor de Adesão" value={fmtVal(contrato.valor_adesao)} />
              <Item label="Parcela" value={fmtVal(contrato.valor_parcela)} />
              <Item label="Nº Parcelas" value={contrato.num_parcelas ? `${contrato.num_parcelas}x` : null} />
              <Item label="Forma de Pagamento" value={contrato.forma_pagamento} />
              <Item label="1º Pagamento" value={fmtDate(contrato.data_primeiro_pagamento)} />
              <Item label="Dia Vencimento" value={contrato.dia_vencimento ? `Dia ${contrato.dia_vencimento}` : null} />
              <Item label="Prazo" value={contrato.prazo_meses ? `${contrato.prazo_meses} meses` : null} />
              <Item label="Moeda" value={contrato.moeda} />
              <Item label="Cotação" value={contrato.cotacao ? `R$ ${Number(contrato.cotacao).toFixed(4)}` : null} />
              <Item label="Valor em Moeda Estrangeira" value={contrato.valor_em_moeda ? `${contrato.moeda || 'USD'} ${Number(contrato.valor_em_moeda).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : null} />
            </Grid>
            {contrato.banco && (
              <Grid>
                <Item label="Banco" value={contrato.banco} />
                <Item label="Agência" value={contrato.agencia} />
                <Item label="Conta" value={contrato.conta} />
              </Grid>
            )}
          </Section>

          {contrato.observacoes && (
            <Section title="Observações">
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{contrato.observacoes}</p>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Grid({ children }) {
  return <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{children}</div>;
}

function Item({ label, value, highlight, span }) {
  if (!value) return null;
  return (
    <div className={span ? 'col-span-2 sm:col-span-3' : ''}>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-sm mt-0.5 ${highlight ? 'text-lg font-bold text-[#1a3150]' : 'text-gray-800 font-medium'}`}>{value}</p>
    </div>
  );
}