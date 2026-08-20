import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Save, Loader2, Crown, UserCircle, Check } from 'lucide-react';
import { toast } from 'sonner';

const AURORA = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  accentDim: 'rgba(0,212,170,0.1)',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  purple: '#a78bfa',
};

const PRODUTOS = [
  'CONTA GLOBAL', 'CONTA INTERNACIONAL', 'DOLARIZE', 'ROF', 'CANAL BANCÁRIO',
  'OFFSHORE', 'GARANTIAS', 'HORA TÉCNICA', 'RATING',
];

const PRODUTO_DESC = {
  'CONTA GLOBAL': 'Conta em moeda estrangeira para câmbio e investimentos',
  'CONTA INTERNACIONAL': 'Abertura de conta internacional com transações em múltiplas moedas',
  'DOLARIZE': 'Dolarização de ativos e proteção patrimonial em dólar',
  'ROF': 'Registro de Operação Financeira',
  'CANAL BANCÁRIO': 'Operações via canal bancário',
  'OFFSHORE': 'Estruturação de empresa e conta offshore',
  'GARANTIAS': 'Contrato de garantias e seguros',
  'HORA TÉCNICA': 'Prestação de serviços por hora técnica',
  'RATING': 'Serviços de rating e análise de crédito',
};

export default function PadrinhosModal({ onClose }) {
  const queryClient = useQueryClient();
  const [salvando, setSalvando] = useState(null);
  const [atribuicoes, setAtribuicoes] = useState({});

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores-ativos-padrinhos'],
    queryFn: () => base44.entities.Vendedor.filter({ ativo: true }, 'nome'),
  });
  const { data: padrinhos = [], isLoading } = useQuery({
    queryKey: ['padrinho-produto'],
    queryFn: () => base44.entities.PadrinhoProduto.filter({ ativo: true }),
  });

  useEffect(() => {
    const map = {};
    for (const p of padrinhos) {
      map[p.produto] = { id: p.id, user_id: p.user_id, user_email: p.user_email, user_nome: p.user_nome };
    }
    setAtribuicoes(map);
  }, [padrinhos]);

  const vendedoresOrdenados = [...vendedores].filter(v => v.email).sort((a, b) =>
    (a.nome || a.email).localeCompare(b.nome || b.email)
  );

  const handleSelecionar = (produto, email) => {
    if (!email) {
      setAtribuicoes(a => ({ ...a, [produto]: undefined }));
      return;
    }
    const v = vendedores.find(v => v.email === email);
    if (!v) return;
    setAtribuicoes(a => ({
      ...a,
      [produto]: { user_id: '', user_email: v.email, user_nome: v.nome || v.email },
    }));
  };

  const salvar = async (produto) => {
    const sel = atribuicoes[produto];
    const existente = padrinhos.find(p => p.produto === produto);
    setSalvando(produto);
    try {
      if (!sel || !sel.user_email) {
        if (existente) await base44.entities.PadrinhoProduto.update(existente.id, { ativo: false });
        setAtribuicoes(a => ({ ...a, [produto]: undefined }));
        queryClient.invalidateQueries(['padrinho-produto']);
        toast.success(`Padrinho de ${produto} removido`);
      } else if (existente) {
        await base44.entities.PadrinhoProduto.update(existente.id, {
          user_id: sel.user_id, user_email: sel.user_email, user_nome: sel.user_nome,
        });
        queryClient.invalidateQueries(['padrinho-produto']);
        toast.success(`Padrinho de ${produto} atualizado`);
      } else {
        await base44.entities.PadrinhoProduto.create({
          produto,
          user_id: sel.user_id,
          user_email: sel.user_email,
          user_nome: sel.user_nome,
          ativo: true,
        });
        queryClient.invalidateQueries(['padrinho-produto']);
        toast.success(`Padrinho de ${produto} definido`);
      }
    } catch (e) {
      toast.error('Erro: ' + e.message);
    }
    setSalvando(null);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #0d1117 0%, #1a1a2e 60%, #16213e 100%)', borderBottom: `1px solid ${AURORA.border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.12)' }}>
              <Crown className="w-5 h-5" style={{ color: AURORA.purple }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: AURORA.text }}>Padrinhos por Produto</h2>
              <p className="text-xs" style={{ color: AURORA.textMuted }}>Defina o responsável pela gestão de implantação de cada produto</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition" style={{ color: AURORA.textMuted }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: AURORA.purple }} /></div>
          ) : (
            <div className="space-y-2.5">
              {PRODUTOS.map(produto => {
                const sel = atribuicoes[produto];
                const dirty = sel
                  ? (sel.user_email !== (padrinhos.find(p => p.produto === produto)?.user_email))
                  : !!padrinhos.find(p => p.produto === produto);
                return (
                  <div key={produto} className="rounded-xl p-4" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: sel ? 'rgba(168,85,247,0.15)' : AURORA.bg, border: `1px solid ${sel ? 'rgba(168,85,247,0.3)' : AURORA.border}` }}>
                          {sel
                            ? <Crown className="w-4 h-4" style={{ color: AURORA.purple }} />
                            : <UserCircle className="w-4 h-4" style={{ color: AURORA.textMuted }} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: AURORA.text }}>{produto}</p>
                          <p className="text-[10px] truncate" style={{ color: AURORA.textMuted }}>{PRODUTO_DESC[produto]}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={sel?.user_email || ''}
                          onChange={e => handleSelecionar(produto, e.target.value)}
                          className="px-3 py-2 text-xs rounded-xl focus:outline-none min-w-[200px]"
                          style={{ background: AURORA.bg, border: `1px solid ${AURORA.border}`, color: AURORA.text }}
                        >
                          <option value="">— Sem padrinho —</option>
                          {vendedoresOrdenados.map(v => (
                            <option key={v.id} value={v.email}>{v.nome || v.email}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => salvar(produto)}
                          disabled={!dirty || salvando === produto}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-30"
                          style={{ background: dirty ? 'linear-gradient(135deg,#00D4AA,#0066cc)' : AURORA.surface, color: dirty ? '#fff' : AURORA.textMuted, border: `1px solid ${AURORA.border}` }}
                        >
                          {salvando === produto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (dirty ? <Save className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />)}
                          {dirty ? 'Salvar' : 'OK'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-5 rounded-xl p-4" style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)' }}>
            <p className="text-xs" style={{ color: AURORA.purple }}>
              <strong>Como funciona:</strong> ao formalizar uma venda de um produto, o padrinho recebe notificação via Jarvis e e-mail,
              e passa a ter acesso de gestão (editar etapas, status, condições) nas implantações daquele produto.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}