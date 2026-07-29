# 厨房助手（emiya-gohan）

手机优先的家庭厨房 SPA，降低「今天吃什么 / 做什么」的决策成本。

- 按 `family_id` 隔离家庭空间数据
- 食材库存、菜谱库、想做/做过记录、随机推荐
- 前端 AI 图片识别（浏览器直连模型，非 Worker 代理）

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vite + React 19 + TypeScript + React Router v7 |
| 样式 | CSS Modules + CSS 自定义属性 |
| 后端 | Cloudflare Worker + D1（SQLite） |
| 部署 | **Vercel（前端 SPA）** + Cloudflare（Worker API） |

## 在线入口（Vercel）

| 项 | 说明 |
|---|---|
| 平台 | [Vercel](https://vercel.com) |
| 项目类型 | Vite SPA 静态站点 |
| 构建命令 | `npm run build` |
| 输出目录 | `dist` |
| 安装命令 | `npm install` |
| SPA 回退 | 见根目录 [`vercel.json`](./vercel.json)，所有路径 rewrite 到 `/index.html` |

### 一键部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fxiaoti12%2Femiya-gohan&env=VITE_API_BASE_URL&envDescription=Cloudflare%20Worker%20API%20%E6%A0%B9%E5%9C%B0%E5%9D%80%EF%BC%8C%E4%BE%8B%E5%A6%82%20https%3A%2F%2Femiya-gohan-api.xxx.workers.dev&project-name=emiya-gohan&repository-name=emiya-gohan)

**Environment Variables**（生产必填）：

| 变量 | 示例 | 说明 |
|---|---|---|
| `VITE_API_BASE_URL` | `https://emiya-gohan-api.<your-subdomain>.workers.dev` | Worker API 根地址 |

> 前端与 API 分域部署：Vercel 只托管静态 SPA，接口全部走 Cloudflare Worker。部署完成后把 Vercel 域名加入 Worker `ALLOWED_ORIGINS` 并 `npm run worker:deploy`。

### `vercel.json` 说明

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

- `rewrites`：保证 React Router 客户端路由在刷新 / 直链时不 404
- `headers`：基础安全响应头

## 本地开发

### 环境要求

- Node.js 20+（建议）
- npm
- Cloudflare 账号（部署 Worker / 使用远程 D1 时）
- Vercel 账号（部署前端时）

### 安装

```bash
npm install
cp .env.example .env
```

`.env` 默认内容：

```bash
VITE_API_BASE_URL=http://localhost:8787
```

### 启动

开两个终端：

```bash
# 终端 1：前端
npm run dev
# → http://localhost:5173

# 终端 2：Worker + 本地 D1
npm run worker:migrate:local   # 首次或迁移变更后
npm run worker:dev
# → http://localhost:8787
```

健康检查：`GET http://localhost:8787/healthz`

### 常用命令

```bash
npm run dev                    # Vite 开发服务器
npm run build                  # 前端 TypeScript 检查 + 构建（Vercel 使用此命令）
npm run preview                # 预览 dist
npm run typecheck              # 前端 + Worker 类型检查
npm run worker:dev             # 本地 Worker
npm run worker:migrate:local   # 本地 D1 迁移
npm run worker:migrate:remote  # 远程 D1 迁移
npm run worker:deploy          # 部署 Worker
npm run import:howtocook -- --repo-path <HowToCook路径> [--limit N]
```

## 部署清单

### 1. Cloudflare Worker（API）

1. 在 Cloudflare 创建 D1 数据库 `emiya-gohan`，把真实 `database_id` 写入 `worker/wrangler.toml`
2. 配置 `ALLOWED_ORIGINS`（含本地与 Vercel 生产域名，逗号分隔）
3. 应用迁移并部署：

```bash
npm run worker:migrate:remote
npm run worker:deploy
```

### 2. Vercel（前端）

1. 导入 Git 仓库到 Vercel
2. 设置 `VITE_API_BASE_URL` 为已部署的 Worker 地址
3. 触发部署；构建产物目录为 `dist`
4. 将 Vercel 分配的域名（及自定义域名）补进 Worker `ALLOWED_ORIGINS` 后重新 `worker:deploy`

### 3. 可选：导入 HowToCook 基础菜谱

```bash
npm run import:howtocook -- --repo-path <HowToCook本地路径>
# 生成 scripts/out/recipes_howtocook.sql 后，再导入到 D1
```

## 项目结构

```text
.
├── public/                 # 静态资源
├── src/                    # 前端 SPA
│   ├── app/                # App 入口、路由、FamilyGate
│   ├── components/         # 跨页 UI
│   ├── features/           # 领域 API / 类型 / 局部组件
│   ├── pages/              # 页面
│   └── styles/             # 设计 token
├── worker/                 # Cloudflare Worker API
│   ├── migrations/         # D1 迁移
│   ├── seeds/              # 本地样例数据
│   ├── src/                # routes / services / db
│   └── wrangler.toml
├── scripts/                # 菜谱导入等脚本
├── vercel.json             # Vercel SPA 配置
├── package.json
└── README.md
```

## 功能概览

| 领域 | 状态 |
|---|---|
| 家庭空间（创建 / 按名称加入） | ✅ Worker |
| 食材库存（列表 / 增删改 / 图片 AI 录入） | ✅ Worker；图片识别为前端直连模型 |
| 菜谱（列表分页 / 详情 / 家庭菜 / 派生） | ✅ Worker |
| 菜谱记录（想做 / 做过） | ✅ Worker（`PATCH` 仍为 501） |
| 随机推荐 | ✅ Worker |
| AI 设置 | ✅ 本机 localStorage |
| AI 聊天 | 🚧 UI / Toast，尚未接模型 |

## 开发约定（摘要）

- 所有真实请求经 `src/lib/apiClient.ts` 的 `apiFetch`，自动注入 `X-Family-Id`
- Worker 响应 envelope：`{ data, error }`
- 家庭私有资源一律 `requireFamily` + 软删除（`deleted_at`）
- API 路径版本号在资源名之后，例如 `/ingredients/v1`、`/families/verify/v1`
- 变更 API 时同步更新代码与相关文档

## License

Private / 自用项目。
```
