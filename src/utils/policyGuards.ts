const toErrorText = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error ?? "Unknown error");
};

export const normalizePolicyGuardError = (
  error: unknown,
  fallbackPrefix = "Operation failed",
): string => {
  const raw = toErrorText(error);
  const normalized = raw.toLowerCase();

  if (
    normalized.includes("cannot change document branch after evaluation has started") ||
    (normalized.includes("branch") && normalized.includes("evaluation") && normalized.includes("started"))
  ) {
    return "Section 300 policy: cannot change document branch after evaluation has started.";
  }

  if (
    (normalized.includes("answer key") || normalized.includes("answer_key")) &&
    normalized.includes("300")
  ) {
    return "Section 300 policy: answer keys are not allowed for this flow.";
  }

  if (
    (normalized.includes("reference") || normalized.includes("references")) &&
    normalized.includes("300")
  ) {
    return "Section 300 policy: references are not allowed for this flow.";
  }

  return `${fallbackPrefix}: ${raw}`;
};
