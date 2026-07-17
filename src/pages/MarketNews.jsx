import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { RefreshCw, Newspaper, Filter, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import NewsCard from '@/components/market/NewsCard';
import MarketDashboard from '@/components/market/MarketDashboard';

const A = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  accentDim: 'rgba(0,212,170,0.10)',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.5)',
};

const CATS = [
  { value: 'all', label: 'Todos', icon: '🌐' },
  { value: 'commodities', label: 'Commodities', icon: '🛢️' },
  { value: 'forex', label: 'Câmbio', icon: '💱' },
  { value: 'acoes', label: 'Bolsas', icon: '📈' },
  { value: 'cripto', label: 'Cripto', icon: '₿' },
  { value: 'economia', label: 'Economia', icon: '🏛️' },
  { value: 'renda_fixa', label: 'Renda Fixa', icon: '🏦' },
];

export default function MarketNews() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [categoria, setCategoria] = useState('all');
  const [gerando, setGerando] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setIsAdmin(u?.role === 'admin');
    }).catch(() => {});
  }, []);

  const { data: news = [], isLoading } = useQuery({
    queryKey: ['market-news'],
    queryFn: async () => {
      const all = await base44.entities.MarketNews.list('-publicado_em', 100);
      const ativas = all.filter(n => n.ativo !== false);
      // Remover notícias com mais de 3 dias
      const limite = Date.now() - 3 * 24 * 60 * 60 * 1000;
      const expiradas = ativas.filter(n => {
        if (!n.publicado_em) return false;
        return new Date(n.publicado_em).getTime() < limite;
      });
      if (expiradas.length > 0) {
        for (const n of expiradas) {
          try { await base44.entities.MarketNews.delete(n.id); } catch (e) {}
        }
        return ativas.filter(n => !expiradas.find(e => e.id === n.id));
      }
      return ativas;
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const filtered = categoria === 'all' ? news : news.filter(n => n.categoria === categoria);

  const gerarNoticias = async () => {
    setGerando(true);
    try {
      const res = await base44.functions.invoke('gerarMarketNews', {});
      if (res.data?.success) {
        toast.success(`${res.data.criadas} notícias geradas!`);
        queryClient.invalidateQueries({ queryKey: ['market-news'] });
      } else {
        toast.error(res.data?.error || 'Erro ao gerar notícias');
      }
    } catch (e) {
      toast.error('Erro ao gerar notícias');
    }
    setGerando(false);
  };

  const stats = {
    total: news.length,
    alta: news.filter(n => n.relevancia === 'alta').length,
    positivas: news.filter(n => n.impacto === 'positivo').length,
    negativas: news.filter(n => n.impacto === 'negativo').length,
  };

  return (
    <div style={{ minHeight: '100vh', background: A.bg, color: A.text }} className="p-4 sm:p-6">
      <div className="space-y-5 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: A.text }}>
              <Newspaper className="w-6 h-6" style={{ color: A.accent }} />
              Inteligência de Mercado
            </h2>
            <p className="text-sm mt-0.5" style={{ color: A.textMuted }}>
              Notícias, cotações e análises para decisões diárias
            </p>
          </div>
          {isAdmin && (
            <button onClick={gerarNoticias} disabled={gerando}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${A.accent}, #0066cc)`, color: A.bg }}>
              <RefreshCw className={`w-4 h-4 ${gerando ? 'animate-spin' : ''}`} />
              {gerando ? 'Gerando...' : 'Atualizar Notícias'}
            </button>
          )}
        </div>

        {/* Dashboard gráfico de cotações em tempo real */}
        <MarketDashboard />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Notícias', value: stats.total, color: A.accent },
            { label: 'Alta Relevância', value: stats.alta, color: '#f87171', icon: '⚡' },
            { label: 'Impacto Positivo', value: stats.positivas, color: '#34d399', icon: '▲' },
            { label: 'Impacto Negativo', value: stats.negativas, color: '#f87171', icon: '▼' },
          ].map((s, i) => (
            <div key={i} className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: A.surface, border: `1px solid ${A.border}` }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold"
                style={{ background: `${s.color}18`, color: s.color }}>
                {s.icon || s.value}
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: A.text }}>{s.value}</p>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: A.textMuted }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 p-2 rounded-2xl flex-wrap"
          style={{ background: A.surface, border: `1px solid ${A.border}` }}>
          <Filter className="w-3.5 h-3.5 ml-2 flex-shrink-0" style={{ color: A.accent }} />
          {CATS.map(cat => {
            const isActive = categoria === cat.value;
            return (
              <button key={cat.value} onClick={() => setCategoria(cat.value)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition"
                style={{
                  background: isActive ? A.accentDim : 'transparent',
                  color: isActive ? A.accent : A.textMuted,
                  border: isActive ? `1px solid ${A.border}` : '1px solid transparent',
                }}>
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Grid de notícias */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: A.accent, borderTopColor: 'transparent' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl"
            style={{ background: A.surface, border: `1px solid ${A.border}` }}>
            <Zap className="w-8 h-8 mb-3" style={{ color: A.textMuted }} />
            <p className="text-sm font-medium mb-1" style={{ color: A.text }}>Nenhuma notícia encontrada</p>
            <p className="text-xs" style={{ color: A.textMuted }}>
              {isAdmin ? 'Clique em "Atualizar Notícias" para gerar insights do mercado.' : 'Aguarde o administrador atualizar as notícias.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(n => <NewsCard key={n.id} news={n} />)}
          </div>
        )}
      </div>
    </div>
  );
}