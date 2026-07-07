import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { PaperCard } from "../components/PaperCard";
import { Toast } from "../components/Toast";
import { TopBar } from "../components/TopBar";
import { hasAiApiKey } from "../features/ai/api";
import styles from "./ChatPage.module.css";

const suggestions = ["晚上想吃清淡的，推荐个菜", "用鸡蛋和番茄能做什么", "记录一道新菜：红烧鸡翅"];

export function ChatPage() {
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");
  const aiReady = hasAiApiKey();

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 1900);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToast(aiReady ? "AI 调用将在后续版本接入" : "请先配置 AI API Key");
  }

  return (
    <AppShell overlaySlot={<Toast message={toast} />}>
      <TopBar title="问问厨房助手" subtitle="聊天页先作为 AI 能力入口壳，保存前仍需要用户确认。" actionText="设" actionLabel="AI 设置" actionTo="/ai-settings" />

      <PaperCard className={styles.chatCard} tone="white" tilt="left">
        <h2>{aiReady ? "AI 配置已就绪" : "先配置你的模型 Key"}</h2>
        <p>API Key 只保存在本机浏览器。Phase1 暂不直连模型，后续在这里完成建议菜品和自然语言录入。</p>
        {!aiReady ? <Link className={styles.settingsButton} to="/ai-settings">去设置</Link> : null}
        <div className={styles.suggestionList}>
          {suggestions.map((item) => (
            <button key={item} className={styles.suggestion} type="button" onClick={() => setMessage(item)}>
              {item}
            </button>
          ))}
        </div>
      </PaperCard>

      <PaperCard className={styles.messageCard} tone="blue" tilt="right">
        <h2>对话预览</h2>
        <div className={styles.messageBubble}>
          <strong>厨房助手</strong>
          你可以问我“今晚吃什么”，也可以让我帮你整理一段新菜谱。保存到菜谱库前，我会先让你确认。
        </div>
      </PaperCard>

      <PaperCard className={styles.inputCard} tone="white" tilt="left">
        <form className={styles.inputRow} onSubmit={submit}>
          <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="输入想问的菜..." />
          <button className={styles.sendButton} type="submit">发</button>
        </form>
      </PaperCard>
    </AppShell>
  );
}
