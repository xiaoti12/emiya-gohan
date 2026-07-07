import { storageKeys } from "../../lib/storageKeys";
import { defaultAiSettings } from "./mock";
import type { AiProvider, AiSettings } from "./types";

export function loadAiSettings(): AiSettings {
  return {
    provider: (localStorage.getItem(storageKeys.aiProvider) as AiProvider | null) ?? defaultAiSettings.provider,
    apiKey: localStorage.getItem(storageKeys.aiApiKey) ?? defaultAiSettings.apiKey,
    model: localStorage.getItem(storageKeys.aiModel) ?? defaultAiSettings.model,
  };
}

export function saveAiSettings(settings: AiSettings) {
  localStorage.setItem(storageKeys.aiProvider, settings.provider);
  localStorage.setItem(storageKeys.aiApiKey, settings.apiKey);
  localStorage.setItem(storageKeys.aiModel, settings.model);
}

export function hasAiApiKey() {
  return Boolean(localStorage.getItem(storageKeys.aiApiKey));
}
