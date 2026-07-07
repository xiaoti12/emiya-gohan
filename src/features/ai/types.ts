export type AiProvider = "anthropic" | "openai-compatible" | "custom";

export type AiSettings = {
  provider: AiProvider;
  apiKey: string;
  model: string;
};
