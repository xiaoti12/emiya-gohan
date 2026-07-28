import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/AppShell";
import { PaperCard } from "../components/PaperCard";
import { Toast } from "../components/Toast";
import { TopBar } from "../components/TopBar";
import {
  AI_PROVIDER_OPTIONS,
  getPrimaryCallUrl,
  loadAiSettings,
  loadModels,
  loadProviderProfiles,
  saveProviderProfiles,
  testConnection,
} from "../features/ai/api";
import type { AiProvider, AiProviderProfile } from "../features/ai/types";
import { getErrorMessage } from "../lib/errors";
import styles from "./AiSettingsPage.module.css";

export function AiSettingsPage() {
  const initial = loadAiSettings();
  const initialProfiles = loadProviderProfiles();

  const [provider, setProvider] = useState<AiProvider>(initial.provider);
  const [profiles, setProfiles] = useState(initialProfiles);
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [model, setModel] = useState(initial.model);
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");
  const [toast, setToast] = useState("");

  const currentProfile = useMemo<AiProviderProfile>(
    () => ({
      apiKey,
      model,
      baseUrl,
    }),
    [apiKey, model, baseUrl],
  );

  const draftSettings = useMemo(
    () => ({
      provider,
      ...currentProfile,
    }),
    [provider, currentProfile],
  );

  const primaryCallUrl = useMemo(
    () => getPrimaryCallUrl({ provider, baseUrl, model }),
    [provider, baseUrl, model],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function buildProfilesWithCurrent(nextProvider = provider, profile = currentProfile) {
    return {
      ...profiles,
      [nextProvider]: profile,
    };
  }

  function applyProfile(nextProvider: AiProvider, profile: AiProviderProfile) {
    setProvider(nextProvider);
    setBaseUrl(profile.baseUrl);
    setModel(profile.model);
    setApiKey(profile.apiKey);
  }

  function handleProviderChange(nextProvider: AiProvider) {
    if (nextProvider === provider) return;
    const nextProfiles = buildProfilesWithCurrent(provider, currentProfile);
    setProfiles(nextProfiles);
    applyProfile(nextProvider, nextProfiles[nextProvider]);
    setModelOptions([]);
    setTestResult("");
  }

  function persistDraft() {
    const nextProfiles = buildProfilesWithCurrent(provider, currentProfile);
    setProfiles(nextProfiles);
    saveProviderProfiles(provider, nextProfiles);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!apiKey.trim()) {
      setToast("请填写 API Key");
      return;
    }
    if (!baseUrl.trim()) {
      setToast("请填写 Base URL");
      return;
    }
    if (!model.trim()) {
      setToast("请填写模型名称");
      return;
    }
    persistDraft();
    setToast("AI 设置已保存在本机浏览器");
  }

  async function handleLoadModels() {
    if (loadingModels) return;
    setLoadingModels(true);
    setTestResult("");
    try {
      persistDraft();
      const result = await loadModels(draftSettings);
      setModelOptions(result.models);
      if (result.models.length === 0) {
        setToast("未拉到模型列表，可继续手输模型名");
      } else {
        setToast(`已加载 ${result.models.length} 个模型`);
        if (!result.models.includes(model.trim()) && result.models[0]) {
          setModel(result.models[0]);
        }
      }
    } catch (error) {
      setToast(getErrorMessage(error));
    } finally {
      setLoadingModels(false);
    }
  }

  async function handleTestConnection() {
    if (testing) return;
    setTesting(true);
    setTestResult("");
    try {
      persistDraft();
      const result = await testConnection(draftSettings);
      setTestResult(`连通成功 · ${result.latencyMs}ms · ${result.model} · ${result.preview}`);
      setToast("连通性测试通过");
    } catch (error) {
      setTestResult(getErrorMessage(error));
      setToast(getErrorMessage(error));
    } finally {
      setTesting(false);
    }
  }

  return (
    <AppShell overlaySlot={<Toast message={toast} />}>
      <TopBar title="AI 设置" subtitle="配置模型供应商与密钥，图片识别会从本机读取。" />
      <PaperCard className={styles.noticeCard} tone="warm">
        <h2>本机保存提示</h2>
        <p>
          API Key 只写入当前浏览器 localStorage，不会提交到后端。浏览器直连模型需要 Base URL
          支持跨域（CORS）；官方域名常被拦截，可改用可跨域的中转地址。请不要在公用设备上保存长期有效的密钥。
        </p>
      </PaperCard>
      <PaperCard className={styles.settingsCard} tone="white">
        <h2>模型配置</h2>
        <form onSubmit={submit}>
          <div className={styles.field}>
            <label htmlFor="provider">供应商</label>
            <select
              id="provider"
              value={provider}
              onChange={(event) => handleProviderChange(event.target.value as AiProvider)}
            >
              {AI_PROVIDER_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="baseUrl">Base URL</label>
            <input
              id="baseUrl"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="例如：https://api.openai.com/v1"
              autoComplete="off"
            />
            {primaryCallUrl ? (
              <p className={styles.urlPreview} aria-live="polite">
                {primaryCallUrl}
              </p>
            ) : null}
          </div>
          <div className={styles.field}>
            <label htmlFor="model">模型</label>
            <div className={styles.modelRow}>
              <input
                id="model"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder="例如：gpt-4o-mini"
                list="ai-model-options"
                autoComplete="off"
              />
              <button
                className={styles.loadModelButton}
                type="button"
                onClick={() => void handleLoadModels()}
                disabled={loadingModels}
              >
                {loadingModels ? "加载中…" : "加载模型"}
              </button>
            </div>
            <datalist id="ai-model-options">
              {modelOptions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            {modelOptions.length > 0 ? (
              <select
                className={styles.modelSelect}
                aria-label="从已加载模型中选择"
                value={modelOptions.includes(model) ? model : ""}
                onChange={(event) => {
                  if (event.target.value) setModel(event.target.value);
                }}
              >
                <option value="">从列表选择模型</option>
                {modelOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          <div className={styles.field}>
            <label htmlFor="apiKey">API Key</label>
            <input
              id="apiKey"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="只保存在本机"
              type="password"
              autoComplete="off"
            />
          </div>
          {testResult ? (
            <p className={styles.testResult} role="status">
              {testResult}
            </p>
          ) : null}
          <div className={styles.actionRow}>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() => void handleTestConnection()}
              disabled={testing}
            >
              {testing ? "测试中…" : "测试连通性"}
            </button>
            <button className={styles.saveButton} type="submit">
              保存到本机
            </button>
          </div>
        </form>
      </PaperCard>
    </AppShell>
  );
}
