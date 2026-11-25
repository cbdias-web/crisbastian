// Nova capa do portal (avatares + mural + células) em fase de testes.
// Só os e-mails abaixo veem a novidade. Para liberar a um usuário específico,
// inclua o e-mail aqui ou marque `novo_portal: true` no cadastro dele.
// Para liberar a todos, troque LIBERADO_PARA_TODOS para true.
export const LIBERADO_PARA_TODOS = true;

export const NOVO_PORTAL_EMAILS = [
  'cris.morais@grupovillela.com',
];

export function usaNovoPortal(user) {
  if (!user) return false;
  if (LIBERADO_PARA_TODOS) return true;
  if (user.novo_portal === true) return true;
  return NOVO_PORTAL_EMAILS.includes(String(user.email || '').toLowerCase());
}

// Visual dos blocos de menu (os rótulos são os mesmos grupos do menu atual).
export const BLOCOS_VISUAL = {
  'Comercial': { cor: '#00D4AA', fundo: 'rgba(0,212,170,0.12)', desc: 'Dashboard, vendas, contratos, pipeline, estudos e desempenho' },
  'Prospecção': { cor: '#60A5FA', fundo: 'rgba(96,165,250,0.12)', desc: 'Fila de contatos, leads, prospecção e parceiros' },
  'Apoio': { cor: '#A78BFA', fundo: 'rgba(167,139,250,0.12)', desc: 'Clientes, equipe, manual, capacitação e suporte' },
  'Admin': { cor: '#F59E0B', fundo: 'rgba(245,158,11,0.12)', desc: 'Comissões, usuários, metas, comunicados e produtos' },
  'Indicador': { cor: '#00D4AA', fundo: 'rgba(0,212,170,0.12)', desc: 'Seu painel de indicações' },
};

export const CELULAS_CAPA = [
  { id: 'estruturados', nome: 'Produtos estruturados', produtos: 'Offshore · Conta internacional · Holding', ativa: true, cor: '#C9A962', glow: 'rgba(201,169,98,0.5)' },
  { id: 'internacional', nome: 'Área internacional', produtos: 'ROF · Canal bancário · Conta global · Dolarize · Câmbio', ativa: true, cor: '#4F8DF5', glow: 'rgba(79,141,245,0.5)' },
  { id: 'cross', nome: 'Operações cross', produtos: 'Score · Rating · Diagnóstico · Monitore', ativa: true, cor: '#9B87F5', glow: 'rgba(155,135,245,0.5)' },
];
