import { storageKeys } from "../../lib/storageKeys";
import {
  AI_PROVIDER_DEFAULTS,
  createDefaultProviderProfile,
  createDefaultProviderProfiles,
  defaultAiSettings,
} from "./mock";
import type { AiProvider, AiProviderProfile, AiSettings } from "./types";

function isAiProvider(value: string | null): value is AiProvider {
  return value === "openai-compatible" || value === "gemini";
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function normalizeProfile(provider: AiProvider, value: Partial<AiProviderProfile> | null | undefined): AiProviderProfile {
  const defaults = createDefaultProviderProfile(provider);
  return {
    apiKey: typeof value?.apiKey === "string" ? value.apiKey : defaults.apiKey,
    model: typeof value?.model === "string" && value.model.trim() ? value.model.trim() : defaults.model,
    baseUrl: normalizeBaseUrl(
      typeof value?.baseUrl === "string" && value.baseUrl.trim() ? value.baseUrl : defaults.baseUrl,
    ),
  };
}

function readLegacyActiveProfile(provider: AiProvider): AiProviderProfile | null {
  const apiKey = localStorage.getItem(storageKeys.aiApiKey);
  const model = localStorage.getItem(storageKeys.aiModel);
  const baseUrl = localStorage.getItem(storageKeys.aiBaseUrl);
  if (apiKey === null && model === null && baseUrl === null) {
    return null;
  }

  return normalizeProfile(provider, {
    apiKey: apiKey ?? "",
    model: model ?? "",
    baseUrl: baseUrl ?? "",
  });
}

export function loadProviderProfiles(): Record<AiProvider, AiProviderProfile> {
  const profiles = createDefaultProviderProfiles();
  const storedProvider = localStorage.getItem(storageKeys.aiProvider);
  const activeProvider = isAiProvider(storedProvider) ? storedProvider : defaultAiSettings.provider;

  try {
    const raw = localStorage.getItem(storageKeys.aiProfiles);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Record<AiProvider, Partial<AiProviderProfile>>>;
      profiles["openai-compatible"] = normalizeProfile(
        "openai-compatible",
        parsed["openai-compatible"],
      );
      profiles.gemini = normalizeProfile("gemini", parsed.gemini);
      return profiles;
    }
  } catch {
    // fall through to legacy migration
  }

  const legacy = readLegacyActiveProfile(activeProvider);
  if (legacy) {
    profiles[activeProvider] = legacy;
  }

  return profiles;
}

export function loadAiSettings(): AiSettings {
  const storedProvider = localStorage.getItem(storageKeys.aiProvider);
  const provider = isAiProvider(storedProvider) ? storedProvider : defaultAiSettings.provider;
  const profile = loadProviderProfiles()[provider];

  return {
    provider,
    apiKey: profile.apiKey,
    model: profile.model,
    baseUrl: profile.baseUrl,
  };
}

export function saveProviderProfiles(
  provider: AiProvider,
  profiles: Record<AiProvider, AiProviderProfile>,
) {
  const normalized: Record<AiProvider, AiProviderProfile> = {
    "openai-compatible": normalizeProfile("openai-compatible", profiles["openai-compatible"]),
    gemini: normalizeProfile("gemini", profiles.gemini),
  };
  const active = normalized[provider];

  localStorage.setItem(storageKeys.aiProvider, provider);
  localStorage.setItem(storageKeys.aiProfiles, JSON.stringify(normalized));
  // 同步活跃配置的扁平 key，兼容旧读取路径
  localStorage.setItem(storageKeys.aiApiKey, active.apiKey);
  localStorage.setItem(storageKeys.aiModel, active.model);
  localStorage.setItem(storageKeys.aiBaseUrl, active.baseUrl);
}

export function saveAiSettings(settings: AiSettings) {
  const profiles = loadProviderProfiles();
  profiles[settings.provider] = normalizeProfile(settings.provider, {
    apiKey: settings.apiKey,
    model: settings.model,
    baseUrl: settings.baseUrl,
  });
  saveProviderProfiles(settings.provider, profiles);
}

export function hasAiApiKey() {
  return Boolean(loadAiSettings().apiKey.trim());
}

export function getPrimaryCallUrl(settings: Pick<AiSettings, "provider" | "baseUrl" | "model">) {
  const baseUrl = normalizeBaseUrl(settings.baseUrl);
  if (!baseUrl) return "";

  if (settings.provider === "gemini") {
    const model = settings.model.trim() || AI_PROVIDER_DEFAULTS.gemini.model;
    return `${baseUrl}/models/${encodeURIComponent(model)}:generateContent`;
  }

  return `${baseUrl}/chat/completions`;
}

export function createProviderDefaults(provider: AiProvider): Pick<AiSettings, "provider" | "baseUrl" | "model"> {
  return {
    provider,
    baseUrl: AI_PROVIDER_DEFAULTS[provider].baseUrl,
    model: AI_PROVIDER_DEFAULTS[provider].model,
  };
}
