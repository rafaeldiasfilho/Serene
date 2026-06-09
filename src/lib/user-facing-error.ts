export const LOAD_ERROR_MESSAGE =
  "Não foi possível carregar essas informações agora. Tente atualizar a página. Se continuar, envie um feedback.";

export const SAVE_ERROR_MESSAGE =
  "Não foi possível salvar essa alteração agora. Tente atualizar a página. Se continuar, envie um feedback.";

export const ACTION_ERROR_MESSAGE =
  "Não foi possível concluir essa ação agora. Tente atualizar a página. Se continuar, envie um feedback.";

export function reportTechnicalError(error: unknown, context: string) {
  if (!error || typeof console === "undefined") {
    return;
  }

  console.error(`[SERENE] ${context}`, error);
}

export function userFacingError(
  error: unknown,
  fallback = LOAD_ERROR_MESSAGE,
  context = "Erro técnico preservado para debug.",
) {
  reportTechnicalError(error, context);
  return fallback;
}
