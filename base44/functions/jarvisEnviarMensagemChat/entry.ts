import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Normaliza string para comparação (sem acentos, sem espaços extras, lowercase)
function normalize(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Verifica se um texto parece um email
function pareceEmail(s) {
  return /@/.test(String(s || ''));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { destinatarios_emails, destinatarios_nomes, mensagem, remetente_nome } = await req.json();

    if (!mensagem) {
      return Response.json({ error: 'mensagem é obrigatório' }, { status: 400 });
    }

    const emails = Array.isArray(destinatarios_emails) ? destinatarios_emails.filter(Boolean) : [];
    const nomes = Array.isArray(destinatarios_nomes) ? destinatarios_nomes.filter(Boolean) : [];

    if (emails.length === 0 && nomes.length === 0) {
      return Response.json({ error: 'destinatarios_emails e/ou destinatarios_nomes (arrays) são obrigatórios' }, { status: 400 });
    }

    // Carrega todos os usuários UMA vez para resolver nomes parcialmente
    // (sempre carregamos — mesmo que só cheguem emails, alguns podem ser nomes disfarçados)
    const usuariosTodos = await base44.asServiceRole.entities.User.list();

    const nomesNaoEncontrados = [];

    // Resolve nomes explícitos → emails
    const emailsPorNome = [];
    for (const nome of nomes) {
      const nomeNorm = normalize(nome);
      const match = usuariosTodos.find(u => {
        const fn = normalize(u.full_name);
        const nt = normalize(u.nome_tratamento);
        return fn === nomeNorm || nt === nomeNorm || fn.includes(nomeNorm) || nt.includes(nomeNorm);
      });
      if (match?.email) {
        emailsPorNome.push(match.email);
      } else {
        nomesNaoEncontrados.push(nome);
      }
    }

    // Para cada item em "emails": se parecer email, usa direto; se NÃO parecer (sem @),
    // tenta resolver como nome (o agente às vezes coloca "Larissa" no campo de emails)
    const emailsDiretos = [];
    const nomesImplicitos = [];
    for (const item of emails) {
      if (pareceEmail(item)) {
        emailsDiretos.push(item);
      } else {
        nomesImplicitos.push(item);
      }
    }
    for (const nome of nomesImplicitos) {
      const nomeNorm = normalize(nome);
      const match = usuariosTodos.find(u => {
        const fn = normalize(u.full_name);
        const nt = normalize(u.nome_tratamento);
        return fn === nomeNorm || nt === nomeNorm || fn.includes(nomeNorm) || nt.includes(nomeNorm);
      });
      if (match?.email) {
        emailsPorNome.push(match.email);
      } else {
        nomesNaoEncontrados.push(nome);
      }
    }

    // Une tudo, removendo duplicatas (case-insensitive)
    const todosEmails = [...emailsDiretos, ...emailsPorNome];
    const vistos = new Set();
    const emailsUnicos = todosEmails.filter(e => {
      const k = String(e).toLowerCase();
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    });

    if (emailsUnicos.length === 0) {
      return Response.json({
        success: false,
        error: `Nenhum destinatário encontrado. Nomes não resolvidos: ${nomesNaoEncontrados.join(', ')}`,
        resumo: `0 mensagens enviadas. Nomes não encontrados: ${nomesNaoEncontrados.join(', ')}`,
        resultados: nomesNaoEncontrados.map(n => ({ nome: n, status: 'erro', motivo: 'Usuário não encontrado' })),
      }, { status: 404 });
    }

    const remetente = remetente_nome || user.full_name || 'Administrador';
    const resultados = [];

    for (const email of emailsUnicos) {
      try {
        // Valida se o email existe no sistema
        const usuarios = await base44.asServiceRole.entities.User.filter({ email });
        const destinatario = usuarios[0];

        if (!destinatario) {
          resultados.push({ email, status: 'erro', motivo: 'Usuário não encontrado' });
          continue;
        }

        // Monta saudação personalizada com o primeiro nome do destinatário
        const nomeCompleto = destinatario.nome_tratamento || destinatario.full_name || email.split('@')[0];
        const primeiroNome = nomeCompleto.split(' ')[0];
        const mensagemPersonalizada = `Bom dia, ${primeiroNome}! 👋\n\n${mensagem}`;

        // Salva a mensagem na entidade JarvisMensagem
        await base44.asServiceRole.entities.JarvisMensagem.create({
          destinatario_email: email,
          remetente_nome: remetente,
          remetente_email: user.email,
          mensagem: mensagemPersonalizada,
          lida: false,
        });

        resultados.push({ email, status: 'enviado', nome: nomeCompleto });
      } catch (err) {
        resultados.push({ email, status: 'erro', motivo: err.message });
      }
    }

    const enviados = resultados.filter(r => r.status === 'enviado').length;
    const erros = resultados.filter(r => r.status === 'erro').length;

    return Response.json({
      success: true,
      resumo: `${enviados} mensagem(ns) enviada(s) no chat, ${erros} erro(s).`,
      nomes_nao_encontrados: nomesNaoEncontrados,
      resultados,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});