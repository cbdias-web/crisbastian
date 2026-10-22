import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { convidarIndicadorCore } from '../../shared/conviteIndicador.ts';

// Link genérico de indicação (público, sem token fixo por pessoa).
// Qualquer colaborador acessa /indicar, informa nome, e-mail e telefone e:
// - se o e-mail já existe em Parceiro → reativa o cadastro (ativo=true) e reusa/garante o link_token;
// - se não existe → cria o indicador automaticamente (comissão padrão 10%).
// Também envia o CONVITE de acesso ao Portal do Indicador (apenas se ainda não foi convidado),
// para que a pessoa acompanhe suas indicações pelo portal.
// Em seguida o frontend leva a pessoa para /indicacao/{token} (formulário de indicação).
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

      const sr = base44.asServiceRole;

      // Identidade da conta logada (o frontend agora exige login antes do cadastro).
      // O cadastro do indicador fica amarrado ao e-mail da CONTA — é por ele que o
      // portal reconhece o indicador após logout/login.
      let usuarioLogado: any = null;
      try { usuarioLogado = await base44.auth.me(); } catch (e) {}
      const emailConta = usuarioLogado?.email ? String(usuarioLogado.email).trim().toLowerCase() : null;
      if (emailConta && emailConta !== emailLimpo) {
        return Response.json({ error: 'O e-mail informado difere do e-mail da sua conta. Use o e-mail da conta logada.' }, { status: 400 });
      }

      // Busca por e-mail (case-insensitive) — evita duplicar cadastros de indicador
      const todos = await sr.entities.Parceiro.list('nome');
      let parceiro = todos.find((p: any) => (p.email || '').trim().toLowerCase() === emailLimpo);
      let novo = false;
      let reativado = false;

      if (parceiro) {
        const patch: any = { ativo: true };
        if (!parceiro.link_token) patch.link_token = gerarToken();
        if (!parceiro.telefone && telefoneLimpo) patch.telefone = telefoneLimpo;
        reativado = parceiro.ativo === false;
        parceiro = await sr.entities.Parceiro.update(parceiro.id, patch);
      } else {
        parceiro = await sr.entities.Parceiro.create({
          nome: nomeLimpo,
          email: emailLimpo,
          telefone: telefoneLimpo,
          tipo: 'indicador',
          percentual_comissao: 10,
          receber_notificacoes: true,
          ativo: true,
          link_token: gerarToken(),
        });
        novo = true;
      }

      // Usuário JÁ logado (Google/e-mail): promove a indicador na hora, para que o
      // Layout o direcione ao Portal do Indicador e ele nunca veja a plataforma interna.
      // Nunca rebaixa admin.
      let usuario_promovido = false;
      if (usuarioLogado?.id && usuarioLogado.role !== 'admin' && usuarioLogado.permissao_admin !== true) {
        try {
          await sr.entities.User.update(usuarioLogado.id, { indicador: true, role: 'indicador', menus_acesso: [] });
          usuario_promovido = true;
        } catch (e) {
          console.log('promoção service role falhou:', e?.message || e);
          try {
            await sr.entities.User.update(usuarioLogado.id, { indicador: true, menus_acesso: [] });
            usuario_promovido = true;
          } catch (e2) {
            console.log('flag indicador falhou:', e2?.message || e2);
          }
        }
      }

      // Convite de acesso ao portal (apenas na primeira vez — evita spam a cada acesso ao link).
      // Se o usuário já está logado, ele já tem conta: não precisa de convite da plataforma.
      let convite_enviado = false;
      if (!parceiro.convite_enviado && !usuarioLogado) {
        try {
          // Entidades/integrações via service role; inviteUser via cliente padrão (service role não expõe `users`)
          const clienteConvite = { entities: sr.entities, integrations: sr.integrations, users: base44.users, asServiceRole: sr };
          await convidarIndicadorCore(clienteConvite, parceiro, 'link-generico');
          convite_enviado = true;
        } catch (e) {
          console.log('Convite do portal falhou (cadastro mantido):', e?.message || e);
        }
      }

      if (usuarioLogado && !parceiro.convite_enviado) {
        try {
          await sr.entities.Parceiro.update(parceiro.id, {
            convite_enviado: true,
            convite_enviado_em: new Date().toISOString(),
            convite_enviado_por: 'link-generico',
          });
        } catch (e) {}
      }

      return Response.json({
        success: true,
        token: parceiro.link_token,
        nome: parceiro.nome || nomeLimpo,
        novo,
        reativado,
        convite_enviado,
        usuario_promovido,
      });
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