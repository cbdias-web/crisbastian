import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from 'sonner'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import RelatorioComissoes from './pages/RelatorioComissoes';
import Manual from './pages/Manual';
import Notificacoes from './pages/Notificacoes';
import Usuarios from './pages/Usuarios';
import MeusClientes from './pages/MeusClientes';
import RelatorioInteracoes from './pages/RelatorioInteracoes';
import Leads from './pages/Leads';
import Comunicados from './pages/Comunicados';
import NotasFiscais from './pages/NotasFiscais';
import Treinamento from './pages/Treinamento';
import TreinamentoAdmin from './pages/TreinamentoAdmin';
import AssistenteTreinamentos from './pages/AssistenteTreinamentos';
import Pipeline from './pages/Pipeline';
import Contratos from './pages/Contratos';
import ChatPage from './pages/ChatPage';
import Precificacao from './pages/Precificacao';
import Suporte from './pages/Suporte';
import Desempenho from './pages/Desempenho';
import CentralLeads from './pages/CentralLeads';
import Implantacoes from './pages/Implantacoes';
import MarketNews from './pages/MarketNews';
import RncPublicaPage from './pages/RncPublicaPage';
import ContaInternacionalPublicaPage from './pages/ContaInternacionalPublicaPage';
import IndicacaoPublicaPage from './pages/IndicacaoPublicaPage';
import PortalIndicador from './pages/PortalIndicador';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const location = useLocation();
  // Página pública de RNC — bypassa autenticação
  if (location.pathname.startsWith('/rnc-publica')) {
    return (
      <Routes>
        <Route path="/rnc-publica/:token" element={<RncPublicaPage />} />
      </Routes>
    );
  }
  if (location.pathname.startsWith('/conta-internacional-publica')) {
    return (
      <Routes>
        <Route path="/conta-internacional-publica/:token" element={<ContaInternacionalPublicaPage />} />
      </Routes>
    );
  }
  if (location.pathname.startsWith('/indicacao')) {
    return (
      <Routes>
        <Route path="/indicacao/:token" element={<IndicacaoPublicaPage />} />
      </Routes>
    );
  }
  if (location.pathname.startsWith('/portal-indicador')) {
    return (
      <Routes>
        <Route path="/portal-indicador/:token" element={<PortalIndicador />} />
      </Routes>
    );
  }
  return <AuthenticatedAppInner />;
};

const AuthenticatedAppInner = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'user_inactive') {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-50 p-6">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center border border-gray-100">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔒</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Bloqueado</h2>
            <p className="text-sm text-gray-500 mb-6">Sua conta foi desativada. Entre em contato com o administrador para reativar o acesso.</p>
            <button
              onClick={() => base44.auth.logout()}
              className="w-full px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition"
            >
              Sair
            </button>
          </div>
        </div>
      );
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route
        path="/RelatorioComissoes"
        element={
          <LayoutWrapper currentPageName="RelatorioComissoes">
            <RelatorioComissoes />
          </LayoutWrapper>
        }
      />
      <Route
        path="/Notificacoes"
        element={
          <LayoutWrapper currentPageName="Notificacoes">
            <Notificacoes />
          </LayoutWrapper>
        }
      />
      <Route
        path="/Manual"
        element={
          <LayoutWrapper currentPageName="Manual">
            <Manual />
          </LayoutWrapper>
        }
      />
      <Route
        path="/Usuarios"
        element={
          <LayoutWrapper currentPageName="Usuarios">
            <Usuarios />
          </LayoutWrapper>
        }
      />
      <Route
        path="/MeusClientes"
        element={
          <LayoutWrapper currentPageName="MeusClientes">
            <MeusClientes />
          </LayoutWrapper>
        }
      />
      <Route
        path="/RelatorioInteracoes"
        element={
          <LayoutWrapper currentPageName="RelatorioInteracoes">
            <RelatorioInteracoes />
          </LayoutWrapper>
        }
      />
      <Route
        path="/Leads"
        element={
          <LayoutWrapper currentPageName="Leads">
            <Leads />
          </LayoutWrapper>
        }
      />
      <Route
        path="/Comunicados"
        element={
          <LayoutWrapper currentPageName="Comunicados">
            <Comunicados />
          </LayoutWrapper>
        }
      />
      <Route
        path="/NotasFiscais"
        element={
          <LayoutWrapper currentPageName="NotasFiscais">
            <NotasFiscais />
          </LayoutWrapper>
        }
      />
      <Route
        path="/Treinamento"
        element={
          <LayoutWrapper currentPageName="Treinamento">
            <Treinamento />
          </LayoutWrapper>
        }
      />
      <Route
        path="/TreinamentoAdmin"
        element={
          <LayoutWrapper currentPageName="TreinamentoAdmin">
            <TreinamentoAdmin />
          </LayoutWrapper>
        }
      />
      <Route
        path="/AssistenteTreinamentos"
        element={
          <LayoutWrapper currentPageName="AssistenteTreinamentos">
            <AssistenteTreinamentos />
          </LayoutWrapper>
        }
      />
      <Route
        path="/Pipeline"
        element={
          <LayoutWrapper currentPageName="Pipeline">
            <Pipeline />
          </LayoutWrapper>
        }
      />
      <Route
        path="/Contratos"
        element={
          <LayoutWrapper currentPageName="Contratos">
            <Contratos />
          </LayoutWrapper>
        }
      />
      <Route
        path="/ChatPage"
        element={
          <LayoutWrapper currentPageName="ChatPage">
            <ChatPage />
          </LayoutWrapper>
        }
      />
      <Route
        path="/Precificacao"
        element={
          <LayoutWrapper currentPageName="Precificacao">
            <Precificacao />
          </LayoutWrapper>
        }
      />
      <Route
        path="/Suporte"
        element={
          <LayoutWrapper currentPageName="Suporte">
            <Suporte />
          </LayoutWrapper>
        }
      />
      <Route
        path="/Desempenho"
        element={
          <LayoutWrapper currentPageName="Desempenho">
            <Desempenho />
          </LayoutWrapper>
        }
      />
      <Route
        path="/CentralLeads"
        element={
          <LayoutWrapper currentPageName="CentralLeads">
            <CentralLeads />
          </LayoutWrapper>
        }
      />
      <Route
        path="/Implantacoes"
        element={
          <LayoutWrapper currentPageName="Implantacoes">
            <Implantacoes />
          </LayoutWrapper>
        }
      />
      <Route
        path="/MarketNews"
        element={
          <LayoutWrapper currentPageName="MarketNews">
            <MarketNews />
          </LayoutWrapper>
        }
      />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <SonnerToaster position="top-right" richColors />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App