/** Redact credentials before assertion failures or artifacts are persisted. */
const SECRET_KEY = /(token|secret|password|api[_-]?key|authorization|cookie)/i;

export function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SECRET_KEY.test(key) ? "[REDACTED]" : redactSecrets(item),
    ]),
  );
}
