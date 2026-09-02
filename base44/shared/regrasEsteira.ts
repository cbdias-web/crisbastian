// Regras da esteira "Agenda do Dia" (Fila de Contatos), definidas pela gestão:
// - CAP: máximo de 10 leads pendentes por gerente/SDR na esteira;
// - 5 DIAS: lead pendente há mais de 5 dias sem contato é retirado (descartado);
// - REPOSIÇÃO: vagas liberadas são preenchidas no próximo dia, em ordem de
//   chegada (FIFO), até completar 10; lead contatado que volta à fila entra no
//   FINAL da fila de reposição do gerente.
export const CAP_FILA_DIA = 10;
export const DIAS_SEM_CONTATO = 5;