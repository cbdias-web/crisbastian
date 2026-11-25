import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Migra os contratos da estrutura antiga (área Contratos) para a nova estrutura (células).
// Só administradores. Body: { simular?: boolean (padrão true), desde?: 'AAAA-MM-DD' }
//  1) Cliente: contrato sem cliente_id → vincula ao cadastro pelo CPF/CNPJ (ou cria na carteira do gerente).
//  2) Negociação: contrato sem pipeline_id → vincula ao negócio "Fechado" do mesmo cliente e produto.
//  3) Produtos estruturados (Offshore, Conta internacional): contrato sem operação → vincula ao estudo
//     do mesmo cliente ou cria a operação (estudo "migrado", já na etapa de contrato).
//  4) Vendas: venda nova sem contrato_id → vincula ao contrato do mesmo cliente e produto
//     (só quando a correspondência é inequívoca; valores e datas da venda não são alterados).
// Tudo é idempotente: rodar de novo não duplica nada.

const dig = (s: unknown) => String(s ?? '').replace(/\D/g, '');
const norm = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();
const fmtDoc = (s: unknown) => {
  const d = dig(s);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return String(s ?? '').trim();
};
const ESTRUTURADOS: Record<string, string> = { 'OFFSHORE': 'offshore', 'CONTA INTERNACIONAL': 'conta_internacional' };
const FECHADOS = ['no_pipeline', 'pago'];

async function todos(ent: any, ordem = '-created_date') {
  const out: any[] = [];
  for (let skip = 0; skip < 20000; skip += 500) {
    const lote = await ent.list(ordem, 500, skip);
    if (!Array.isArray(lote) || lote.length === 0) break;
    out.push(...lote);
    if (lote.length < 500) break;
  }
  return out;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && (user as any).permissao_admin !== true) return Response.json({ error: 'Apenas administradores.' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const simular = body.simular !== false;
    const desde = String(body.desde || '');
    const sr = base44.asServiceRole.entities;
    const agora = new Date().toISOString();

    const [contratosTodos, estudos, pipeline, vendas, vendedores] = await Promise.all([
      todos(sr.Contrato), todos(sr.EstudoViabilidade), todos(sr.Pipeline), todos(sr.Venda, '-data'), sr.Vendedor.list('nome', 500),
    ]);
    const contratos = contratosTodos.filter((c: any) => c.status !== 'cancelado' && (!desde || String(c.created_date || '') >= desde));
    const vendPorId = new Map((vendedores || []).map((v: any) => [v.id, v]));
    const vendPorNome = new Map((vendedores || []).map((v: any) => [norm(v.nome), v]));
    const vendDe = (c: any) => vendPorId.get(c.vendedor_id) || vendPorNome.get(norm(c.vendedor_nome)) || null;

    const rel: any = { simular, contratos_analisados: contratos.length, clientes_vinculados: [], clientes_criados: [], negociacoes_vinculadas: [], operacoes_vinculadas: [], operacoes_criadas: [], vendas_vinculadas: [], vendas_ambiguas: [], erros: [] };
    const passo = async (fn: () => Promise<any>, erro: string) => { if (simular) return null; try { return await fn(); } catch (e) { rel.erros.push(`${erro}: ${(e as Error).message}`); return null; } };

    // 1) Cliente
    const cacheCli = new Map<string, any>();
    for (const c of contratos) {
      if (c.cliente_id || !dig(c.cpf_cnpj)) continue;
      const d = dig(c.cpf_cnpj);
      let cli = cacheCli.get(d);
      if (!cli) {
        const r = await sr.Cliente.filter({ $or: [{ cpf_cnpj: fmtDoc(d) }, { cpf_cnpj: d }, { cpf_cnpj: ' ' + d }] }, '-created_date', 1).catch(() => []);
        cli = r?.[0] || null;
      }
      if (cli) {
        rel.clientes_vinculados.push(`${c.nome} (${c.tipo})`);
      } else {
        const v = vendDe(c);
        cli = await passo(() => sr.Cliente.create({
          nome: c.nome, cpf_cnpj: fmtDoc(d), tipo_pessoa: d.length === 11 ? 'PF' : 'PJ', email: c.email || '', telefone: c.telefone || '',
          cidade: c.cidade || '', estado: c.estado || '', origem: 'nativo', observacao: `Cadastro criado na migração do contrato ${c.tipo}.`,
          ...(v ? { vendedor_id: v.id, vendedor_nome: v.nome } : {}),
        }), `Cliente de ${c.nome}`);
        rel.clientes_criados.push(`${c.nome} (${c.tipo})`);
      }
      if (cli) {
        cacheCli.set(d, cli);
        c.cliente_id = cli.id;
        await passo(() => sr.Contrato.update(c.id, { cliente_id: cli.id }), `Vínculo de cliente em ${c.nome}`);
      }
    }

    // 2) Negociação de origem
    const pipeUsados = new Set(contratosTodos.map((c: any) => c.pipeline_id).filter(Boolean));
    for (const c of contratos) {
      if (c.pipeline_id || !dig(c.cpf_cnpj)) continue;
      const cand = pipeline.filter((p: any) => !pipeUsados.has(p.id) && p.temperatura === 'Fechado' && dig(p.cliente_cpf_cnpj) === dig(c.cpf_cnpj)
        && norm(p.produto).includes(norm(c.tipo)) && !/PARCELA/.test(norm(p.produto)));
      if (cand.length !== 1) continue;
      pipeUsados.add(cand[0].id);
      c.pipeline_id = cand[0].id;
      rel.negociacoes_vinculadas.push(`${c.nome} (${c.tipo})`);
      await passo(() => sr.Contrato.update(c.id, { pipeline_id: cand[0].id }), `Negociação de ${c.nome}`);
    }

    // 3) Operações de produtos estruturados
    const estUsados = new Set(contratosTodos.map((c: any) => c.estudo_id).filter(Boolean));
    for (const c of contratos) {
      const produto = ESTRUTURADOS[norm(c.tipo)];
      if (!produto || c.estudo_id) continue;
      const existente = estudos.find((e: any) => e.produto === produto && !estUsados.has(e.id) && e.status !== 'cancelado'
        && ((dig(e.cliente_documento) && dig(e.cliente_documento) === dig(c.cpf_cnpj)) || (!dig(e.cliente_documento) && norm(e.cliente_nome) === norm(c.nome))));
      if (existente) {
        estUsados.add(existente.id);
        rel.operacoes_vinculadas.push(`${c.nome} (${c.tipo})`);
        await passo(async () => {
          await sr.Contrato.update(c.id, { estudo_id: existente.id, migrado_nova_estrutura_em: agora });
          if (!existente.cliente_id && c.cliente_id) await sr.EstudoViabilidade.update(existente.id, { cliente_id: c.cliente_id });
        }, `Operação de ${c.nome}`);
        continue;
      }
      const v = vendDe(c);
      const d = dig(c.cpf_cnpj);
      rel.operacoes_criadas.push(`${c.nome} (${c.tipo} · ${c.status})`);
      await passo(async () => {
        const e = await sr.EstudoViabilidade.create({
          produto, tipo_cliente: d.length === 11 ? 'PF' : 'PJ', cliente_id: c.cliente_id || null, cliente_nome: c.nome, cliente_documento: c.cpf_cnpj || '',
          cliente_email: c.email || '', cliente_telefone: c.telefone || '',
          responsavel_nome: c.vendedor_nome || v?.nome || '', responsavel_email: v?.email || '',
          status: 'concluido', respostas: {}, documentos: [], origem_operacao: 'migracao',
          observacoes_internas: `Operação migrada do contrato ${c.tipo}${c.numero_contrato ? ' nº ' + c.numero_contrato : ''} (criado em ${String(c.created_date || '').slice(0, 10).split('-').reverse().join('/')}). NDA, estudo e análise foram conduzidos antes do novo ambiente.`,
        });
        await sr.Contrato.update(c.id, { estudo_id: e.id, migrado_nova_estrutura_em: agora });
      }, `Operação de ${c.nome}`);
    }

    // 4) Vendas sem contrato vinculado
    const porDoc = new Map<string, any[]>();
    contratosTodos.filter((c: any) => c.status !== 'cancelado').forEach((c: any) => { const d = dig(c.cpf_cnpj); if (d) porDoc.set(d, [...(porDoc.get(d) || []), c]); });
    for (const v of vendas) {
      if (v.contrato_id || v.tipo_venda === 'recorrencia' || !dig(v.cpf_cnpj)) continue;
      if (desde && String(v.data || '') < desde) continue;
      const cand = (porDoc.get(dig(v.cpf_cnpj)) || []).filter((c: any) => norm(c.tipo) === norm(v.produto) && FECHADOS.includes(c.status));
      if (!cand.length) continue;
      // Mais de um contrato: o mais recente criado até a data da venda
      const ate = cand.filter((c: any) => String(c.created_date || '').slice(0, 10) <= String(v.data || '9999'));
      const escolhido = cand.length === 1 ? cand[0] : (ate.sort((a: any, b: any) => String(b.created_date).localeCompare(String(a.created_date)))[0] || null);
      if (!escolhido) { rel.vendas_ambiguas.push(`${v.cliente} · ${v.produto} · ${v.data}`); continue; }
      rel.vendas_vinculadas.push(`${v.cliente} · ${v.produto} · ${v.data}`);
      await passo(() => sr.Venda.update(v.id, { contrato_id: escolhido.id }), `Venda de ${v.cliente}`);
    }

    // Marca os contratos analisados
    if (!simular) {
      for (const c of contratos) if (!c.migrado_nova_estrutura_em) await sr.Contrato.update(c.id, { migrado_nova_estrutura_em: agora }).catch(() => {});
    }

    const resumo = {
      contratos_analisados: rel.contratos_analisados,
      clientes_vinculados: rel.clientes_vinculados.length, clientes_criados: rel.clientes_criados.length,
      negociacoes_vinculadas: rel.negociacoes_vinculadas.length,
      operacoes_vinculadas: rel.operacoes_vinculadas.length, operacoes_criadas: rel.operacoes_criadas.length,
      vendas_vinculadas: rel.vendas_vinculadas.length, vendas_ambiguas: rel.vendas_ambiguas.length, erros: rel.erros.length,
    };
    return Response.json({ ok: true, simular, resumo, detalhes: rel });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
});
