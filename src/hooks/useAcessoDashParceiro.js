import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getImpersonatedVendedor } from '@/lib/impersonation';

// Acesso de VISUALIZAÇÃO ao Dash Parceiro: usuários nativos (gerentes/SDRs)
// cujo vendedor está atuando na esteira (Fila de Contatos) podem ver o painel,
// sempre em modo somente leitura. Admin espelhando um vendedor herda o acesso dele.
export function useAcessoDashParceiro(user) {
  return useQuery({
    queryKey: ['acesso-dash-parceiro', user?.id, user?.role],
    queryFn: async () => {
      if (!user) return false;
      const isAdmin = user.role === 'admin' || user.permissao_admin === true;
      const imp = isAdmin ? getImpersonatedVendedor() : null;
      let vendedorId = imp?.id || null;
      if (!vendedorId && user.email) {
        const vends = await base44.entities.Vendedor.filter({ email: user.email });
        vendedorId = vends[0]?.id || null;
      }
      if (!vendedorId) return false;
      const fila = await base44.entities.FilaContato.filter({ vendedor_id: vendedorId });
      return fila.length > 0;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}