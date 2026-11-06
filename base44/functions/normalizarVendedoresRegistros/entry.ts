import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { acharVendedor, norm } from '../../shared/vendedorResolver.ts';
import { listAll } from '../../shared/listAll.ts';

// CORREÇÃO ÚNICA (temporária): padroniza o vínculo com o Vendedor nos registros já gravados.
//  - Venda / ParcelaVenda / Comissao com vendedor_id = id de USUÁRIO → passa a apontar para o Vendedor (id + nome canônico)
//  - Venda com vendedor_id válido, mas nome escrito diferente (caixa/acento) → nome canônico
//  - Contrato: só padroniza vendedor_nome (o id do contrato continua sendo o do usuário criador, como o sistema usa hoje)
//  - Conflitos (id aponta para um vendedor e o nome para outro) e usuários sem Vendedor NÃO são alterados: só registrados.
// Args: { dry_run: true } só calcula e grava um resumo. Tudo é auditado em AuditoriaVendas (com o valor anterior).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') return Response.json({ error: 'Acesso negado' }, { status: 403 });
    const body = await req.json().catch(() => ({})) || {};
    const dry = !!body.dry_run;
    const sr = base44.asServiceRole.entities;
    const vendedores = await sr.Vendedor.list('nome', 500);
    const usuarios = await listAll(sr.User, {}, 'email');
    const vPorId = new Map(vendedores.map((v: any) => [v.id, v]));
    const ehCris = (v: any) => /cris/.test(norm(v?.nome));

    // User.id → Vendedor (só quando não é ambíguo e não é o cadastro da gestora)
    const mapa = new Map<string, any>(); const semVinculo: string[] = []; const ignorados: string[] = [];
    for (const u of usuarios) {
      const r = acharVendedor(vendedores, { user: u });
      if (!r.vendedor) { semVinculo.push(`${u.email}`); continue; }
      if (ehCris(r.vendedor) || r.ambiguo) { ignorados.push(`${u.email} → ${r.vendedor.nome}${r.ambiguo ? ' (ambíguo)' : ' (gestora)'}`); continue; }
      mapa.set(u.id, r.vendedor);
    }

    const resumo: any = { dry_run: dry, venda_id_usuario: 0, venda_nome: 0, parcela: 0, comissao: 0, contrato_nome: 0, conflitos: [] as any[], sem_vinculo: semVinculo, ignorados };
    const log = async (entidade: string, id: string, antes: any, motivo: string) => {
      if (dry) return;
      await sr.AuditoriaVendas.create({ acao: 'vendedor_normalizado', entidade, registro_id: id, motivo, dados_originais: antes, executado_em: new Date().toISOString() });
    };

    // ---- Vendas ----
    const vendas = await listAll(sr.Venda, {}, '-created_date');
    for (const v of vendas) {
      const doUsuario = mapa.get(v.vendedor_id);
      if (doUsuario) {
        await log('Venda', v.id, { vendedor_id: v.vendedor_id, assessor_comercial: v.assessor_comercial }, 'vendedor_id era id de usuário');
        if (!dry) await sr.Venda.update(v.id, { vendedor_id: doUsuario.id, assessor_comercial: doUsuario.nome, ...(v.time ? {} : (doUsuario.time ? { time: doUsuario.time } : {})) });
        resumo.venda_id_usuario++; continue;
      }
      const vend = vPorId.get(v.vendedor_id);
      if (vend) {
        if (v.assessor_comercial === vend.nome) continue;
        if (norm(v.assessor_comercial) === norm(vend.nome)) {
          await log('Venda', v.id, { assessor_comercial: v.assessor_comercial }, 'nome fora do padrão (caixa/espaços/acento)');
          if (!dry) await sr.Venda.update(v.id, { assessor_comercial: vend.nome });
          resumo.venda_nome++;
        } else if (v.assessor_comercial) {
          resumo.conflitos.push({ venda_id: v.id, cliente: v.cliente, data: v.data, valor: v.valor, vendedor_id_aponta: vend.nome, nome_na_venda: v.assessor_comercial });
        }
      }
    }
    // ---- Parcelas e comissões com id de usuário ----
    const ids = [...mapa.keys()];
    for (const uid of ids) {
      const dest = mapa.get(uid);
      for (const p of await listAll(sr.ParcelaVenda, { vendedor_id: uid }, '-created_date')) {
        await log('ParcelaVenda', p.id, { vendedor_id: p.vendedor_id, vendedor_nome: p.vendedor_nome }, 'vendedor_id era id de usuário');
        if (!dry) await sr.ParcelaVenda.update(p.id, { vendedor_id: dest.id, vendedor_nome: dest.nome });
        resumo.parcela++;
      }
      for (const c of await listAll(sr.Comissao, { vendedor_id: uid }, '-created_date')) {
        await log('Comissao', c.id, { vendedor_id: c.vendedor_id, vendedor_nome: c.vendedor_nome }, 'vendedor_id era id de usuário');
        if (!dry) await sr.Comissao.update(c.id, { vendedor_id: dest.id, vendedor_nome: dest.nome });
        resumo.comissao++;
      }
    }
    // ---- Contratos: só o nome ----
    for (const ct of await listAll(sr.Contrato, {}, '-created_date')) {
      const dest = mapa.get(ct.vendedor_id) || vPorId.get(ct.vendedor_id);
      if (dest && ct.vendedor_nome !== dest.nome && !ehCris(dest)) {
        await log('Contrato', ct.id, { vendedor_nome: ct.vendedor_nome }, 'nome do vendedor padronizado');
        if (!dry) await sr.Contrato.update(ct.id, { vendedor_nome: dest.nome });
        resumo.contrato_nome++;
      }
    }
    await sr.AuditoriaVendas.create({ acao: dry ? 'resumo_dry_run_vendedores' : 'resumo_vendedores', entidade: 'Venda', registro_id: 'resumo', motivo: 'Resumo da normalização de vendedores', dados_originais: resumo, executado_em: new Date().toISOString() });
    return Response.json({ success: true, ...resumo, conflitos: resumo.conflitos.length });
  } catch (error: any) {
    return Response.json({ error: String(error?.message || error).slice(0, 300) }, { status: 500 });
  }
});
