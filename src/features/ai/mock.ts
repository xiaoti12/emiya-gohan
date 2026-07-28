import type { AiProvider, AiProviderProfile, AiSettings } from "./types";

export const AI_PROVIDER_OPTIONS: ReadonlyArray<{ value: AiProvider; label: string }> = [
  { value: "openai-compatible", label: "OpenAI Compatible" },
  { value: "gemini", label: "Gemini" },
];

export const AI_PROVIDER_DEFAULTS: Record<AiProvider, { baseUrl: string; model: string }> = {
  "openai-compatible": {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-2.0-flash",
  },
};

export function createDefaultProviderProfile(provider: AiProvider): AiProviderProfile {
  return {
    apiKey: "",
    model: AI_PROVIDER_DEFAULTS[provider].model,
    baseUrl: AI_PROVIDER_DEFAULTS[provider].baseUrl,
  };
}

export function createDefaultProviderProfiles(): Record<AiProvider, AiProviderProfile> {
  return {
    "openai-compatible": createDefaultProviderProfile("openai-compatible"),
    gemini: createDefaultProviderProfile("gemini"),
  };
}

export const defaultAiSettings: AiSettings = {
  provider: "openai-compatible",
  ...createDefaultProviderProfile("openai-compatible"),
};
