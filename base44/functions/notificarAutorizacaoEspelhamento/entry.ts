import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { vendedor_nome, cliente, valor, total_espelhamento, indicadores, data_venda } = await req.json();

        // ── Validação de alçada: só notifica se realmente ultrapassar 30% ──
        const totalEsp = parseFloat(total_espelhamento) || 0;
        const valorNum = parseFloat(valor) || 0;

        // Admin não precisa de autorização — tem alçada total
        if (user.role === 'admin' || user.permissao_admin === true) {
            return Response.json({ 
                success: true, 
                message: 'Usuário é administrador — notificação não necessária',
                skipped: true 
            });
        }

        // Rejeita notificações com dados incompletos (valor zero ou data vazia)
        if (valorNum <= 0 || !data_venda) {
            return Response.json({ 
                success: true, 
                message: 'Dados da venda incompletos — notificação não gerada',
                skipped: true 
            });
        }

        // Filtra apenas indicadores válidos (com nome e percentual > 0)
        const indicadoresValidos = (indicadores || []).filter(i => i.nome && i.percentual > 0);
        const totalValido = indicadoresValidos.reduce((s, i) => s + (parseFloat(i.percentual) || 0), 0);

        // Só cria notificação se o espelhamento válido ultrapassar 30%
        if (totalValido <= 30) {
            return Response.json({ 
                success: true, 
                message: `Espelhamento de ${totalValido.toFixed(1)}% dentro da alçada — notificação não necessária`,
                skipped: true 
            });
        }

        // Criar notificação na plataforma com dados validados
        await base44.asServiceRole.entities.NotificacaoAutorizacao.create({
            tipo: 'espelhamento_acima_30',
            vendedor_nome,
            cliente: cliente || '',
            valor_venda: valorNum,
            total_espelhamento: totalValido,
            indicadores: indicadoresValidos,
            data_venda: data_venda || new Date().toISOString().split('T')[0],
            status: 'pendente',
            lida: false
        });

        // Buscar todos os administradores
        const usuarios = await base44.asServiceRole.entities.User.list();
        const admins = usuarios.filter(u => u.role === 'admin' || u.permissao_admin === true);

        if (admins.length === 0) {
            return Response.json({ message: 'Nenhum administrador encontrado' }, { status: 200 });
        }

        // Formatar lista de indicadores
        const listaIndicadores = indicadoresValidos.map(i => 
            `- ${i.nome}: ${i.percentual}%`
        ).join('\n');

        const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
        }).format(v || 0);

        // Notificar admins apenas via Jarvis (in-app) — disparos de e-mail desativados
        const mensagemResumo = `🔔 *Autorização Necessária — Espelhamento acima de 30%*\n\n` +
            `**Vendedor:** ${vendedor_nome}\n**Cliente:** ${cliente || '—'}\n**Valor:** ${formatCurrency(valorNum)}\n` +
            `**Total de espelhamento:** ${totalValido.toFixed(1)}%\n\n` +
            `Indicadores:\n${listaIndicadores}\n\n` +
            `Revise na aba *Notificações* da plataforma.`;
        for (const admin of admins) {
            if (admin.email) {
                try {
                    await base44.asServiceRole.entities.JarvisMensagem.create({
                        destinatario_email: admin.email,
                        remetente_nome: 'Sistema',
                        remetente_email: '',
                        mensagem: mensagemResumo,
                        lida: false,
                    });
                } catch (e) {
                    console.error(`Erro ao notificar ${admin.email}:`, e);
                }
            }
        }

        return Response.json({ 
            success: true, 
            message: `Notificação enviada para ${admins.length} administrador(es)` 
        });

    } catch (error) {
        console.error('Erro ao notificar administrador:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});