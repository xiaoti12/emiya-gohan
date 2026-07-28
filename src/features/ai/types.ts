export type AiProvider = "openai-compatible" | "gemini";

export type AiProviderProfile = {
  apiKey: string;
  model: string;
  baseUrl: string;
};

export type AiSettings = {
  provider: AiProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
};

export type RecognizedIngredient = {
  name: string;
  category: "vegetable" | "meat" | "other";
  quantity: number | null;
  unit: string | null;
};

export type LoadModelsResult = {
  models: string[];
};

export type TestConnectionResult = {
  ok: true;
  latencyMs: number;
  model: string;
  preview: string;
};
