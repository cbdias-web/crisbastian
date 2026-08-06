import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Calendar, Clock, Video, User, CheckCircle2, ExternalLink, Plus } from 'lucide-react';
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
  vendedorId = '',
  vendedorNome = '',
  clienteNome = '',
  clienteId = '',
  clienteTelefone = '',
  clienteCpfCnpj = '',
  pipelineId = '',
  dataInicial = '',
  clientes = [],
  todosVendedores = [],
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
  const [resultado, setResultado] = useState(null);
  const [gerentesAdicionais, setGerentesAdicionais] = useState([]);
  const [searchGerente, setSearchGerente] = useState('');
  const [dropdownGerente, setDropdownGerente] = useState(false);

  const gerentesFiltrados = todosVendedores.filter(v =>
    v.id !== vendedorId &&
    (!searchGerente || v.nome?.toLowerCase().includes(searchGerente.toLowerCase()))
  );

  const toggleGerente = (v) => {
    setGerentesAdicionais(prev =>
      prev.find(g => g.id === v.id) ? prev.filter(g => g.id !== v.id) : [...prev, v]
    );
  };
  const [clienteSearch, setClienteSearch] = useState(clienteNome);
  const [selectedCliente, setSelectedCliente] = useState(
    clienteId ? { id: clienteId, nome: clienteNome, cpf_cnpj: clienteCpfCnpj, telefone: clienteTelefone } : null
  );
  const [clientesLocais, setClientesLocais] = useState(clientes);
  const [showNovoContatoForm, setShowNovoContatoForm] = useState(false);
  const [novoContatoForm, setNovoContatoForm] = useState({ nome: '', cpf_cnpj: '', telefone: '' });
  const [criandoContato, setCriandoContato] = useState(false);

  const clientesFiltrados = clientesLocais
    .filter(c => !clienteSearch || c.nome?.toLowerCase().includes(clienteSearch.toLowerCase()) || c.cpf_cnpj?.includes(clienteSearch))
    .slice(0, 20);

  const criarNovoContato = async () => {
    if (!novoContatoForm.nome.trim()) { return; }
    setCriandoContato(true);
    try {
      const novo = await base44.entities.Cliente.create({
        nome: novoContatoForm.nome.trim(),
        cpf_cnpj: novoContatoForm.cpf_cnpj.trim(),
        telefone: novoContatoForm.telefone.trim(),
        origem: 'nativo',
      });
      setClientesLocais(prev => [...prev, novo]);
      setSelectedCliente(novo);
      setClienteSearch(novo.nome);
      setShowNovoContatoForm(false);
      setNovoContatoForm({ nome: '', cpf_cnpj: '', telefone: '' });
    } catch (e) {}
    setCriandoContato(false);
  };

  // Ao mudar horário início → calcula fim automaticamente (+1h)
  const onChangeHorario = (val) => {
    const [h, m] = val.split(':').map(Number);
    const fimH = String(h + 1 > 23 ? 23 : h + 1).padStart(2, '0');
    const fimM = String(m).padStart(2, '0');
    setForm(f => ({ ...f, horario: val, horario_fim: `${fimH}:${fimM}` }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const nomeCliente = selectedCliente?.nome || clienteSearch.trim();
    if (!nomeCliente) { toast.error('Informe o cliente'); return; }
    if (!form.data) { toast.error('Informe a data'); return; }
    if (!form.horario) { toast.error('Informe o horário'); return; }

    setSalvando(true);
    try {
      // Usa o ID do registro Vendedor se disponível, senão cai no user.id
      const vidFinal = vendedorId || user.id;
      const vnomeFinal = vendedorNome || user.nome_tratamento || user.full_name || user.email;

      const cId = selectedCliente?.id || clienteId || '';
      const cNome = selectedCliente?.nome || clienteSearch.trim();
      const cCpf = selectedCliente?.cpf_cnpj || clienteCpfCnpj || '';
      const cTel = selectedCliente?.telefone || clienteTelefone || '';

      const agendaBase = {
        lead_id: cId || user.id,
        lead_nome: cNome,
        lead_cpf_cnpj: cCpf,
        lead_telefone: cTel,
        cliente_id: cId || '',
        data_agendada: form.data,
        horario: form.horario,
        posicao_dia: 0,
        status: 'pendente',
        resultado: form.observacao || '',
      };

      // Verificar sobreposição de horário antes de criar
      if (form.horario && form.data) {
        try {
          const agendasDia = await base44.entities.AgendaContato.filter({ vendedor_id: vidFinal, data_agendada: form.data });
          const conflito = agendasDia.find(a =>
            a.horario === form.horario &&
            a.lead_id !== (cId || '') &&
            a.status === 'pendente'
          );
          if (conflito) {
            toast.warning(
              `⚠️ Sobrepøsição: já há um compromisso às ${form.horario} com "${conflito.lead_nome}". O agendamento será criado mesmo assim.`,
              { duration: 6000 }
            );
          }
          // Verificar para gerentes adicionais
          for (const g of gerentesAdicionais) {
            const agDia = await base44.entities.AgendaContato.filter({ vendedor_id: g.id, data_agendada: form.data });
            const conflG = agDia.find(a => a.horario === form.horario && a.lead_id !== (cId || '') && a.status === 'pendente');
            if (conflG) {
              toast.warning(`⚠️ ${g.nome} já tem compromisso às ${form.horario} com "${conflG.lead_nome}".`, { duration: 5000 });
            }
          }
        } catch {}
      }

      // 1. Cria agenda para o gerente principal
      const agenda = await base44.entities.AgendaContato.create({
        ...agendaBase,
        vendedor_id: vidFinal,
        vendedor_nome: vnomeFinal,
      });

      // 1b. Cria agenda para gerentes adicionais
      for (const g of gerentesAdicionais) {
        await base44.entities.AgendaContato.create({
          ...agendaBase,
          vendedor_id: g.id,
          vendedor_nome: g.nome,
        });
      }

      // 2. Se quer Meet → chama função backend com horário já definido
      if (form.com_meet) {
        try {
          // Descobre e-mail do gerente principal (especialista alvo) e dos adicionais
          const gerentePrincipal = todosVendedores.find(v => v.id === vidFinal);
          const targetEmail = gerentePrincipal?.email && gerentePrincipal.email !== user.email ? gerentePrincipal.email : '';
          const adicionaisEmails = gerentesAdicionais
            .map(g => g.email)
            .filter(e => e && e !== user.email && e !== targetEmail);

          const res = await base44.functions.invoke('criarMeetAgenda', {
            agenda_id: agenda.id,
            lead_nome: cNome,
            data_agendada: form.data,
            horario_inicio: form.horario,
            horario_fim: form.horario_fim,
            com_meet: true,
            target_user_email: targetEmail,
            organizer_email: user.email,
            attendees_emails: adicionaisEmails,
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
                type="text"
                placeholder="Buscar cliente ou lead..."
                value={clienteSearch}
                onChange={e => { setClienteSearch(e.target.value); setSelectedCliente(null); setShowNovoContatoForm(false); }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150] mb-1"
              />
              {selectedCliente ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
                  <span className="text-sm font-medium text-[#0f1e35] flex-1">{selectedCliente.nome}</span>
                  {selectedCliente.cpf_cnpj && <span className="text-[10px] text-gray-400">{selectedCliente.cpf_cnpj}</span>}
                  <button type="button" onClick={() => { setSelectedCliente(null); setClienteSearch(''); }} className="text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : clienteSearch.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  {clientesFiltrados.length === 0 ? (
                    <div className="py-2 px-3">
                      <p className="text-xs text-gray-400 text-center py-2">Nenhum cliente encontrado</p>
                      {!showNovoContatoForm ? (
                        <button type="button"
                          onClick={() => { setShowNovoContatoForm(true); setNovoContatoForm(f => ({ ...f, nome: clienteSearch })); }}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition mt-1">
                          <Plus className="w-3.5 h-3.5" /> Criar novo contato
                        </button>
                      ) : (
                        <div className="space-y-2 mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <p className="text-[11px] font-semibold text-gray-600 mb-2">Novo Contato</p>
                          <input type="text" placeholder="Nome completo *" value={novoContatoForm.nome}
                            onChange={e => setNovoContatoForm(f => ({ ...f, nome: e.target.value }))}
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]" />
                          <input type="text" placeholder="CPF / CNPJ" value={novoContatoForm.cpf_cnpj}
                            onChange={e => setNovoContatoForm(f => ({ ...f, cpf_cnpj: e.target.value }))}
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]" />
                          <input type="text" placeholder="Telefone" value={novoContatoForm.telefone}
                            onChange={e => setNovoContatoForm(f => ({ ...f, telefone: e.target.value }))}
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]" />
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setShowNovoContatoForm(false)}
                              className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-500">Cancelar</button>
                            <button type="button" onClick={criarNovoContato} disabled={criandoContato || !novoContatoForm.nome.trim()}
                              className="flex-1 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-1">
                              {criandoContato ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="w-3 h-3" />}
                              Criar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : clientesFiltrados.map(c => (
                    <button type="button" key={c.id} onClick={() => { setSelectedCliente(c); setClienteSearch(c.nome); }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition">
                      <span className="font-medium">{c.nome}</span>
                      {c.cpf_cnpj && <span className="text-xs text-gray-400 ml-2">{c.cpf_cnpj}</span>}
                      {c.vendedor_nome && <span className="text-[10px] text-blue-500 ml-2">· {c.vendedor_nome}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Gerentes adicionais */}
            {todosVendedores.length > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Outros gerentes participantes</label>
                {gerentesAdicionais.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {gerentesAdicionais.map(g => (
                      <span key={g.id} className="flex items-center gap-1 px-2 py-1 bg-[#0f1e35] text-white text-xs font-medium rounded-lg">
                        {g.nome}
                        <button type="button" onClick={() => toggleGerente(g)} className="text-white/60 hover:text-white ml-0.5"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar gerente para incluir..."
                    value={searchGerente}
                    onFocus={() => setDropdownGerente(true)}
                    onChange={e => { setSearchGerente(e.target.value); setDropdownGerente(true); }}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]"
                  />
                  {dropdownGerente && (
                    <>
                      <div className="fixed inset-0 z-[9]" onClick={() => setDropdownGerente(false)} />
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                        {gerentesFiltrados.map(v => {
                          const sel = gerentesAdicionais.find(g => g.id === v.id);
                          return (
                            <button type="button" key={v.id} onClick={() => { toggleGerente(v); setSearchGerente(''); }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-gray-50 border-b border-gray-50 last:border-0 ${sel ? 'bg-blue-50' : ''}`}>
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${sel ? 'bg-[#0f1e35] border-[#0f1e35]' : 'border-gray-300'}`}>
                                {sel && <svg width="9" height="9" viewBox="0 0 10 8" fill="none"><path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                              </div>
                              <span className={`font-medium ${sel ? 'text-[#0f1e35]' : 'text-gray-700'}`}>{v.nome}</span>
                            </button>
                          );
                        })}
                        {gerentesFiltrados.length === 0 && <p className="text-xs text-gray-400 text-center py-3">Nenhum gerente</p>}
                        <button type="button" onClick={() => setDropdownGerente(false)} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-2 border-t border-gray-100">Fechar</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

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