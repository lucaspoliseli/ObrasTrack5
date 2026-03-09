// Utilitários de datas compartilhados no frontend

// Converte uma data qualquer para yyyy-mm-dd ou string vazia em caso de erro
export function toDateOnly(iso) {
  if (!iso) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Calcula diferença em dias entre duas datas (strings aceitas pelo Date),
// retornando string com o número de dias ou "" em caso de inválido
export function diffDias(ini, fim) {
  if (!ini || !fim) return "";
  const a = new Date(ini);
  const b = new Date(fim);
  if (isNaN(a) || isNaN(b) || b < a) return "";
  const MS = 1000 * 60 * 60 * 24;
  return String(Math.ceil((b - a) / MS));
}

// Valida se dataFinal >= dataInicio para strings no formato yyyy-mm-dd
// Mantém exatamente o mesmo contrato usado em CadastroObra
export function validateIsoDateRange(dataInicioStr, dataFinalStr) {
  if (!dataInicioStr || !dataFinalStr) {
    return { valido: false, mensagem: "Preencha ambas as datas." };
  }

  // Comparar strings diretamente (formato YYYY-MM-DD) para evitar timezone
  if (dataFinalStr < dataInicioStr) {
    return {
      valido: false,
      mensagem: "A data final não pode ser anterior à data de início.",
    };
  }

  return { valido: true, mensagem: "" };
}

