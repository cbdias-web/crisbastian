import { useState } from 'react';
import { MessageCircle, Mail, Phone, ChevronDown, CheckCircle2, Send, Loader2, LifeBuoy, BookOpen, Zap, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const FAQS = [
  {
    cat: 'Acesso',
    items: [
      { q: 'Nao recebi o convite para acessar a plataforma.', a: 'Verifique sua caixa de spam. Caso nao encontre, solicite ao administrador que reenvie o convite em Usuarios > Convidar Usuario.' },
      { q: 'Esqueci minha senha.', a: 'Na tela de login, clique em "Esqueci minha senha". Um link de redefinicao sera enviado para o seu e-mail cadastrado.' },
      { q: 'Meu acesso foi bloqueado.', a: 'O administrador pode ter desativado sua conta. Entre em contato pelo WhatsApp do suporte ou solicite reativacao ao administrador da empresa.' },
    ],
  },
  {
    cat: 'Vendas e Comissoes',
    items: [
      { q: 'Registrei uma venda errada. Como corrigir?', a: 'Em Vendas, localize a venda e clique em "Editar". Altere os campos necessarios e salve. As comissoes sao recalculadas automaticamente. Para exclusao, apenas administradores tem essa permissao.' },
      { q: 'Minha comissao nao aparece.', a: 'A comissao e gerada automaticamente ao salvar a venda. Verifique se a venda foi salva com sucesso em Vendas. Se a venda constar mas a comissao nao aparecer, acione o suporte.' },
      { q: 'Como altero o percentual de comissao de um vendedor?', a: 'Acesse Vendedores, edite o vendedor desejado e altere o percentual de comissao padrao. O novo percentual vale para as proximas vendas.' },
    ],
  },
  {
    cat: 'Contratos e Pipeline',
    items: [
      { q: 'Criei um contrato mas o admin nao recebeu notificacao.', a: 'Verifique em Notificacoes > Administrativo se a notificacao foi gerada. Se nao, confirme que o status do contrato e "Gerado" (nao "Rascunho").' },
      { q: 'Nao consigo mover um negocio no Pipeline.', a: 'Clique no card do negocio, edite a temperatura e salve. Ou arraste o card entre colunas no modo Kanban.' },
      { q: 'Como converto um Pipeline em contrato?', a: 'No card do negocio, clique no icone de documento. O sistema cria um contrato pre-preenchido em rascunho para os produtos que exigem contrato formal.' },
    ],
  },
  {
    cat: 'Precificacao',
    items: [
      { q: 'Os valores do simulador estao incorretos.', a: 'Verifique os parametros em Precificacao > Parametros. Os valores base (piso de adesao, percentuais, cambio) podem ter sido alterados por um administrador.' },
      { q: 'Como altero os valores de uma jurisdicao no Offshore?', a: 'Acesse Precificacao > Parametros > Jurisdicoes / Destinos Offshore. Edite os valores de constituicao P1, P2 e manutencao e clique em "Salvar Todos os Parametros".' },
      { q: 'A busca de cambio pelo mercado nao funciona.', a: 'O servico de cotacao depende de disponibilidade de API externa. Nesse caso, insira o valor do cambio manualmente no campo disponivel no simulador.' },
    ],
  },
  {
    cat: 'Chat e Google Calendar',
    items: [
      { q: 'Nao estou recebendo mensagens no chat.', a: 'Verifique se voce e membro do canal. Para canais privados, o criador precisa adicionar voce. Para DMs, verifique sua conexao de internet.' },
      { q: 'O link do Google Meet nao e gerado.', a: 'Sua conta Google precisa estar conectada. Acesse Agenda do Dia e clique em "Google Calendar" para vincular sua conta. Siga o passo a passo na tela.' },
      { q: 'O Jarvis nao esta me notificando sobre compromissos.', a: 'Certifique-se de que o agendamento tem o campo "Horario" preenchido. Agendamentos sem horario nao disparam lembretes automaticos.' },
    ],
  },
];

const CONTATOS = [
  {
    icon: MessageCircle,
    label: 'WhatsApp Suporte',
    valor: '+55 (11) 99999-0000',
    desc: 'Atendimento de seg a sex, 9h–18h',
    cor: 'bg-green-500',
    href: 'https://wa.me/5511999990000',
  },
  {
    icon: Mail,
    label: 'E-mail',
    valor: 'suporte@villelaexchange.com.br',
    desc: 'Resposta em ate 24h uteis',
    cor: 'bg-blue-500',
    href: 'mailto:suporte@villelaexchange.com.br',
  },
];

function FaqAccordion({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left transition ${open ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}>
        <span className="text-sm font-medium text-gray-800 pr-3">{item.q}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 bg-blue-50 border-t border-blue-100">
          <p className="text-sm text-gray-700 leading-relaxed">{item.a}</p>
        </div>
      )}
    </div>
  );
}

export default function Suporte() {
  const [form, setForm] = useState({ assunto: '', mensagem: '', categoria: '' });
  const [enviando, setEnviando] = useState(false);
  const [catAtiva, setCatAtiva] = useState(FAQS[0].cat);

  async function enviarMensagem(e) {
    e.preventDefault();
    if (!form.assunto.trim() || !form.mensagem.trim()) {
      toast.error('Preencha assunto e mensagem.');
      return;
    }
    setEnviando(true);
    try {
      const user = await base44.auth.me();
      await base44.integrations.Core.SendEmail({
        to: 'suporte@villelaexchange.com.br',
        subject: `[Suporte] ${form.assunto}`,
        body: `Solicitacao de suporte recebida via plataforma.\n\nUsuario: ${user?.full_name || ''} (${user?.email || ''})\nCategoria: ${form.categoria || 'Nao informada'}\n\nMensagem:\n${form.mensagem}`,
      });
      toast.success('Mensagem enviada! Entraremos em contato em breve.');
      setForm({ assunto: '', mensagem: '', categoria: '' });
    } catch (err) {
      toast.error('Erro ao enviar. Tente novamente ou use o WhatsApp.');
    }
    setEnviando(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f1e35 0%, #1a3150 60%, #1e3a5f 100%)' }}>
        <div className="absolute top-0 right-0 w-80 h-80 opacity-10 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, #4a90d9 0%, transparent 70%)', transform: 'translate(20%, -30%)' }} />
        <div className="relative px-6 py-8 max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-blue-300/60 text-[10px] uppercase tracking-[0.2em] font-semibold">Villela Exchange</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span className="text-white/40 text-[10px] uppercase tracking-[0.15em]">Gestao Comercial</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg bg-blue-500">
              <LifeBuoy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Central de Suporte</h1>
              <p className="text-white/50 text-xs mt-0.5">Duvidas, problemas e solicitacoes de ajuda</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* Canais de contato */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CONTATOS.map(c => {
            const Icon = c.icon;
            return (
              <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-4 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition group">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${c.cor} flex-shrink-0`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{c.label}</p>
                  <p className="font-bold text-gray-900 text-sm mt-0.5 group-hover:text-blue-600 transition">{c.valor}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.desc}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-300 -rotate-90 flex-shrink-0" />
              </a>
            );
          })}
        </div>

        {/* Links rapidos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: BookOpen, label: 'Acessar o Manual', desc: 'Guia completo da plataforma', href: '/Manual', cor: 'text-amber-600 bg-amber-50 border-amber-100' },
            { icon: Zap, label: 'Treinamentos', desc: 'Capacitacao em video e texto', href: '/Treinamento', cor: 'text-rose-600 bg-rose-50 border-rose-100' },
            { icon: AlertCircle, label: 'Notificacoes', desc: 'Status de autorizacoes pendentes', href: '/Notificacoes', cor: 'text-red-600 bg-red-50 border-red-100' },
          ].map(item => {
            const Icon = item.icon;
            return (
              <a key={item.label} href={item.href}
                className={`flex items-center gap-3 p-4 rounded-2xl border ${item.cor} hover:shadow-sm transition`}>
                <Icon className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs opacity-70">{item.desc}</p>
                </div>
              </a>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* FAQ */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-sm">Perguntas Frequentes</h2>
            </div>
            {/* Categorias FAQ */}
            <div className="flex gap-1 px-3 py-2 border-b border-gray-100 flex-wrap">
              {FAQS.map(f => (
                <button key={f.cat} onClick={() => setCatAtiva(f.cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${catAtiva === f.cat ? 'bg-[#1a3150] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {f.cat}
                </button>
              ))}
            </div>
            <div className="p-4 space-y-2">
              {FAQS.find(f => f.cat === catAtiva)?.items.map((item, i) => (
                <FaqAccordion key={i} item={item} />
              ))}
            </div>
          </div>

          {/* Formulario de suporte */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-sm">Enviar Solicitacao</h2>
              <p className="text-xs text-gray-400 mt-0.5">Descreva o problema e entraremos em contato</p>
            </div>
            <form onSubmit={enviarMensagem} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Categoria</label>
                <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-400">
                  <option value="">Selecione a categoria</option>
                  {FAQS.map(f => <option key={f.cat} value={f.cat}>{f.cat}</option>)}
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Assunto *</label>
                <input type="text" value={form.assunto} onChange={e => setForm(f => ({ ...f, assunto: e.target.value }))}
                  placeholder="Resumo do problema"
                  className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Descricao *</label>
                <textarea value={form.mensagem} onChange={e => setForm(f => ({ ...f, mensagem: e.target.value }))}
                  rows={5} placeholder="Descreva detalhadamente o problema, incluindo o que estava fazendo quando ocorreu..."
                  className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-400 resize-none" />
              </div>
              <button type="submit" disabled={enviando}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#0a1f35] hover:bg-[#1a3150] text-white rounded-xl text-sm font-semibold transition disabled:opacity-60">
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {enviando ? 'Enviando...' : 'Enviar Solicitacao'}
              </button>
            </form>
          </div>
        </div>

        {/* Horario de atendimento */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
          <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Horario de Atendimento</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Segunda a Sexta, das 9h as 18h (horario de Brasilia).
              Urgencias fora do horario: use o WhatsApp. Resposta no proximo dia util para e-mails.
            </p>
          </div>
        </div>

        <div className="text-center py-4 text-[11px] text-gray-300 uppercase tracking-widest">
          Villela Exchange · Central de Suporte · v2026
        </div>
      </div>
    </div>
  );
}