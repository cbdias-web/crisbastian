import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Link genérico de indicação (público, sem token fixo por pessoa).
// Qualquer colaborador acessa /indicar, informa nome, e-mail e telefone e:
// - se o e-mail já existe em Parceiro → reativa o cadastro (ativo=true) e reusa/garante o link_token;
// - se não existe → cria o indicador automaticamente (comissão padrão 10%).
// Em seguida o frontend leva a pessoa para /indicacao/{token} (formulário de indicação),
// que já distribui o lead na esteira e mantém o vínculo de comissionamento.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, nome, email, telefone } = body || {};

    if (action === 'registrar') {
      const nomeLimpo = (nome || '').trim();
      const emailLimpo = (email || '').trim().toLowerCase();
      const telefoneLimpo = (telefone || '').trim();

      if (!nomeLimpo) return Response.json({ error: 'Informe seu nome completo' }, { status: 400 });
      if (!emailLimpo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
        return Response.json({ error: 'Informe um e-mail válido' }, { status: 400 });
      }
      if (!telefoneLimpo) return Response.json({ error: 'Informe seu telefone/WhatsApp' }, { status: 400 });

      // Busca por e-mail (case-insensitive) — evita duplicar cadastros de indicador
      const todos = await base44.asServiceRole.entities.Parceiro.list('nome');
      const existente = todos.find((p) => (p.email || '').trim().toLowerCase() === emailLimpo);

      if (existente) {
        const patch: any = { ativo: true };
        let token = existente.link_token;
        if (!token) { token = gerarToken(); patch.link_token = token; }
        if (!existente.telefone && telefoneLimpo) patch.telefone = telefoneLimpo;
        await base44.asServiceRole.entities.Parceiro.update(existente.id, patch);
        return Response.json({
          success: true,
          token,
          nome: existente.nome || nomeLimpo,
          reativado: existente.ativo === false,
        });
      }

      const criado = await base44.asServiceRole.entities.Parceiro.create({
        nome: nomeLimpo,
        email: emailLimpo,
        telefone: telefoneLimpo,
        tipo: 'indicador',
        percentual_comissao: 10,
        receber_notificacoes: true,
        ativo: true,
        link_token: gerarToken(),
      });
      return Response.json({ success: true, token: criado.link_token, nome: criado.nome, novo: true });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function gerarToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let t = '';
  for (let i = 0; i < 24; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}