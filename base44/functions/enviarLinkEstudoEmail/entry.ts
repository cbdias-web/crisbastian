import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const PRODUTOS: Record<string, string> = {
  holding: 'Holding Patrimonial',
  offshore: 'Estrutura Offshore',
  conta_internacional: 'Conta Internacional',
};

// Envia ao cliente, por e-mail, o link do formulário público do Estudo de Viabilidade.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { estudo_id } = await req.json().catch(() => ({}));
    if (!estudo_id) return Response.json({ error: 'estudo_id obrigatorio' }, { status: 400 });

    const estudo = await base44.entities.EstudoViabilidade
      .get(estudo_id)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!estudo) return Response.json({ error: 'Estudo nao encontrado' }, { status: 404 });

    const email = String(estudo.cliente_email || '').trim();
    if (!email) return Response.json({ error: 'Este estudo não tem e-mail do cliente cadastrado.' }, { status: 400 });
    if (!estudo.link_token) return Response.json({ error: 'Gere o link do formulário antes de enviar.' }, { status: 400 });

    const origem = req.headers.get('X-Base44-App-Url') || 'https://villelaexchange.base44.app';
    const link = `${origem}/estudo-viabilidade/${estudo.link_token}`;
    const nome = String(estudo.cliente_nome || '').trim();
    const primeiroNome = nome ? nome.split(' ')[0] : 'tudo bem';

    const envio = await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      template_name: 'LinkEstudoViabilidade',
      category: 'transactional',
      variables: {
        cliente_nome: primeiroNome,
        produto: PRODUTOS[estudo.produto] || 'Estudo de Viabilidade',
        consultor_nome: estudo.responsavel_nome || user.full_name || 'Equipe Villela Exchange',
        link,
      },
    });

    if (envio && envio.success === false) {
      const motivo =
        envio.reason === 'unsubscribed' ? 'Este endereço pediu para não receber e-mails.'
        : envio.reason === 'bounced' ? 'Este endereço não existe ou recusou a mensagem.'
        : envio.reason === 'spam' ? 'O envio foi bloqueado por suspeita de spam.'
        : 'O envio para este endereço não está liberado. É necessário conectar um domínio de e-mail próprio verificado no app.';
      return Response.json({ success: false, reason: envio.reason || null, error: motivo });
    }

    const agora = new Date().toISOString();
    const update: Record<string, unknown> = { data_envio_cliente: estudo.data_envio_cliente || agora };
    if (!estudo.status || estudo.status === 'rascunho') {
      update.status = 'enviado_cliente';
      update.data_envio_cliente = agora;
    }
    await base44.entities.EstudoViabilidade.update(estudo_id, update);

    return Response.json({ success: true, to: email, link, status: update.status || estudo.status });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}