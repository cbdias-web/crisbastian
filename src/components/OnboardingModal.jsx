import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, BookOpen, FileText, ChevronRight, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const GESTAO_VENDAS_CONTENT = [
  {
    subtitle: 'Etapa 1 – Pré-requisitos antes de registrar',
    items: [
      'Produto cadastrado e ativo em Produtos — sem produto ativo, ele não aparece no formulário.',
      'Vendedor cadastrado em Vendedores com percentual de comissão definido.',
      'Indicadores cadastrados em Indicadores, caso haja espelhamento na venda.',
      'Meta do mês configurada em Metas para que o progresso seja exibido corretamente.',
    ],
  },
  {
    subtitle: 'Etapa 2 – Registro da venda passo a passo',
    steps: [
      'Acesse Vendas > clique em Nova Venda.',
      'Selecione o Produto (apenas ativos aparecem na lista).',
      'Selecione o Vendedor responsável — o percentual de comissão padrão é carregado automaticamente.',
      'Preencha Cliente (nome) e CPF/CNPJ.',
      'Informe o Valor da venda e a Forma de Pagamento.',
      'Adicione Indicadores se houver: clique em + Indicador, selecione e defina o percentual.',
      'Se o total de espelhamento ultrapassar 30%, uma notificação é enviada aos admins para autorização.',
      'Clique em Salvar.',
    ],
  },
  {
    subtitle: 'Etapa 3 – O que acontece automaticamente ao salvar',
    items: [
      'Comissão do vendedor é gerada: valor da venda × percentual definido.',
      'Comissões dos indicadores são geradas proporcionalmente.',
      'Cliente é vinculado ao vendedor (carteira de clientes).',
      'Dashboard e Meta do mês são atualizados automaticamente.',
    ],
  },
  {
    subtitle: 'Implicações e cuidados importantes',
    items: [
      'Excluir uma venda remove TODAS as comissões vinculadas. Use com cuidado.',
      'Editar o valor de uma venda recalcula as comissões automaticamente.',
      'O percentual definido na venda prevalece sobre o percentual padrão do vendedor.',
      'Indicadores acima de 30% requerem autorização do administrador.',
      'Bônus automático é gerado ao atingir 100% da meta, se configurado.',
    ],
  },
];

export default function OnboardingModal({ user, aceite, onComplete }) {
  const [step, setStep] = useState(aceite?.termo_aceito ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const handleScroll = (e) => {
    const el = e.target;
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 40;
    if (atBottom) setScrolledToBottom(true);
  };

  const aceitarTermo = async () => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      if (aceite?.id) {
        await base44.entities.AceiteUsuario.update(aceite.id, {
          termo_aceito: true,
          termo_aceito_em: now,
        });
      } else {
        await base44.entities.AceiteUsuario.create({
          user_id: user.id,
          user_email: user.email,
          user_nome: user.full_name || user.email,
          termo_aceito: true,
          termo_aceito_em: now,
          leitura_gestao_vendas: false,
        });
      }
      setStep(2);
      setScrolledToBottom(false);
    } catch (e) {
      toast.error('Erro ao registrar aceite');
    }
    setLoading(false);
  };

  const confirmarLeitura = async () => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const registros = await base44.entities.AceiteUsuario.filter({ user_id: user.id });
      if (registros.length > 0) {
        await base44.entities.AceiteUsuario.update(registros[0].id, {
          leitura_gestao_vendas: true,
          leitura_gestao_vendas_em: now,
        });
      }
      toast.success('Leitura registrada com sucesso!');
      onComplete();
    } catch (e) {
      toast.error('Erro ao registrar leitura');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0f1e35] to-[#1a3150] px-6 py-5 flex-shrink-0">
          <div className="flex items-center gap-3 mb-2">
            {step === 1 ? (
              <FileText className="w-6 h-6 text-white" />
            ) : (
              <BookOpen className="w-6 h-6 text-white" />
            )}
            <h2 className="text-white font-bold text-lg">
              {step === 1 ? 'Termo de Aceite da Plataforma' : 'Leitura Obrigatória — Gestão de Vendas'}
            </h2>
          </div>
          {/* Steps */}
          <div className="flex items-center gap-2 mt-3">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${step >= 1 ? (step > 1 ? 'bg-green-500 text-white' : 'bg-white text-[#1a3150]') : 'bg-white/20 text-white/60'}`}>
              {step > 1 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>1</span>}
              Termo de Aceite
            </div>
            <ChevronRight className="w-4 h-4 text-white/40" />
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${step === 2 ? 'bg-white text-[#1a3150]' : 'bg-white/20 text-white/60'}`}>
              <span>2</span>
              Gestão de Vendas
            </div>
          </div>
        </div>

        {/* Content */}
        {step === 1 && (
          <>
            <div className="p-6 overflow-y-auto flex-1" onScroll={handleScroll}>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                <p className="text-sm text-amber-800 font-medium">
                  ⚠️ Leia o termo completo até o final para poder aceitar.
                </p>
              </div>
              <h3 className="font-bold text-gray-900 mb-3 text-base">TERMO DE USO — VILLELA EXCHANGE | GESTÃO COMERCIAL</h3>
              <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
                <p>Ao acessar e utilizar a plataforma <strong>Villela Exchange – Gestão Comercial</strong>, você, usuário, concorda expressamente com todos os termos e condições descritos neste documento.</p>
                <p><strong>1. FINALIDADE DA PLATAFORMA</strong><br />
                A plataforma destina-se exclusivamente ao controle interno de vendas, comissões, metas e indicadores da equipe comercial da Villela Exchange. O acesso é restrito aos usuários autorizados pela gestão.</p>
                <p><strong>2. RESPONSABILIDADE DO USUÁRIO</strong><br />
                O usuário é responsável por todas as informações inseridas na plataforma, incluindo vendas, valores e dados de clientes. O uso inadequado ou inserção de dados falsos pode acarretar penalidades conforme política interna da empresa.</p>
                <p><strong>3. CONFIDENCIALIDADE</strong><br />
                Todas as informações acessadas na plataforma são confidenciais. É expressamente proibido compartilhar dados, relatórios ou quaisquer informações obtidas por meio desta ferramenta com terceiros não autorizados.</p>
                <p><strong>4. COMISSÕES E METAS</strong><br />
                Os valores de comissão e bônus exibidos na plataforma têm caráter informativo e estão sujeitos à validação e aprovação pela gestão financeira da Villela Exchange antes de qualquer pagamento.</p>
                <p><strong>5. INDICADORES E ESPELHAMENTOS</strong><br />
                Percentuais de espelhamento acima de 30% por venda requerem aprovação expressa da gestão. O sistema notificará automaticamente os administradores para análise e autorização.</p>
                <p><strong>6. ALTERAÇÕES E EXCLUSÕES</strong><br />
                O usuário deve ter ciência de que a edição ou exclusão de uma venda impacta diretamente as comissões e metas associadas. Tais ações são registradas e auditáveis.</p>
                <p><strong>7. ACESSO E SEGURANÇA</strong><br />
                O usuário compromete-se a manter suas credenciais de acesso em sigilo e a reportar imediatamente qualquer uso não autorizado de sua conta.</p>
                <p><strong>8. ACEITAÇÃO</strong><br />
                Ao clicar em "Li e aceito os termos", o usuário declara ter lido, compreendido e concordado com todas as disposições deste Termo de Uso, bem como com as políticas internas da Villela Exchange relacionadas ao uso desta plataforma.</p>
                <div className="bg-gray-50 rounded-xl p-4 mt-4 border border-gray-200">
                  <p className="text-xs text-gray-500 text-center">
                    Villela Exchange – Gestão Comercial<br />
                    Este aceite é registrado eletronicamente com data, hora e identificação do usuário.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
              {!scrolledToBottom && (
                <p className="text-xs text-gray-400 text-center mb-3 flex items-center justify-center gap-1">
                  Role até o final para habilitar o aceite
                </p>
              )}
              <button
                onClick={aceitarTermo}
                disabled={!scrolledToBottom || loading}
                className="w-full py-3 bg-gradient-to-r from-[#0f1e35] to-[#1a3150] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Li e aceito os termos
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 flex-shrink-0">
              <p className="text-sm text-blue-800">
                <strong>Leitura obrigatória.</strong> Leia atentamente a seção abaixo sobre como registrar vendas corretamente na plataforma. Ao final, confirme a leitura.
              </p>
            </div>
            <div className="p-6 overflow-y-auto flex-1" onScroll={handleScroll}>
              <div className="space-y-6">
                {GESTAO_VENDAS_CONTENT.map((block, i) => (
                  <div key={i}>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                      <ArrowRight className="w-4 h-4 text-[#1a3150] flex-shrink-0" />
                      {block.subtitle}
                    </h4>
                    {block.steps && (
                      <ol className="ml-6 space-y-2">
                        {block.steps.map((step, si) => (
                          <li key={si} className="flex items-start gap-2 text-sm text-gray-600">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#1a3150] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                              {si + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    )}
                    {block.items && (
                      <ul className="ml-6 space-y-2">
                        {block.items.map((item, ii) => (
                          <li key={ii} className="flex items-start gap-2 text-sm text-gray-600">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs text-amber-800 font-medium text-center">
                    Ao confirmar, você declara ter lido e compreendido as regras de registro de vendas da plataforma Villela Exchange.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={confirmarLeitura}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-semibold text-sm hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Li e entendi as regras de Gestão de Vendas
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}