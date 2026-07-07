import { useEffect, useState } from "react";
import { AppShell } from "../components/AppShell";
import { PaperCard } from "../components/PaperCard";
import { Toast } from "../components/Toast";
import { TopBar } from "../components/TopBar";
import { loadAiSettings, saveAiSettings } from "../features/ai/api";
import type { AiProvider } from "../features/ai/types";
import styles from "./AiSettingsPage.module.css";

export function AiSettingsPage() {
  const initial = loadAiSettings();
  const [provider, setProvider] = useState<AiProvider>(initial.provider);
  const [model, setModel] = useState(initial.model);
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 1900);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveAiSettings({ provider, model, apiKey });
    setToast("AI 设置已保存在本机浏览器");
  }

  return (
    <AppShell overlaySlot={<Toast message={toast} />}>
      <TopBar title="AI 设置" subtitle="配置你自己的模型信息，聊天页会从本机读取。" />
      <PaperCard className={styles.noticeCard} tone="warm" tilt="left">
        <h2>本机保存提示</h2>
        <p>API Key 只写入当前浏览器 localStorage，不会提交到后端。请不要在公用设备上保存长期有效的密钥。</p>
      </PaperCard>
      <PaperCard className={styles.settingsCard} tone="white" tilt="right">
        <h2>模型配置</h2>
        <form onSubmit={submit}>
          <div className={styles.field}>
            <label htmlFor="provider">供应商</label>
            <select id="provider" value={provider} onChange={(event) => setProvider(event.target.value as AiProvider)}>
              <option value="anthropic">Anthropic</option>
              <option value="openai-compatible">OpenAI Compatible</option>
              <option value="custom">自定义</option>
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="model">模型</label>
            <input id="model" value={model} onChange={(event) => setModel(event.target.value)} placeholder="例如：claude-sonnet-4-5" />
          </div>
          <div className={styles.field}>
            <label htmlFor="apiKey">API Key</label>
            <input id="apiKey" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="只保存在本机" type="password" autoComplete="off" />
          </div>
          <button className={styles.saveButton} type="submit">保存到本机</button>
        </form>
      </PaperCard>
    </AppShell>
  );
}
