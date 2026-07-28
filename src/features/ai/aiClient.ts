import type { IngredientCategory } from "../ingredients/types";
import type {
  AiSettings,
  LoadModelsResult,
  RecognizedIngredient,
  TestConnectionResult,
} from "./types";

export class AiClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "AiClientError";
  }
}

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const INGREDIENT_RECOGNITION_PROMPT = `你是家庭厨房助手。请识别图片中的食材，只返回 JSON 数组，不要 markdown，不要解释。

规则：
1. name 使用中文常用名（如「西红柿」「鸡蛋」）
2. category 只能是 vegetable、meat、other 之一
3. quantity 为数字；看不清数量时 quantity 与 unit 都为 null
4. unit 为中文单位字符串；看不清时为 null
5. 不要输出保质期、不要编造图中没有的食材
6. 若没有食材，返回 []

示例：
[{"name":"西红柿","category":"vegetable","quantity":3,"unit":"个"},{"name":"鸡蛋","category":"other","quantity":null,"unit":null}]`;

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, "");
}

function assertReady(settings: AiSettings) {
  if (!settings.apiKey.trim()) {
    throw new AiClientError("请先填写 API Key");
  }
  if (!settings.baseUrl.trim()) {
    throw new AiClientError("请先填写 Base URL");
  }
  if (!settings.model.trim()) {
    throw new AiClientError("请先填写模型名称");
  }
}

async function readErrorMessage(response: Response) {
  const text = await response.text().catch(() => "");
  if (!text) {
    return `请求失败（HTTP ${response.status}）`;
  }

  try {
    const json = JSON.parse(text) as {
      error?: { message?: string } | string;
      message?: string;
    };
    if (typeof json.error === "string" && json.error.trim()) return json.error;
    if (json.error && typeof json.error === "object" && json.error.message) {
      return json.error.message;
    }
    if (typeof json.message === "string" && json.message.trim()) {
      return json.message;
    }
  } catch {
    // fall through
  }

  return text.slice(0, 240);
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new AiClientError("网络请求失败，请检查 Base URL 是否允许浏览器跨域访问");
  }

  if (!response.ok) {
    throw new AiClientError(await readErrorMessage(response), response.status);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new AiClientError("模型返回了无法解析的响应");
  }
}

function buildOpenAiHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

function buildGeminiUrl(baseUrl: string, path: string, apiKey: string) {
  const url = new URL(`${normalizeBaseUrl(baseUrl)}${path}`);
  url.searchParams.set("key", apiKey);
  return url.toString();
}

function extractOpenAiText(payload: {
  choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
}): string {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part.text === "string" ? part.text : ""))
      .join("")
      .trim();
  }
  return "";
}

function extractGeminiText(payload: {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}): string {
  return (
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? ""
  );
}

function stripCodeFence(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function normalizeCategory(value: unknown): IngredientCategory {
  if (value === "vegetable" || value === "meat" || value === "other") {
    return value;
  }
  return "other";
}

function normalizeQuantity(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return number;
}

function normalizeUnit(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const unit = value.trim();
  if (!unit) return null;
  return Array.from(unit).slice(0, 20).join("");
}

function parseRecognizedIngredients(text: string): RecognizedIngredient[] {
  const raw = stripCodeFence(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AiClientError("未能解析模型返回的食材 JSON，请重试");
  }

  if (!Array.isArray(parsed)) {
    throw new AiClientError("模型返回格式不正确，期望 JSON 数组");
  }

  return parsed
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name.trim() : "";
      if (!name) return null;
      return {
        name: Array.from(name).slice(0, 50).join(""),
        category: normalizeCategory(record.category),
        quantity: normalizeQuantity(record.quantity),
        unit: normalizeUnit(record.unit),
      } satisfies RecognizedIngredient;
    })
    .filter((item): item is RecognizedIngredient => item !== null);
}

export async function loadModels(settings: AiSettings): Promise<LoadModelsResult> {
  assertReady({ ...settings, model: settings.model || "placeholder" });
  const baseUrl = normalizeBaseUrl(settings.baseUrl);

  if (settings.provider === "openai-compatible") {
    const payload = await requestJson<{ data?: Array<{ id?: string }> }>(`${baseUrl}/models`, {
      method: "GET",
      headers: buildOpenAiHeaders(settings.apiKey.trim()),
    });
    const models = (payload.data ?? [])
      .map((item) => item.id?.trim() ?? "")
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    return { models };
  }

  const payload = await requestJson<{ models?: Array<{ name?: string }> }>(
    buildGeminiUrl(baseUrl, "/models", settings.apiKey.trim()),
    { method: "GET" },
  );

  const models = (payload.models ?? [])
    .map((item) => {
      const name = item.name?.trim() ?? "";
      return name.startsWith("models/") ? name.slice("models/".length) : name;
    })
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  return { models };
}

export async function testConnection(settings: AiSettings): Promise<TestConnectionResult> {
  assertReady(settings);
  const startedAt = performance.now();
  const baseUrl = normalizeBaseUrl(settings.baseUrl);
  const model = settings.model.trim();
  const prompt = "请只回复：ok";

  let preview = "";

  if (settings.provider === "openai-compatible") {
    const payload = await requestJson<{
      choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
    }>(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: buildOpenAiHeaders(settings.apiKey.trim()),
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 100,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    preview = extractOpenAiText(payload);
  } else {
    const payload = await requestJson<{
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    }>(buildGeminiUrl(baseUrl, `/models/${encodeURIComponent(model)}:generateContent`, settings.apiKey.trim()), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 100 },
      }),
    });
    preview = extractGeminiText(payload);
  }

  if (!preview.trim()) {
    throw new AiClientError("连通成功但模型未返回文本");
  }

  return {
    ok: true,
    latencyMs: Math.round(performance.now() - startedAt),
    model,
    preview: preview.trim().slice(0, 80),
  };
}

export async function recognizeIngredientsFromImage(
  settings: AiSettings,
  image: { mimeType: string; base64: string },
): Promise<RecognizedIngredient[]> {
  assertReady(settings);
  const baseUrl = normalizeBaseUrl(settings.baseUrl);
  const model = settings.model.trim();
  const pureBase64 = image.base64.replace(/^data:[^;]+;base64,/, "");

  let text = "";

  if (settings.provider === "openai-compatible") {
    const payload = await requestJson<{
      choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
    }>(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: buildOpenAiHeaders(settings.apiKey.trim()),
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: INGREDIENT_RECOGNITION_PROMPT },
              {
                type: "image_url",
                image_url: {
                  url: `data:${image.mimeType};base64,${pureBase64}`,
                },
              },
            ],
          },
        ],
      }),
    });
    text = extractOpenAiText(payload);
  } else {
    const payload = await requestJson<{
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    }>(buildGeminiUrl(baseUrl, `/models/${encodeURIComponent(model)}:generateContent`, settings.apiKey.trim()), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: INGREDIENT_RECOGNITION_PROMPT },
              {
                inline_data: {
                  mime_type: image.mimeType,
                  data: pureBase64,
                },
              },
            ],
          },
        ],
        generationConfig: { temperature: 0 },
      }),
    });
    text = extractGeminiText(payload);
  }

  if (!text.trim()) {
    throw new AiClientError("模型没有返回识别结果");
  }

  return parseRecognizedIngredients(text);
}

export async function sendChatMessage(_settings: AiSettings, _messages: ChatMessage[]) {
  throw new Error("AI 聊天将在后续版本接入");
}
