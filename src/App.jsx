import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
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

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
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
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
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
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App