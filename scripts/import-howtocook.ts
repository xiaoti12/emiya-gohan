/**
 * HowToCook → 公共基础菜 seed 导入脚本。
 *
 * 用法示例：
 *   OPENAI_API_KEY=... npx tsx scripts/import-howtocook.ts \
 *     --repo-path ../HowToCook --limit 5 --concurrency 3
 *
 * 产出：
 *   - scripts/out/howtocook/recipes.json
 *   - scripts/out/howtocook/report.json
 *   - worker/seeds/recipes_howtocook.sql（非 --dry-run）
 *
 * 环境变量：
 *   OPENAI_API_KEY   必填（除非 --dry-run 且 --skip-ai，仅用于调试扫描）
 *   OPENAI_BASE_URL  可选，默认 https://api.openai.com/v1
 *   OPENAI_MODEL     可选，默认 gpt-4o-mini
 */

import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const DEFAULT_INCLUDES = [
  "meat_dish",
  "vegetable_dish",
  "aquatic",
  "soup",
] as const;

const ALWAYS_EXCLUDE = new Set(["template"]);

const CATEGORY_MAP: Record<string, string> = {
  meat_dish: "荤菜",
  aquatic: "荤菜",
  vegetable_dish: "素菜",
  soup: "汤",
  breakfast: "其他",
  staple: "其他",
  "semi-finished": "其他",
  drink: "其他",
  condiment: "其他",
  dessert: "其他",
};

const TAG_VOCAB = [
  "下饭",
  "快手",
  "家常",
  "清淡",
  "凉菜",
  "汤羹",
  "辣口",
  "重口",
  "少油",
  "蒸煮",
  "煎炒",
  "炖煮",
  "空气炸锅",
] as const;

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

const MAX_NAME = 80;
const MAX_CATEGORY = 30;
const MAX_SUMMARY = 500;
const MAX_TAG_COUNT = 10;
const MAX_TAG_LENGTH = 20;
const MAX_STEP_COUNT = 30;
const MAX_STEP_LENGTH = 500;
const MAX_INGREDIENT_COUNT = 50;
const MAX_INGREDIENT_NAME = 50;
const MAX_AMOUNT = 50;

const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/Anduin2017/HowToCook/master";

type CliOptions = {
  repoPath: string;
  include: string[];
  exclude: string[];
  limit: number | null;
  concurrency: number;
  dryRun: boolean;
  upsert: boolean;
  outDir: string;
  sqlPath: string;
  skipAi: boolean;
};

type RecipeCandidate = {
  relativeMdPath: string;
  absoluteMdPath: string;
  folder: string;
  dishDir: string;
  coverImageUrl: string | null;
};

type AiRecipe = {
  name: string;
  category: string;
  tags: string[];
  summary: string;
  ingredients: Array<{ name: string; amount: string }>;
  steps: string[];
};

type ImportedRecipe = AiRecipe & {
  id: string;
  source: "howtocook";
  coverImageUrl: string | null;
  relativeMdPath: string;
  folder: string;
};

type Failure = {
  path: string;
  reason: string;
};

function printHelp() {
  console.log(`HowToCook 导入脚本

必填:
  --repo-path <dir>     本地 HowToCook 仓库根目录

可选:
  --include a,b         默认 meat_dish,vegetable_dish,aquatic,soup
  --exclude a,b         额外排除的 dishes 子目录（template 永远排除）
  --limit N             全局最多导入 N 道
  --concurrency N       AI 并发，默认 3
  --dry-run             只写 JSON/report，不写 SQL
  --upsert              SQL 使用 INSERT OR REPLACE（默认 INSERT OR IGNORE）
  --out-dir <dir>       中间产物目录，默认 scripts/out/howtocook
  --sql-path <file>     SQL 输出路径，默认 worker/seeds/recipes_howtocook.sql
  --skip-ai             仅扫描文件与封面，不调 AI（调试用）
  --help                显示帮助
`);
}

function parseList(value: string | undefined) {
  if (!value) return [] as string[];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    repoPath: "",
    include: [...DEFAULT_INCLUDES],
    exclude: [],
    limit: null,
    concurrency: 3,
    dryRun: false,
    upsert: false,
    outDir: path.join(repoRoot, "scripts/out/howtocook"),
    sqlPath: path.join(repoRoot, "worker/seeds/recipes_howtocook.sql"),
    skipAi: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      case "--repo-path":
        options.repoPath = next ?? "";
        i += 1;
        break;
      case "--include":
        options.include = parseList(next);
        i += 1;
        break;
      case "--exclude":
        options.exclude = parseList(next);
        i += 1;
        break;
      case "--limit":
        options.limit = Number(next);
        i += 1;
        break;
      case "--concurrency":
        options.concurrency = Number(next);
        i += 1;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--upsert":
        options.upsert = true;
        break;
      case "--out-dir":
        options.outDir = path.resolve(next ?? "");
        i += 1;
        break;
      case "--sql-path":
        options.sqlPath = path.resolve(next ?? "");
        i += 1;
        break;
      case "--skip-ai":
        options.skipAi = true;
        break;
      default:
        throw new Error(`未知参数: ${arg}`);
    }
  }

  if (!options.repoPath) {
    throw new Error("必须提供 --repo-path");
  }
  options.repoPath = path.resolve(options.repoPath);

  if (options.include.length === 0) {
    throw new Error("--include 不能为空");
  }
  if (
    options.limit !== null &&
    (!Number.isInteger(options.limit) || options.limit < 1)
  ) {
    throw new Error("--limit 必须是正整数");
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1) {
    throw new Error("--concurrency 必须是正整数");
  }

  return options;
}

function charLength(value: string) {
  return Array.from(value).length;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function sqlString(value: string | null) {
  if (value === null) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

function slugifyPath(relativeMdPath: string) {
  const noExt = relativeMdPath.replace(/\.md$/i, "");
  const raw = noExt
    .replace(/^dishes\//, "")
    .split("/")
    .join("_")
    .replace(/[^a-zA-Z0-9一-鿿_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
  const compact = raw.slice(0, 80) || "recipe";
  const hash = createHash("sha1").update(relativeMdPath).digest("hex").slice(0, 8);
  // 保留可读前缀 + 短 hash，避免中文/长路径导致 ID 不稳定或过长
  const ascii = compact
    .replace(/[^\w-]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
  return `${ascii || "recipe"}_${hash}`;
}

function recipeIdFromPath(relativeMdPath: string) {
  return `base_htc_${slugifyPath(relativeMdPath)}`;
}

function ingredientId(recipeId: string, index: number) {
  return `${recipeId}_ing_${index + 1}`;
}

async function pathExists(target: string) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function walkMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkMarkdownFiles(full)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
}

function toPosix(relativePath: string) {
  return relativePath.split(path.sep).join("/");
}

function resolveCoverImageUrl(
  absoluteMdPath: string,
  markdown: string,
  repoPath: string,
): string | null {
  const dishDir = path.dirname(absoluteMdPath);
  const mdImage = [...markdown.matchAll(/!\[[^\]]*]\(([^)]+)\)/g)]
    .map((match) => match[1]?.trim())
    .filter((src): src is string => Boolean(src))
    .find((src) => {
      if (/^https?:\/\//i.test(src)) return false;
      const clean = src.split("#")[0]?.split("?")[0] ?? "";
      const ext = path.extname(clean).toLowerCase();
      return IMAGE_EXTS.has(ext);
    });

  if (mdImage) {
    const clean = mdImage.split("#")[0]?.split("?")[0] ?? mdImage;
    const absolute = path.resolve(dishDir, clean);
    const relative = toPosix(path.relative(repoPath, absolute));
    if (!relative.startsWith("..")) {
      return `${GITHUB_RAW_BASE}/${relative}`;
    }
  }

  // 目录回退：优先与 md 同名图片，其次任意一张图片
  return null;
}

async function resolveCoverWithFs(
  absoluteMdPath: string,
  markdown: string,
  repoPath: string,
): Promise<string | null> {
  const fromMd = resolveCoverImageUrl(absoluteMdPath, markdown, repoPath);
  if (fromMd) {
    const relative = fromMd.slice(GITHUB_RAW_BASE.length + 1);
    const absolute = path.join(repoPath, relative);
    if (await pathExists(absolute)) return fromMd;
  }

  const dishDir = path.dirname(absoluteMdPath);
  const baseName = path.basename(absoluteMdPath, path.extname(absoluteMdPath));
  let entries: string[] = [];
  try {
    entries = await readdir(dishDir);
  } catch {
    return null;
  }

  const images = entries.filter((name) =>
    IMAGE_EXTS.has(path.extname(name).toLowerCase()),
  );
  if (images.length === 0) return null;

  const preferred =
    images.find((name) => path.basename(name, path.extname(name)) === baseName) ??
    images[0];
  if (!preferred) return null;
  const absolute = path.join(dishDir, preferred);
  const relative = toPosix(path.relative(repoPath, absolute));
  if (relative.startsWith("..")) return null;
  return `${GITHUB_RAW_BASE}/${relative}`;
}

async function collectCandidates(options: CliOptions): Promise<RecipeCandidate[]> {
  const dishesDir = path.join(options.repoPath, "dishes");
  if (!(await pathExists(dishesDir))) {
    throw new Error(`未找到 dishes 目录: ${dishesDir}`);
  }

  const exclude = new Set(
    [...ALWAYS_EXCLUDE, ...options.exclude].map((item) => item.trim()),
  );
  const include = new Set(options.include.map((item) => item.trim()));
  const allMd = await walkMarkdownFiles(dishesDir);
  const candidates: RecipeCandidate[] = [];

  for (const absoluteMdPath of allMd.sort()) {
    const relativeMdPath = toPosix(path.relative(options.repoPath, absoluteMdPath));
    const parts = relativeMdPath.split("/");
    // dishes/<folder>/...
    if (parts.length < 3 || parts[0] !== "dishes") continue;
    const folder = parts[1] ?? "";
    if (!folder || exclude.has(folder)) continue;
    if (!include.has(folder)) continue;

    const markdown = await readFile(absoluteMdPath, "utf8");
    const coverImageUrl = await resolveCoverWithFs(
      absoluteMdPath,
      markdown,
      options.repoPath,
    );

    candidates.push({
      relativeMdPath,
      absoluteMdPath,
      folder,
      dishDir: path.dirname(absoluteMdPath),
      coverImageUrl,
    });
  }

  if (options.limit !== null) {
    return candidates.slice(0, options.limit);
  }
  return candidates;
}

function buildSystemPrompt() {
  return `你是菜谱结构化助手。把 HowToCook 的 markdown 转成厨房助手项目的 JSON。

硬性规则：
1. 只输出一个 JSON 对象，不要 markdown 代码块，不要解释。
2. category 必须按 folder 映射：
   - meat_dish / aquatic → 荤菜
   - vegetable_dish → 素菜
   - soup → 汤
   - 其他 → 其他
3. aquatic 的 tags 必须包含「水产」。
4. ingredients 只要主料；丢弃：
   - 标注可选的原料
   - 厨具（锅/铲/碗/刀/砧板/筷子等）
   - 常见调味料（盐/糖/油/食用油/生抽/老抽/料酒/醋/淀粉/胡椒/味精/鸡精/蚝油/香油/豆瓣酱/酱油/葱姜蒜若仅作调味可丢；若是主料如葱油饼的葱则保留）
5. amount 按约 1 人份给出固定文本（如 200g、2 个）；无法确定时合理估算，再不行用「适量」。
6. steps 把操作区扁平为有序字符串数组，保留可操作性，去掉无用层级标题。
7. summary 基于导语改写成简短家常介绍。
8. tags 只能从下列词表选 1–3 个：${TAG_VOCAB.join("、")}
9. 长度限制：
   - name 1–${MAX_NAME}
   - category 1–${MAX_CATEGORY}
   - summary ≤${MAX_SUMMARY}
   - tags ≤${MAX_TAG_COUNT} 且每项 ≤${MAX_TAG_LENGTH}
   - steps ≤${MAX_STEP_COUNT} 且每步 ≤${MAX_STEP_LENGTH}
   - ingredients 1–${MAX_INGREDIENT_COUNT}
   - ingredient.name 1–${MAX_INGREDIENT_NAME}
   - amount ≤${MAX_AMOUNT}
10. name 去掉「的做法」后缀。

输出 schema：
{
  "name": string,
  "category": string,
  "tags": string[],
  "summary": string,
  "ingredients": [{ "name": string, "amount": string }],
  "steps": string[]
}`;
}

function buildUserPrompt(candidate: RecipeCandidate, markdown: string) {
  return `folder: ${candidate.folder}
path: ${candidate.relativeMdPath}
expectedCategory: ${CATEGORY_MAP[candidate.folder] ?? "其他"}

markdown:
---
${markdown}
---`;
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim());
    }
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("模型输出不是合法 JSON");
  }
}

function validateAiRecipe(value: unknown, folder: string): AiRecipe {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("根节点必须是对象");
  }
  const input = value as Record<string, unknown>;

  if (typeof input.name !== "string") throw new Error("name 必须是字符串");
  let name = input.name.trim().replace(/的做法$/u, "").trim();
  if (!name || charLength(name) > MAX_NAME) {
    throw new Error(`name 长度非法: ${name}`);
  }

  const expectedCategory = CATEGORY_MAP[folder] ?? "其他";
  let category =
    typeof input.category === "string" && input.category.trim()
      ? input.category.trim()
      : expectedCategory;
  // folder 映射优先，避免模型乱分类
  category = expectedCategory;
  if (charLength(category) > MAX_CATEGORY) {
    throw new Error("category 过长");
  }

  if (!Array.isArray(input.tags)) throw new Error("tags 必须是数组");
  const allowed = new Set<string>(TAG_VOCAB);
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const item of input.tags) {
    if (typeof item !== "string") throw new Error("tag 必须是字符串");
    const tag = item.trim();
    if (!tag || !allowed.has(tag)) continue;
    const key = normalizeText(tag);
    if (seen.has(key)) continue;
    if (charLength(tag) > MAX_TAG_LENGTH) continue;
    seen.add(key);
    tags.push(tag);
    if (tags.length >= 3) break;
  }
  if (folder === "aquatic" && !tags.includes("水产")) {
    tags.unshift("水产");
  }
  if (tags.length === 0) tags.push("家常");
  if (tags.length > MAX_TAG_COUNT) tags.length = MAX_TAG_COUNT;

  if (typeof input.summary !== "string") throw new Error("summary 必须是字符串");
  let summary = input.summary.trim();
  if (charLength(summary) > MAX_SUMMARY) {
    summary = Array.from(summary).slice(0, MAX_SUMMARY).join("");
  }

  if (!Array.isArray(input.ingredients) || input.ingredients.length < 1) {
    throw new Error("ingredients 至少 1 项");
  }
  if (input.ingredients.length > MAX_INGREDIENT_COUNT) {
    throw new Error("ingredients 过多");
  }
  const ingredients: Array<{ name: string; amount: string }> = [];
  const seenIng = new Set<string>();
  for (const [index, raw] of input.ingredients.entries()) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw new Error(`ingredients[${index}] 非法`);
    }
    const row = raw as Record<string, unknown>;
    if (typeof row.name !== "string") throw new Error(`ingredients[${index}].name 非法`);
    const ingName = row.name.trim();
    if (!ingName || charLength(ingName) > MAX_INGREDIENT_NAME) {
      throw new Error(`ingredients[${index}].name 长度非法`);
    }
    let amount = "";
    if (typeof row.amount === "string") amount = row.amount.trim();
    if (!amount) amount = "适量";
    if (charLength(amount) > MAX_AMOUNT) {
      amount = Array.from(amount).slice(0, MAX_AMOUNT).join("");
    }
    const key = normalizeText(ingName);
    if (seenIng.has(key)) continue;
    seenIng.add(key);
    ingredients.push({ name: ingName, amount });
  }
  if (ingredients.length < 1) throw new Error("过滤后 ingredients 为空");

  if (!Array.isArray(input.steps) || input.steps.length < 1) {
    throw new Error("steps 至少 1 步");
  }
  if (input.steps.length > MAX_STEP_COUNT) {
    throw new Error("steps 过多");
  }
  const steps = input.steps.map((item, index) => {
    if (typeof item !== "string") throw new Error(`steps[${index}] 非法`);
    const step = item.trim();
    if (!step) throw new Error(`steps[${index}] 为空`);
    if (charLength(step) > MAX_STEP_LENGTH) {
      return Array.from(step).slice(0, MAX_STEP_LENGTH).join("");
    }
    return step;
  });

  return { name, category, tags, summary, ingredients, steps };
}

async function callOpenAi(
  candidate: RecipeCandidate,
  markdown: string,
  env: { apiKey: string; baseUrl: string; model: string },
): Promise<AiRecipe> {
  const url = `${env.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.apiKey}`,
    },
    body: JSON.stringify({
      model: env.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(candidate, markdown) },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI HTTP ${response.status}: ${body.slice(0, 300)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("模型未返回 content");
  const parsed = extractJsonObject(content);
  return validateAiRecipe(parsed, candidate.folder);
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function run() {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await worker(items[current] as T, current);
    }
  }

  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => run(),
  );
  await Promise.all(runners);
  return results;
}

function buildSql(recipes: ImportedRecipe[], upsert: boolean) {
  const verb = upsert ? "INSERT OR REPLACE" : "INSERT OR IGNORE";
  const lines: string[] = [];
  lines.push("-- Auto-generated by scripts/import-howtocook.ts");
  lines.push("-- source: HowToCook public base recipes (family_id IS NULL)");
  lines.push(
    `-- generated_at: ${new Date().toISOString()} count: ${recipes.length}`,
  );
  lines.push("");

  for (const recipe of recipes) {
    lines.push(
      `${verb} INTO recipes (
  id, family_id, parent_recipe_id,
  name, normalized_name, category, tags, source, summary, cover_image_url, steps_json
) VALUES (
  ${sqlString(recipe.id)},
  NULL,
  NULL,
  ${sqlString(recipe.name)},
  ${sqlString(normalizeText(recipe.name))},
  ${sqlString(recipe.category)},
  ${sqlString(JSON.stringify(recipe.tags))},
  'howtocook',
  ${sqlString(recipe.summary)},
  ${sqlString(recipe.coverImageUrl)},
  ${sqlString(JSON.stringify(recipe.steps))}
);`,
    );

    for (const [index, ingredient] of recipe.ingredients.entries()) {
      lines.push(
        `${verb} INTO recipe_ingredients (
  id, recipe_id, name, normalized_name, amount
) VALUES (
  ${sqlString(ingredientId(recipe.id, index))},
  ${sqlString(recipe.id)},
  ${sqlString(ingredient.name)},
  ${sqlString(normalizeText(ingredient.name))},
  ${sqlString(ingredient.amount)}
);`,
      );
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  console.log(`扫描仓库: ${options.repoPath}`);

  const candidates = await collectCandidates(options);
  console.log(`候选菜谱: ${candidates.length}`);

  if (candidates.length === 0) {
    throw new Error("没有匹配的菜谱文件，请检查 --include / --exclude / 仓库路径");
  }

  await mkdir(options.outDir, { recursive: true });

  const failures: Failure[] = [];
  const imported: ImportedRecipe[] = [];

  if (options.skipAi) {
    for (const candidate of candidates) {
      imported.push({
        id: recipeIdFromPath(candidate.relativeMdPath),
        name: path.basename(candidate.relativeMdPath, ".md"),
        category: CATEGORY_MAP[candidate.folder] ?? "其他",
        tags: candidate.folder === "aquatic" ? ["水产"] : ["家常"],
        summary: "",
        ingredients: [{ name: "待 AI 解析", amount: "适量" }],
        steps: ["待 AI 解析"],
        source: "howtocook",
        coverImageUrl: candidate.coverImageUrl,
        relativeMdPath: candidate.relativeMdPath,
        folder: candidate.folder,
      });
    }
  } else {
    const apiKey = process.env.OPENAI_API_KEY ?? "";
    if (!apiKey) {
      throw new Error("缺少 OPENAI_API_KEY");
    }
    const env = {
      apiKey,
      baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    };

    let done = 0;
    const outcomes = await mapPool(candidates, options.concurrency, async (candidate) => {
      try {
        const markdown = await readFile(candidate.absoluteMdPath, "utf8");
        const ai = await callOpenAi(candidate, markdown, env);
        return {
          ok: true as const,
          recipe: {
            ...ai,
            id: recipeIdFromPath(candidate.relativeMdPath),
            source: "howtocook" as const,
            coverImageUrl: candidate.coverImageUrl,
            relativeMdPath: candidate.relativeMdPath,
            folder: candidate.folder,
          },
        };
      } catch (error) {
        return {
          ok: false as const,
          failure: {
            path: candidate.relativeMdPath,
            reason: error instanceof Error ? error.message : String(error),
          },
        };
      } finally {
        done += 1;
        if (done % 5 === 0 || done === candidates.length) {
          console.log(`进度 ${done}/${candidates.length}`);
        }
      }
    });

    for (const outcome of outcomes) {
      if (outcome.ok) imported.push(outcome.recipe);
      else failures.push(outcome.failure);
    }
  }

  // 稳定顺序，便于 diff
  imported.sort((a, b) => a.relativeMdPath.localeCompare(b.relativeMdPath, "zh"));
  failures.sort((a, b) => a.path.localeCompare(b.path, "zh"));

  const jsonPath = path.join(options.outDir, "recipes.json");
  const reportPath = path.join(options.outDir, "report.json");
  await writeFile(jsonPath, `${JSON.stringify(imported, null, 2)}\n`, "utf8");
  await writeFile(
    reportPath,
    `${JSON.stringify(
      {
        totalCandidates: candidates.length,
        successCount: imported.length,
        failureCount: failures.length,
        failures,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`JSON: ${jsonPath}`);
  console.log(`Report: ${reportPath}`);
  console.log(`成功 ${imported.length}，失败 ${failures.length}`);

  if (!options.dryRun) {
    if (imported.length === 0) {
      throw new Error("没有成功菜谱，跳过 SQL 写入");
    }
    const sql = buildSql(imported, options.upsert);
    await mkdir(path.dirname(options.sqlPath), { recursive: true });
    await writeFile(options.sqlPath, sql, "utf8");
    console.log(`SQL: ${options.sqlPath}`);
    console.log(
      `导入示例: wrangler d1 execute emiya-gohan --local --config worker/wrangler.toml --file=${path.relative(repoRoot, options.sqlPath)}`,
    );
  } else {
    console.log("dry-run：未写入 SQL");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
