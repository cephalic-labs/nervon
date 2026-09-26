import "server-only";

export class ProviderError extends Error {
  readonly reason: string;
  readonly httpStatus?: number;
  constructor(reason = "INVALID_SHAPE", httpStatus?: number) {
    super("The model provider could not return a valid assessment. Please try again.");
    this.reason = reason;
    this.httpStatus = httpStatus;
  }
}
export class ConfigurationError extends Error {
  constructor() { super("Server model configuration is incomplete. Please contact the demo operator."); }
}
export interface ModelConfig {
  apiKey: string;
  jevModel: string;
  generativeModel: string;
  signingSecret: string;
}
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ModelConfig {
  const apiKey = env.OPENROUTER_API_KEY?.trim();
  const signingSecret = env.ATTEMPT_SIGNING_SECRET;
  if (!apiKey || !signingSecret || Buffer.byteLength(signingSecret.trim(), "utf8") < 32) throw new ConfigurationError();
  return {
    apiKey, signingSecret,
    jevModel: env.OPENROUTER_JEV_MODEL?.trim() || "typesafe/jev-1.13",
    generativeModel: env.OPENROUTER_GENERATIVE_MODEL?.trim() || "deepseek/deepseek-v4.1-flash",
  };
}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ProviderError();
  return value as Record<string, unknown>;
}
export function modelText(value: unknown, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new ProviderError();
  return value.trim();
}
export function usageInfo(value: unknown) {
  if (!value || typeof value !== "object") return {};
  const data = value as Record<string, unknown>;
  return Object.fromEntries(["cost", "prompt_tokens", "completion_tokens", "total_tokens"].flatMap(key =>
    typeof data[key] === "number" && Number.isFinite(data[key]) && data[key] >= 0 ? [[key, data[key]]] : []));
}
export async function postOpenRouter(path: string, body: unknown, config: ModelConfig, timeoutMs: number, fetcher: typeof fetch = fetch): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(`https://openrouter.ai/api${path}`, {
      method: "POST", headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body), signal: controller.signal, cache: "no-store", redirect: "error",
    });
    if (!response.ok) throw new ProviderError("HTTP_ERROR", response.status);
    return record(await response.json());
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError(controller.signal.aborted ? "TIMEOUT" : error instanceof SyntaxError ? "INVALID_JSON" : "NETWORK_ERROR");
  } finally { clearTimeout(timer); }
}
