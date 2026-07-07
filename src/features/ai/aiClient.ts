import type { AiSettings } from "./types";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function sendChatMessage(_settings: AiSettings, _messages: ChatMessage[]) {
  throw new Error("AI 调用将在 Phase 5 接入");
}
