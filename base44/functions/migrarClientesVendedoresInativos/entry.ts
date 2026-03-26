import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Verificar se é admin
    if (user?.role !== 'admin' && user?.permissao_admin !== true) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Buscar todos os vendedores
    const vendedores = await base44.asServiceRole.entities.Vendedor.list();

    // Encontrar vendedores origem e destino
    const fernandoHuffel = vendedores.find(v => v.nome?.toUpperCase().includes('FERNANDO') && v.nome?.toUpperCase().includes('HUFFEL'));
    const christiano = vendedores.find(v => v.nome?.toUpperCase().includes('CHRISTIANO'));
    const samuelFraga = vendedores.find(v => v.nome?.toUpperCase().includes('SAMUEL') && v.nome?.toUpperCase().includes('FRAGA'));
    const bruna = vendedores.find(v => v.nome?.toUpperCase().includes('BRUNA') && !v.nome?.toUpperCase().includes('CHRISTOPHER'));

    if (!fernandoHuffel && !christiano) {
      return Response.json({ error: 'Nenhum vendedor inativo encontrado para migração' }, { status: 400 });
    }

    if (!samuelFraga || !bruna) {
      return Response.json({ error: 'Vendedor destino não encontrado' }, { status: 400 });
    }

    // Buscar todos os clientes
    const clientes = await base44.asServiceRole.entities.Cliente.list();

    let migrados = 0;

    // Migrar clientes de Fernando Huffel para Samuel Fraga
    if (fernandoHuffel) {
      const clientesFernando = clientes.filter(c => c.vendedor_id === fernandoHuffel.id);
      for (const cliente of clientesFernando) {
        await base44.asServiceRole.entities.Cliente.update(cliente.id, {
          vendedor_id: samuelFraga.id,
          vendedor_nome: samuelFraga.nome
        });
        migrados++;
      }
    }

    // Migrar clientes de Christiano para Bruna
    if (christiano) {
      const clientesChristiano = clientes.filter(c => c.vendedor_id === christiano.id);
      for (const cliente of clientesChristiano) {
        await base44.asServiceRole.entities.Cliente.update(cliente.id, {
          vendedor_id: bruna.id,
          vendedor_nome: bruna.nome
        });
        migrados++;
      }
    }

    return Response.json({
      success: true,
      message: `Migração concluída: ${migrados} cliente(s) transferido(s)`,
      detalhes: {
        fernando_huffel: {
          encontrado: !!fernandoHuffel,
          nome: fernandoHuffel?.nome,
          destino: samuelFraga?.nome,
          clientes: clientes.filter(c => c.vendedor_id === fernandoHuffel?.id).length
        },
        christiano: {
          encontrado: !!christiano,
          nome: christiano?.nome,
          destino: bruna?.nome,
          clientes: clientes.filter(c => c.vendedor_id === christiano?.id).length
        }
      }
    });
  } catch (error) {
    console.error('Erro na migração:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});