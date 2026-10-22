import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { convidarIndicadorCore } from '../../shared/conviteIndicador.ts';

// Convida um Indicador como USUÁRIO real do app (ação de admin na aba Parceiros).
// A lógica completa (inviteUser → promoção para 'indicador' → e-mail de convite)
// vive em base44/shared/conviteIndicador.ts, reaproveitada também pelo link genérico.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
    if (user.role !== 'admin' && user.permissao_admin !== true) {
      return Response.json({ error: 'Apenas administradores podem enviar convites' }, { status: 403 });
    }

    const body = await req.json();
    const { indicador_id } = body;
    if (!indicador_id) return Response.json({ error: 'indicador_id é obrigatório' }, { status: 400 });

    const ind = await base44.entities.Parceiro.get(indicador_id);
    if (!ind) return Response.json({ error: 'Indicador não encontrado' }, { status: 404 });

    const res = await convidarIndicadorCore(base44, ind, user.email, body?.app_origin);

    return Response.json({
      success: true,
      enviado_para: ind.email.trim(),
      usuario_existia: res.ja_existia,
      role_indicador: res.role_promovido,
      email_personalizado: res.email_personalizado,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}