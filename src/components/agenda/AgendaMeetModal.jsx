import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Calendar, Clock, Video, User, CheckCircle2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Modal de agendamento com Meet integrado.
 * Props:
 *   - user: objeto do usuário atual
 *   - clienteNome: nome pré-preenchido (opcional)
 *   - clienteId: id do cliente (opcional)
 *   - clienteTelefone: telefone (opcional)
 *   - clienteCpfCnpj: cpf/cnpj (opcional)
 *   - pipelineId: id do pipeline (opcional, para vincular)
 *   - dataInicial: YYYY-MM-DD pré-preenchida (opcional)
 *   - onClose: callback ao fechar
 *   - onSaved: callback após salvar (recebe o registro da agenda)
 */
export default function AgendaMeetModal({
  user,
  vendedorId = '',   // ID do registro na entidade Vendedor (preferido sobre user.id)
  vendedorNome = '', // Nome do vendedor correspondente
  clienteNome = '',
  clienteId = '',
  clienteTelefone = '',
  clienteCpfCnpj = '',
  pipelineId = '',
  dataInicial = '',
  onClose,
  onSaved,
}) {
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    nome: clienteNome,
    data: dataInicial || today,
    horario: '09:00',
    horario_fim: '10:00',
    com_meet: true,
    observacao: '',
  });

  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState(null); // { meet_link, calendar_link }

  // Ao mudar horário início → calcula fim automaticamente (+1h)
  const onChangeHorario = (val) => {
    const [h, m] = val.split(':').map(Number);
    const fimH = String(h + 1 > 23 ? 23 : h + 1).padStart(2, '0');
    const fimM = String(m).padStart(2, '0');
    setForm(f => ({ ...f, horario: val, horario_fim: `${fimH}:${fimM}` }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error('Informe o nome do cliente'); return; }
    if (!form.data) { toast.error('Informe a data'); return; }
    if (!form.horario) { toast.error('Informe o horário'); return; }

    setSalvando(true);
    try {
      // Usa o ID do registro Vendedor se disponível, senão cai no user.id
      const vidFinal = vendedorId || user.id;
      const vnomeFinal = vendedorNome || user.nome_tratamento || user.full_name || user.email;

      // 1. Cria registro na AgendaContato
      const agenda = await base44.entities.AgendaContato.create({
        lead_id: clienteId || user.id,
        lead_nome: form.nome.trim(),
        lead_cpf_cnpj: clienteCpfCnpj || '',
        lead_telefone: clienteTelefone || '',
        cliente_id: clienteId || '',
        vendedor_id: vidFinal,
        vendedor_nome: vnomeFinal,
        data_agendada: form.data,
        horario: form.horario,
        posicao_dia: 0,
        status: 'pendente',
        resultado: form.observacao || '',
      });

      // 2. Se quer Meet → chama função backend com horário já definido
      if (form.com_meet) {
        try {
          const res = await base44.functions.invoke('criarMeetAgenda', {
            agenda_id: agenda.id,
            lead_nome: form.nome.trim(),
            data_agendada: form.data,
            horario_inicio: form.horario,
            horario_fim: form.horario_fim,
            com_meet: true,
          });
          const meetLink = res.data?.meet_link;
          const calendarLink = res.data?.calendar_link;
          setResultado({ meet_link: meetLink, calendar_link: calendarLink });
          if (meetLink) toast.success('Reunião agendada com Meet!');
          else toast.success('Evento criado no Google Calendar!');
        } catch (err) {
          const msg = err?.response?.data?.error || err?.message || '';
          if (msg.toLowerCase().includes('connection') || msg.toLowerCase().includes('no active')) {
            toast.warning('Agenda criada! Para gerar Meet, conecte seu Google Calendar nas configurações.');
          } else {
            toast.warning('Agenda criada, mas houve erro ao criar o Meet: ' + msg);
          }
          setResultado({ meet_link: null, calendar_link: null });
        }
      } else {
        toast.success('Agendamento criado!');
        setResultado({ meet_link: null, calendar_link: null });
      }

      onSaved?.(agenda);
    } catch (err) {
      toast.error('Erro ao criar agendamento: ' + err.message);
    }
    setSalvando(false);
  };

  const dataFormatada = form.data
    ? format(new Date(form.data + 'T00:00:00'), "EEEE, d 'de' MMMM", { locale: ptBR })
    : '';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #0f1e35 0%, #1a3150 100%)' }}>
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-blue-300" />
            <div>
              <p className="font-bold text-white text-sm">Agendar Reunião</p>
              <p className="text-blue-200 text-xs mt-0.5">Com geração automática de Meet</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg text-white/70 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resultado de sucesso */}
        {resultado && (
          <div className="mx-6 mt-5 bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className="text-sm font-semibold text-emerald-800">Agendamento criado com sucesso!</p>
            </div>
            {resultado.meet_link && (
              <a href={resultado.meet_link} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-[#1a73e8] text-white text-sm font-semibold rounded-xl hover:bg-[#1557b0] transition w-full justify-center">
                <Video className="w-4 h-4" /> Entrar no Meet
              </a>
            )}
            {resultado.calendar_link && (
              <a href={resultado.calendar_link} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition w-full justify-center">
                <ExternalLink className="w-4 h-4" /> Ver no Google Calendar
              </a>
            )}
            <button onClick={onClose}
              className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition">
              Fechar
            </button>
          </div>
        )}

        {/* Formulário */}
        {!resultado && (
          <form onSubmit={handleSave} className="p-6 space-y-4">

            {/* Cliente */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Cliente / Participante *
              </label>
              <input
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Nome do cliente ou participante"
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]"
              />
            </div>

            {/* Data */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Data da Reunião *
              </label>
              <input
                type="date"
                value={form.data}
                onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]"
              />
              {dataFormatada && (
                <p className="text-[11px] text-blue-600 mt-1 capitalize">{dataFormatada}</p>
              )}
            </div>

            {/* Horários */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Início *
                </label>
                <input
                  type="time"
                  value={form.horario}
                  onChange={e => onChangeHorario(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Término</label>
                <input
                  type="time"
                  value={form.horario_fim}
                  onChange={e => setForm(f => ({ ...f, horario_fim: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]"
                />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 -mt-2">O horário de término é preenchido automaticamente (+1h). Ajuste se necessário.</p>

            {/* Observação */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Observações</label>
              <textarea
                value={form.observacao}
                onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
                placeholder="Pauta da reunião, instruções, etc."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150] resize-none"
              />
            </div>

            {/* Toggle Meet */}
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition cursor-pointer ${form.com_meet ? 'border-[#1a73e8] bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
              onClick={() => setForm(f => ({ ...f, com_meet: !f.com_meet }))}>
              <Video className={`w-5 h-5 flex-shrink-0 ${form.com_meet ? 'text-[#1a73e8]' : 'text-gray-400'}`} />
              <div className="flex-1">
                <p className={`text-sm font-semibold ${form.com_meet ? 'text-[#1a3150]' : 'text-gray-600'}`}>
                  Gerar link Google Meet
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {form.com_meet
                    ? 'Link Meet será criado com o horário definido acima'
                    : 'Apenas agendamento na agenda, sem link de vídeo'}
                </p>
              </div>
              <div className={`w-10 h-5 rounded-full transition-colors ${form.com_meet ? 'bg-[#1a73e8]' : 'bg-gray-300'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-transform ${form.com_meet ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </div>

            {/* Ações */}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button type="submit" disabled={salvando}
                className="flex-1 px-4 py-2.5 text-sm bg-[#0f1e35] hover:bg-[#1a3150] text-white rounded-xl font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2">
                {salvando
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Agendando...</>
                  : <><Calendar className="w-4 h-4" /> Agendar</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}