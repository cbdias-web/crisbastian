import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const fmtVal = (v) => v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '____/____/________';
const fill = (v) => v || '______________________________';

function gerarHTMLContaGlobal(d) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Arial',sans-serif;font-size:11px;color:#1a1a1a;padding:28px 36px;line-height:1.5}
    .logo-bar{background:#0f1e35;color:white;padding:14px 20px;border-radius:8px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between}
    .logo-bar h1{font-size:16px;font-weight:700;letter-spacing:1px}
    .logo-bar span{font-size:10px;opacity:.7}
    h2{color:#0f1e35;font-size:13px;font-weight:700;border-bottom:2px solid #0f1e35;padding-bottom:4px;margin:16px 0 8px}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px}
    .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px 16px}
    .field{margin-bottom:6px}
    .label{font-size:9px;color:#666;text-transform:uppercase;font-weight:600;letter-spacing:.5px}
    .value{border-bottom:1px solid #999;padding:2px 0;min-height:18px;font-size:11px;font-weight:500}
    .box{border:1px solid #ddd;border-radius:6px;padding:10px 14px;margin:8px 0;background:#f9f9f9}
    .highlight{background:#0f1e35;color:white;border-radius:6px;padding:10px 16px;margin:8px 0;text-align:center}
    .highlight p{font-size:18px;font-weight:700}
    .highlight span{font-size:10px;opacity:.7}
    .assinaturas{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:30px}
    .assinatura-line{border-top:1px solid #333;padding-top:6px;text-align:center;font-size:10px;color:#555}
    .footer{margin-top:20px;text-align:center;font-size:9px;color:#aaa;border-top:1px solid #eee;padding-top:10px}
    @media print{body{padding:10px}}
  </style></head><body>
  <div class="logo-bar">
    <div>
      <h1>VILLELA EXCHANGE</h1>
      <div style="font-size:10px;opacity:.7">Câmbio & Investimentos</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:13px;font-weight:700">CONTA GLOBAL</div>
      <div style="font-size:10px;opacity:.7">Contrato de Prestação de Serviços</div>
    </div>
  </div>

  <h2>DADOS DO CONTRATANTE</h2>
  <div class="grid2">
    <div class="field"><div class="label">Nome Completo / Razão Social</div><div class="value">${fill(d.nome)}</div></div>
    <div class="field"><div class="label">CPF / CNPJ</div><div class="value">${fill(d.cpf_cnpj)}</div></div>
    <div class="field"><div class="label">Responsável Legal</div><div class="value">${fill(d.responsavel_legal)}</div></div>
    <div class="field"><div class="label">CPF do Responsável Legal</div><div class="value">${fill(d.cpf_responsavel)}</div></div>
    <div class="field"><div class="label">Data de Nascimento</div><div class="value">${fmtDate(d.nascimento)}</div></div>
    <div class="field"><div class="label">Nacionalidade</div><div class="value">${fill(d.nacionalidade)}</div></div>
    <div class="field"><div class="label">Profissão</div><div class="value">${fill(d.profissao)}</div></div>
    <div class="field"><div class="label">Estado Civil</div><div class="value">${fill(d.estado_civil)}</div></div>
    <div class="field"><div class="label">E-mail</div><div class="value">${fill(d.email)}</div></div>
    <div class="field"><div class="label">Telefone / WhatsApp</div><div class="value">${fill(d.telefone)}</div></div>
  </div>

  <h2>ENDEREÇO</h2>
  <div class="grid2">
    <div class="field"><div class="label">Endereço (Rua, Nº, Complemento)</div><div class="value">${fill(d.endereco)}</div></div>
    <div class="field"><div class="label">Bairro</div><div class="value">${fill(d.bairro)}</div></div>
    <div class="field"><div class="label">Cidade</div><div class="value">${fill(d.cidade)}</div></div>
    <div class="field"><div class="label">Estado (UF)</div><div class="value">${fill(d.estado)}</div></div>
    <div class="field"><div class="label">CEP</div><div class="value">${fill(d.cep)}</div></div>
  </div>

  <h2>DADOS FINANCEIROS</h2>
  <div class="highlight">
    <span>Valor Total do Contrato</span>
    <p>${fmtVal(d.valor_total)}</p>
  </div>
  <div class="grid3">
    <div class="field"><div class="label">Valor de Adesão / Entrada</div><div class="value">${fmtVal(d.valor_adesao)}</div></div>
    <div class="field"><div class="label">Valor da Parcela</div><div class="value">${fmtVal(d.valor_parcela)}</div></div>
    <div class="field"><div class="label">Número de Parcelas</div><div class="value">${fill(d.num_parcelas)}</div></div>
    <div class="field"><div class="label">Forma de Pagamento</div><div class="value">${fill(d.forma_pagamento)}</div></div>
    <div class="field"><div class="label">Data 1º Pagamento</div><div class="value">${fmtDate(d.data_primeiro_pagamento)}</div></div>
    <div class="field"><div class="label">Dia de Vencimento</div><div class="value">${fill(d.dia_vencimento)}</div></div>
    <div class="field"><div class="label">Moeda</div><div class="value">${fill(d.moeda) || 'USD'}</div></div>
    <div class="field"><div class="label">Cotação</div><div class="value">${d.cotacao ? 'R$ ' + Number(d.cotacao).toFixed(4) : '________________'}</div></div>
    <div class="field"><div class="label">Valor em Moeda Estrangeira</div><div class="value">${d.valor_em_moeda ? Number(d.valor_em_moeda).toLocaleString('en-US', {style:'currency',currency:'USD'}) : '________________'}</div></div>
    <div class="field"><div class="label">Prazo (meses)</div><div class="value">${fill(d.prazo_meses)}</div></div>
    <div class="field"><div class="label">Banco</div><div class="value">${fill(d.banco)}</div></div>
    <div class="field"><div class="label">Agência / Conta</div><div class="value">${fill(d.agencia)} / ${fill(d.conta)}</div></div>
  </div>

  ${d.observacoes ? `<div class="box"><div class="label">Observações</div><p style="margin-top:4px">${d.observacoes}</p></div>` : ''}

  <h2>CLÁUSULAS</h2>
  <div class="box" style="font-size:10px;color:#444">
    <p><strong>1.</strong> O presente contrato tem por objeto a prestação dos serviços de câmbio e gestão de conta global conforme especificações acordadas entre as partes.</p>
    <p style="margin-top:6px"><strong>2.</strong> O CONTRATANTE declara estar ciente das condições de mercado, variação cambial e riscos inerentes ao produto contratado.</p>
    <p style="margin-top:6px"><strong>3.</strong> Os valores estão sujeitos à variação cambial conforme cotação do dia do efetivo pagamento.</p>
    <p style="margin-top:6px"><strong>4.</strong> Em caso de inadimplência, incidirão multa de 2% e juros de mora de 1% ao mês sobre o valor em atraso.</p>
    <p style="margin-top:6px"><strong>5.</strong> O CONTRATANTE autoriza a Villela Exchange a processar os dados pessoais fornecidos para fins exclusivos de execução deste contrato, conforme LGPD (Lei 13.709/2018).</p>
    <p style="margin-top:6px"><strong>6.</strong> Fica eleito o foro da comarca de [Cidade] para dirimir quaisquer conflitos oriundos deste instrumento.</p>
  </div>

  <p style="margin-top:10px;font-size:10px">Data do Contrato: ${fmtDate(d.data_contrato || new Date().toISOString().split('T')[0])}</p>

  <div class="assinaturas">
    <div class="assinatura-line">Villela Exchange<br>Responsável pela Empresa</div>
    <div class="assinatura-line">${fill(d.nome)}<br>Contratante / Responsável Legal</div>
  </div>
  <div class="footer">Villela Exchange Câmbio & Investimentos · Todos os direitos reservados · Contrato gerado em ${new Date().toLocaleDateString('pt-BR')}</div>
  </body></html>`;
}

function gerarHTMLContaInternacional(d) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Arial',sans-serif;font-size:11px;color:#1a1a1a;padding:28px 36px;line-height:1.5}
    .logo-bar{background:#1a3a6b;color:white;padding:14px 20px;border-radius:8px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between}
    .logo-bar h1{font-size:16px;font-weight:700;letter-spacing:1px}
    h2{color:#1a3a6b;font-size:13px;font-weight:700;border-bottom:2px solid #1a3a6b;padding-bottom:4px;margin:16px 0 8px}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px}
    .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px 16px}
    .field{margin-bottom:6px}
    .label{font-size:9px;color:#666;text-transform:uppercase;font-weight:600;letter-spacing:.5px}
    .value{border-bottom:1px solid #999;padding:2px 0;min-height:18px;font-size:11px;font-weight:500}
    .box{border:1px solid #ddd;border-radius:6px;padding:10px 14px;margin:8px 0;background:#f0f4ff}
    .highlight{background:#1a3a6b;color:white;border-radius:6px;padding:10px 16px;margin:8px 0;text-align:center}
    .highlight p{font-size:18px;font-weight:700}
    .assinaturas{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:30px}
    .assinatura-line{border-top:1px solid #333;padding-top:6px;text-align:center;font-size:10px;color:#555}
    .footer{margin-top:20px;text-align:center;font-size:9px;color:#aaa;border-top:1px solid #eee;padding-top:10px}
  </style></head><body>
  <div class="logo-bar">
    <div><h1>VILLELA EXCHANGE</h1><div style="font-size:10px;opacity:.7">Câmbio & Investimentos</div></div>
    <div style="text-align:right"><div style="font-size:13px;font-weight:700">CONTA INTERNACIONAL</div><div style="font-size:10px;opacity:.7">Contrato de Abertura de Conta</div></div>
  </div>

  <h2>DADOS DO TITULAR</h2>
  <div class="grid2">
    <div class="field"><div class="label">Nome Completo / Razão Social</div><div class="value">${fill(d.nome)}</div></div>
    <div class="field"><div class="label">CPF / CNPJ</div><div class="value">${fill(d.cpf_cnpj)}</div></div>
    <div class="field"><div class="label">Responsável Legal</div><div class="value">${fill(d.responsavel_legal)}</div></div>
    <div class="field"><div class="label">CPF do Responsável Legal</div><div class="value">${fill(d.cpf_responsavel)}</div></div>
    <div class="field"><div class="label">Data de Nascimento</div><div class="value">${fmtDate(d.nascimento)}</div></div>
    <div class="field"><div class="label">Nacionalidade</div><div class="value">${fill(d.nacionalidade)}</div></div>
    <div class="field"><div class="label">Profissão</div><div class="value">${fill(d.profissao)}</div></div>
    <div class="field"><div class="label">Estado Civil</div><div class="value">${fill(d.estado_civil)}</div></div>
    <div class="field"><div class="label">E-mail</div><div class="value">${fill(d.email)}</div></div>
    <div class="field"><div class="label">Telefone / WhatsApp</div><div class="value">${fill(d.telefone)}</div></div>
  </div>

  <h2>ENDEREÇO</h2>
  <div class="grid2">
    <div class="field"><div class="label">Endereço (Rua, Nº, Complemento)</div><div class="value">${fill(d.endereco)}</div></div>
    <div class="field"><div class="label">Bairro</div><div class="value">${fill(d.bairro)}</div></div>
    <div class="field"><div class="label">Cidade</div><div class="value">${fill(d.cidade)}</div></div>
    <div class="field"><div class="label">Estado (UF)</div><div class="value">${fill(d.estado)}</div></div>
    <div class="field"><div class="label">CEP</div><div class="value">${fill(d.cep)}</div></div>
  </div>

  <h2>CONDIÇÕES FINANCEIRAS DA CONTA</h2>
  <div class="highlight">
    <span>Valor Total do Contrato</span>
    <p>${fmtVal(d.valor_total)}</p>
  </div>
  <div class="grid3">
    <div class="field"><div class="label">Taxa de Abertura / Adesão</div><div class="value">${fmtVal(d.valor_adesao)}</div></div>
    <div class="field"><div class="label">Mensalidade / Parcela</div><div class="value">${fmtVal(d.valor_parcela)}</div></div>
    <div class="field"><div class="label">Número de Parcelas</div><div class="value">${fill(d.num_parcelas)}</div></div>
    <div class="field"><div class="label">Forma de Pagamento</div><div class="value">${fill(d.forma_pagamento)}</div></div>
    <div class="field"><div class="label">Data 1º Pagamento</div><div class="value">${fmtDate(d.data_primeiro_pagamento)}</div></div>
    <div class="field"><div class="label">Dia de Vencimento</div><div class="value">${fill(d.dia_vencimento)}</div></div>
    <div class="field"><div class="label">Moeda Principal</div><div class="value">${fill(d.moeda) || 'USD'}</div></div>
    <div class="field"><div class="label">Limite da Conta (USD)</div><div class="value">${d.valor_em_moeda ? Number(d.valor_em_moeda).toLocaleString('en-US',{style:'currency',currency:'USD'}) : '________________'}</div></div>
    <div class="field"><div class="label">Prazo (meses)</div><div class="value">${fill(d.prazo_meses)}</div></div>
    <div class="field"><div class="label">Banco</div><div class="value">${fill(d.banco)}</div></div>
    <div class="field"><div class="label">Agência</div><div class="value">${fill(d.agencia)}</div></div>
    <div class="field"><div class="label">Conta</div><div class="value">${fill(d.conta)}</div></div>
  </div>

  ${d.observacoes ? `<div class="box"><div class="label">Observações</div><p style="margin-top:4px">${d.observacoes}</p></div>` : ''}

  <h2>DECLARAÇÕES E AUTORIZAÇÕES</h2>
  <div class="box" style="font-size:10px;color:#444">
    <p><strong>1.</strong> O TITULAR declara que as informações fornecidas são verdadeiras e se responsabiliza por qualquer inexatidão.</p>
    <p style="margin-top:6px"><strong>2.</strong> O TITULAR está ciente que a Conta Internacional permite transações em moeda estrangeira sujeitas às regulamentações do Banco Central do Brasil.</p>
    <p style="margin-top:6px"><strong>3.</strong> Os valores em moeda estrangeira estão sujeitos à variação cambial, não cabendo qualquer responsabilidade à Villela Exchange por oscilações de mercado.</p>
    <p style="margin-top:6px"><strong>4.</strong> O TITULAR autoriza a Villela Exchange a compartilhar informações com instituições financeiras parceiras para fins de abertura e manutenção da conta.</p>
    <p style="margin-top:6px"><strong>5.</strong> O TITULAR autoriza o tratamento de seus dados conforme a LGPD (Lei 13.709/2018).</p>
  </div>

  <p style="margin-top:10px;font-size:10px">Data do Contrato: ${fmtDate(d.data_contrato || new Date().toISOString().split('T')[0])}</p>
  <div class="assinaturas">
    <div class="assinatura-line">Villela Exchange<br>Responsável pela Empresa</div>
    <div class="assinatura-line">${fill(d.nome)}<br>Titular / Responsável Legal</div>
  </div>
  <div class="footer">Villela Exchange Câmbio & Investimentos · Todos os direitos reservados · Contrato gerado em ${new Date().toLocaleDateString('pt-BR')}</div>
  </body></html>`;
}

function gerarHTMLDolarizeAqui(d) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Arial',sans-serif;font-size:11px;color:#1a1a1a;padding:28px 36px;line-height:1.5}
    .logo-bar{background:#b45309;color:white;padding:14px 20px;border-radius:8px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between}
    .logo-bar h1{font-size:16px;font-weight:700;letter-spacing:1px}
    h2{color:#b45309;font-size:13px;font-weight:700;border-bottom:2px solid #b45309;padding-bottom:4px;margin:16px 0 8px}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px}
    .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px 16px}
    .field{margin-bottom:6px}
    .label{font-size:9px;color:#666;text-transform:uppercase;font-weight:600;letter-spacing:.5px}
    .value{border-bottom:1px solid #999;padding:2px 0;min-height:18px;font-size:11px;font-weight:500}
    .box{border:1px solid #ddd;border-radius:6px;padding:10px 14px;margin:8px 0;background:#fffbf0}
    .highlight{background:#b45309;color:white;border-radius:6px;padding:10px 16px;margin:8px 0;text-align:center}
    .highlight p{font-size:18px;font-weight:700}
    .highlight span{font-size:10px;opacity:.8}
    .dolar-box{border:2px solid #b45309;border-radius:8px;padding:12px;margin:10px 0;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center}
    .dolar-item p{font-size:15px;font-weight:700;color:#b45309}
    .dolar-item span{font-size:9px;color:#888}
    .assinaturas{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:30px}
    .assinatura-line{border-top:1px solid #333;padding-top:6px;text-align:center;font-size:10px;color:#555}
    .footer{margin-top:20px;text-align:center;font-size:9px;color:#aaa;border-top:1px solid #eee;padding-top:10px}
  </style></head><body>
  <div class="logo-bar">
    <div><h1>VILLELA EXCHANGE</h1><div style="font-size:10px;opacity:.7">Câmbio & Investimentos</div></div>
    <div style="text-align:right"><div style="font-size:13px;font-weight:700">DOLARIZE AQUI</div><div style="font-size:10px;opacity:.8">Contrato de Dolarização de Ativos</div></div>
  </div>

  <h2>DADOS DO INVESTIDOR</h2>
  <div class="grid2">
    <div class="field"><div class="label">Nome Completo / Razão Social</div><div class="value">${fill(d.nome)}</div></div>
    <div class="field"><div class="label">CPF / CNPJ</div><div class="value">${fill(d.cpf_cnpj)}</div></div>
    <div class="field"><div class="label">Responsável Legal</div><div class="value">${fill(d.responsavel_legal)}</div></div>
    <div class="field"><div class="label">CPF do Responsável Legal</div><div class="value">${fill(d.cpf_responsavel)}</div></div>
    <div class="field"><div class="label">Data de Nascimento</div><div class="value">${fmtDate(d.nascimento)}</div></div>
    <div class="field"><div class="label">Nacionalidade</div><div class="value">${fill(d.nacionalidade)}</div></div>
    <div class="field"><div class="label">Profissão</div><div class="value">${fill(d.profissao)}</div></div>
    <div class="field"><div class="label">Estado Civil</div><div class="value">${fill(d.estado_civil)}</div></div>
    <div class="field"><div class="label">E-mail</div><div class="value">${fill(d.email)}</div></div>
    <div class="field"><div class="label">Telefone / WhatsApp</div><div class="value">${fill(d.telefone)}</div></div>
  </div>

  <h2>ENDEREÇO</h2>
  <div class="grid2">
    <div class="field"><div class="label">Endereço (Rua, Nº, Complemento)</div><div class="value">${fill(d.endereco)}</div></div>
    <div class="field"><div class="label">Bairro</div><div class="value">${fill(d.bairro)}</div></div>
    <div class="field"><div class="label">Cidade</div><div class="value">${fill(d.cidade)}</div></div>
    <div class="field"><div class="label">Estado (UF)</div><div class="value">${fill(d.estado)}</div></div>
    <div class="field"><div class="label">CEP</div><div class="value">${fill(d.cep)}</div></div>
  </div>

  <h2>OPERAÇÃO DE DOLARIZAÇÃO</h2>
  <div class="dolar-box">
    <div class="dolar-item"><span>Valor Aplicado (BRL)</span><p>${fmtVal(d.valor_total)}</p></div>
    <div class="dolar-item"><span>Cotação (R$/USD)</span><p>${d.cotacao ? 'R$ ' + Number(d.cotacao).toFixed(4) : '________'}</p></div>
    <div class="dolar-item"><span>Valor em Dólar (USD)</span><p>${d.valor_em_moeda ? '$ ' + Number(d.valor_em_moeda).toLocaleString('en-US', {minimumFractionDigits:2}) : '________'}</p></div>
  </div>
  <div class="grid3">
    <div class="field"><div class="label">Valor de Adesão / Entrada</div><div class="value">${fmtVal(d.valor_adesao)}</div></div>
    <div class="field"><div class="label">Valor da Parcela Mensal</div><div class="value">${fmtVal(d.valor_parcela)}</div></div>
    <div class="field"><div class="label">Número de Parcelas</div><div class="value">${fill(d.num_parcelas)}</div></div>
    <div class="field"><div class="label">Forma de Pagamento</div><div class="value">${fill(d.forma_pagamento)}</div></div>
    <div class="field"><div class="label">Data 1º Pagamento</div><div class="value">${fmtDate(d.data_primeiro_pagamento)}</div></div>
    <div class="field"><div class="label">Dia de Vencimento</div><div class="value">${fill(d.dia_vencimento)}</div></div>
    <div class="field"><div class="label">Prazo (meses)</div><div class="value">${fill(d.prazo_meses)}</div></div>
    <div class="field"><div class="label">Banco</div><div class="value">${fill(d.banco)}</div></div>
    <div class="field"><div class="label">Agência / Conta</div><div class="value">${fill(d.agencia)} / ${fill(d.conta)}</div></div>
  </div>

  ${d.observacoes ? `<div class="box"><div class="label">Observações</div><p style="margin-top:4px">${d.observacoes}</p></div>` : ''}

  <h2>TERMOS E CONDIÇÕES</h2>
  <div class="box" style="font-size:10px;color:#444">
    <p><strong>1.</strong> O presente contrato tem por objeto a dolarização de ativos do INVESTIDOR conforme valores e condições estabelecidos acima.</p>
    <p style="margin-top:6px"><strong>2.</strong> A cotação base para conversão é a do dia útil anterior à confirmação do pagamento, podendo variar conforme condições de mercado.</p>
    <p style="margin-top:6px"><strong>3.</strong> O INVESTIDOR declara ciência dos riscos de mercado, câmbio e variações do dólar americano.</p>
    <p style="margin-top:6px"><strong>4.</strong> A Villela Exchange não garante rentabilidade futura, sendo este produto de natureza especulativa.</p>
    <p style="margin-top:6px"><strong>5.</strong> Em caso de resgate antecipado, poderá incidir taxa de saída conforme tabela vigente.</p>
    <p style="margin-top:6px"><strong>6.</strong> O INVESTIDOR autoriza o tratamento de seus dados conforme a LGPD (Lei 13.709/2018).</p>
  </div>

  <p style="margin-top:10px;font-size:10px">Data do Contrato: ${fmtDate(d.data_contrato || new Date().toISOString().split('T')[0])}</p>
  <div class="assinaturas">
    <div class="assinatura-line">Villela Exchange<br>Responsável pela Empresa</div>
    <div class="assinatura-line">${fill(d.nome)}<br>Investidor / Responsável Legal</div>
  </div>
  <div class="footer">Villela Exchange Câmbio & Investimentos · Todos os direitos reservados · Contrato gerado em ${new Date().toLocaleDateString('pt-BR')}</div>
  </body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { contrato_id } = await req.json();
    const contrato = await base44.entities.Contrato.get(contrato_id);
    if (!contrato) return Response.json({ error: 'Contrato não encontrado' }, { status: 404 });

    let html = '';
    if (contrato.tipo === 'CONTA GLOBAL') html = gerarHTMLContaGlobal(contrato);
    else if (contrato.tipo === 'CONTA INTERNACIONAL') html = gerarHTMLContaInternacional(contrato);
    else if (contrato.tipo === 'DOLARIZE AQUI') html = gerarHTMLDolarizeAqui(contrato);
    else return Response.json({ error: 'Tipo de contrato inválido' }, { status: 400 });

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});