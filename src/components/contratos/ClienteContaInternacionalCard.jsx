import { UserCheck } from 'lucide-react';
import ClienteEstudoPicker from '@/components/estudo/ClienteEstudoPicker';
import { AURORA, CardSection, LI, SelectField } from '@/components/contratos/ciFormControls';

const ORIGENS_RECURSOS = [
  'Salário / Trabalho',
  'Empresa própria',
  'Investimentos',
  'Imóveis',
  'Herança / Doação',
  'Venda de bens',
  'Outros',
];

const enderecoCompleto = (c) => {
  const partes = [c.endereco, c.bairro, c.cidade, c.estado].map(p => (p || '').trim()).filter(Boolean);
  return partes.join(', ');
};

/**
 * Identificação e qualificação do cliente no topo do formulário de Conta Internacional.
 * PF grava no titular (secao3_*) e no contato da conta (secao1_*); PJ grava na empresa (secao1_pj_*).
 */
export default function ClienteContaInternacionalCard({ tipoConta, s1, setS1, s3, setS3, setDestinatario, open, onToggle }) {
  const isPJ = tipoConta === 'PJ';

  const nome = isPJ ? s1.secao1_pj_razao_social : s3.secao3_nome;
  const documento = isPJ ? s1.secao1_pj_cnpj : s3.secao3_cpf;
  const email = isPJ ? s1.secao1_email : s3.secao3_email;
  const celular = isPJ ? s1.secao1_celular : s3.secao3_telefone;

  const setNome = (v) => {
    if (isPJ) setS1(f => ({ ...f, secao1_pj_razao_social: v }));
    else setS3(f => ({ ...f, secao3_nome: v }));
    setDestinatario(d => ({ ...d, cliente_nome: v }));
  };

  const setDocumento = (v) => {
    if (isPJ) setS1(f => ({ ...f, secao1_pj_cnpj: v }));
    else setS3(f => ({ ...f, secao3_cpf: v }));
  };

  // PF: e-mail e celular do titular alimentam também o contato da conta (usado no envio do link)
  const setEmail = (v) => {
    if (isPJ) { setS1(f => ({ ...f, secao1_email: v })); return; }
    setS3(f => ({ ...f, secao3_email: v }));
    setS1(f => ({ ...f, secao1_email: v }));
  };

  const setCelular = (v) => {
    if (isPJ) { setS1(f => ({ ...f, secao1_celular: v })); return; }
    setS3(f => ({ ...f, secao3_telefone: v }));
    setS1(f => ({ ...f, secao1_celular: v }));
  };

  const aplicarCliente = (c) => {
    const nomeCliente = c.nome || '';
    const endereco = enderecoCompleto(c);
    if (isPJ) {
      setS1(f => ({
        ...f,
        secao1_pj_razao_social: nomeCliente || f.secao1_pj_razao_social,
        secao1_pj_cnpj: c.cpf_cnpj || f.secao1_pj_cnpj,
        secao1_email: c.email || f.secao1_email,
        secao1_celular: c.telefone || f.secao1_celular,
        secao1_endereco_correspondencia: endereco || f.secao1_endereco_correspondencia,
      }));
    } else {
      setS3(f => ({
        ...f,
        secao3_nome: nomeCliente || f.secao3_nome,
        secao3_cpf: c.cpf_cnpj || f.secao3_cpf,
        secao3_email: c.email || f.secao3_email,
        secao3_telefone: c.telefone || f.secao3_telefone,
        secao3_nascimento: c.nascimento || f.secao3_nascimento,
        secao3_nacionalidade: c.nacionalidade || f.secao3_nacionalidade,
      }));
      setS1(f => ({
        ...f,
        secao1_email: c.email || f.secao1_email,
        secao1_celular: c.telefone || f.secao1_celular,
        secao1_endereco_correspondencia: endereco || f.secao1_endereco_correspondencia,
      }));
    }
    setDestinatario(d => ({ ...d, cliente_nome: nomeCliente }));
  };

  return (
    <CardSection title="Cliente — Identificação e Qualificação" icon={UserCheck} open={open} onToggle={onToggle}
      badge={nome ? nome.split(' ')[0] : 'definir cliente'}>
      <div className="space-y-3">
        <ClienteEstudoPicker onSelecionar={aplicarCliente} />

        <p className="text-xs font-bold pt-1" style={{ color: AURORA.accent }}>Identificação</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <LI label={isPJ ? 'Razão Social *' : 'Nome Completo *'} value={nome} onChange={setNome}
              placeholder={isPJ ? 'Razão social da empresa' : 'Nome completo do titular'} />
          </div>
          <LI label={isPJ ? 'CNPJ / EIN' : 'CPF'} value={documento} onChange={setDocumento} />
          {!isPJ && (
            <LI label="Data de Nascimento" type="date" value={s3.secao3_nascimento} onChange={v => setS3(f => ({ ...f, secao3_nascimento: v }))} />
          )}
          {!isPJ && (
            <LI label="Nacionalidade" value={s3.secao3_nacionalidade} onChange={v => setS3(f => ({ ...f, secao3_nacionalidade: v }))} />
          )}
          {!isPJ && (
            <LI label="Nº do Passaporte" value={s3.secao3_passaporte} onChange={v => setS3(f => ({ ...f, secao3_passaporte: v }))} />
          )}
        </div>

        <p className="text-xs font-bold pt-2" style={{ color: AURORA.accent }}>Contato</p>
        <div className="grid grid-cols-2 gap-3">
          <LI label="E-mail" value={email} onChange={setEmail} />
          <LI label="Celular / WhatsApp" value={celular} onChange={setCelular} />
          <LI label="Telefone Escritório 1" value={s1.secao1_telefone_escritorio1} onChange={v => setS1(f => ({ ...f, secao1_telefone_escritorio1: v }))} />
          <LI label="Telefone Escritório 2" value={s1.secao1_telefone_escritorio2} onChange={v => setS1(f => ({ ...f, secao1_telefone_escritorio2: v }))} />
          <div className="col-span-2">
            <LI label="Endereço para Correspondências (se diferente do legal)" value={s1.secao1_endereco_correspondencia}
              onChange={v => setS1(f => ({ ...f, secao1_endereco_correspondencia: v }))} />
          </div>
        </div>

        {isPJ ? (
          <p className="text-[11px] pt-1" style={{ color: AURORA.textMuted }}>
            Qualificação da empresa (linha de negócios, nº de empregados e receita) na Seção 1.
          </p>
        ) : (
          <>
            <p className="text-xs font-bold pt-2" style={{ color: AURORA.accent }}>Qualificação (PF)</p>
            <div className="grid grid-cols-2 gap-3">
              <LI label="Profissão" value={s3.secao3_profissao} onChange={v => setS3(f => ({ ...f, secao3_profissao: v }))} />
              <SelectField label="Origem dos Recursos" value={s3.secao3_origem_recursos}
                onChange={v => setS3(f => ({ ...f, secao3_origem_recursos: v }))} options={ORIGENS_RECURSOS} />
              <LI label="Renda Anual (USD)" value={s3.secao3_renda_anual_usd} onChange={v => setS3(f => ({ ...f, secao3_renda_anual_usd: v }))} placeholder="Ex: 80000" />
              <LI label="Patrimônio Estimado (USD)" value={s3.secao3_patrimonio_usd} onChange={v => setS3(f => ({ ...f, secao3_patrimonio_usd: v }))} placeholder="Ex: 250000" />
            </div>
          </>
        )}
      </div>
    </CardSection>
  );
}