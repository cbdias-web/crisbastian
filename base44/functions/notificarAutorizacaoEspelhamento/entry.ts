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

        // Enviar e-mail para cada administrador
        for (const admin of admins) {
            if (admin.email) {
                try {
                    await base44.asServiceRole.integrations.Core.SendEmail({
                        to: admin.email,
                        subject: '🔔 Autorização Necessária - Espelhamento acima de 30%',
                        body: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <div style="background: linear-gradient(135deg, #1a3150 0%, #0f1e35 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                                    <h1 style="color: white; margin: 0; font-size: 24px;">Villela Exchange</h1>
                                    <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 14px;">Solicitação de Autorização</p>
                                </div>
                                
                                <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
                                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px; border-radius: 4px;">
                                        <p style="margin: 0; color: #92400e; font-weight: bold; font-size: 14px;">
                                            ⚠️ Uma venda com espelhamento acima de 30% foi registrada e requer sua autorização.
                                        </p>
                                    </div>
                                    
                                    <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                                        Detalhes da Venda
                                    </h2>
                                    
                                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                                        <tr style="background: #f9fafb;">
                                            <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #6b7280; width: 40%;">Vendedor:</td>
                                            <td style="padding: 12px; border: 1px solid #e5e7eb; color: #1f2937;">${vendedor_nome}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Cliente:</td>
                                            <td style="padding: 12px; border: 1px solid #e5e7eb; color: #1f2937;">${cliente || '-'}</td>
                                        </tr>
                                        <tr style="background: #f9fafb;">
                                            <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Valor da Venda:</td>
                                            <td style="padding: 12px; border: 1px solid #e5e7eb; color: #1f2937; font-weight: bold;">${formatCurrency(valor)}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Data:</td>
                                            <td style="padding: 12px; border: 1px solid #e5e7eb; color: #1f2937;">${new Date(data_venda).toLocaleDateString('pt-BR')}</td>
                                        </tr>
                                        <tr style="background: #fef3c7;">
                                            <td style="padding: 12px; border: 1px solid #f59e0b; font-weight: bold; color: #92400e;">Total Espelhamento:</td>
                                            <td style="padding: 12px; border: 1px solid #f59e0b; color: #92400e; font-weight: bold; font-size: 16px;">${totalValido.toFixed(1)}%</td>
                                        </tr>
                                    </table>
                                    
                                    <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 15px;">Distribuição do Espelhamento:</h3>
                                    <div style="background: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
                                        <pre style="margin: 0; font-family: 'Courier New', monospace; color: #374151; font-size: 13px; white-space: pre-wrap;">${listaIndicadores}</pre>
                                    </div>
                                    
                                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                                        <p style="color: #6b7280; font-size: 13px; margin: 0;">
                                            <strong>Ação necessária:</strong> Por favor, revise esta transação no sistema e aprove ou ajuste conforme necessário.
                                        </p>
                                    </div>
                                </div>
                                
                                <div style="background: #f9fafb; padding: 20px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                                    <p style="color: #6b7280; font-size: 12px; margin: 0;">
                                        Este é um e-mail automático do sistema Villela Exchange.<br>
                                        Caso tenha dúvidas, entre em contato com a gestão.
                                    </p>
                                </div>
                            </div>
                        `
                    });
                } catch (emailError) {
                    console.error(`Erro ao enviar e-mail para ${admin.email}:`, emailError);
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