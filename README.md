# PromptCafe 前端（PromptHub Web）

本仓库为 **PromptCafe** 大模型提示词管理系统的 **网页端前端**，与后端 API 分离部署。当前阶段已搭好 **Vue 3 + TypeScript + Vite** 的最小可运行骨架，包含登录页与「我的 Prompt」首页布局，后续在此之上接入真实接口与业务模块即可。

---

## 技术架构

| 层级 | 选型 | 说明 |
|------|------|------|
| 框架 | **Vue 3**（Composition API + `<script setup>`） | 组件化 UI，与组内 PPT 中的技术方向一致。 |
| 语言 | **TypeScript** | 页面与路由为 `.vue` 内 `lang="ts"`；入口与路由表为 `.ts`。 |
| 构建 | **Vite 5** | 本地开发热更新、生产打包；默认开发端口 **5173**。 |
| 路由 | **Vue Router 4** | 单页应用（SPA）多页面切换。 |
| 样式 | **全局 CSS**（`src/style.css`） | 当前为轻量自定义样式；后续可改为 Tailwind / Element Plus / Ant Design Vue 等。 |
| 接口 | **待定** | 建议统一使用 `fetch` 或 Axios，基址来自环境变量（见下文「扩展」）。 |

**运行形态**：浏览器访问打包后的静态资源，或由 `vite dev` 提供开发服务；后端由 Django 等单独提供 REST API（与 `docs` 中设计一致）。

---

## 环境要求

- **Node.js**：建议 18 LTS 或 20 LTS 及以上  
- **包管理器**：npm（随 Node 安装）

---

## 快速开始

```bash
# 安装依赖
npm install

# 本地开发（默认 http://localhost:5173）
npm run dev

# 类型检查 + 生产构建
npm run build

# 本地预览构建结果
npm run preview
```

开发时常用地址：

- 登录页：`/login`
- 我的 Prompt 首页：`/`

---

## 仓库目录结构

```
PromptCafe_frontend/
├── docs/                      # 需求、数据库、组内 PPT 等文档（非构建输入）
├── src/
│   ├── App.vue                # 根组件，仅挂载 <RouterView />
│   ├── main.ts                # 入口：创建应用、注册路由、引入全局样式
│   ├── style.css              # 全局样式与页面级布局类名
│   ├── router/
│   │   └── index.ts           # 路由表与路由配置
│   └── pages/                 # 页面级路由组件（按 URL 拆分）
│       ├── LoginPage.vue
│       └── PromptHomePage.vue
├── index.html                 # HTML 模板（Vite 入口）
├── vite.config.ts             # Vite 配置（插件、别名等后续在此扩展）
├── tsconfig.json              # 应用与 src 的 TypeScript 配置
├── tsconfig.node.json         # 仅用于类型检查 vite.config.ts
├── package.json
└── README.md
```

**约定说明**

- **`src/pages/`**：与路由一一对应的大块页面，适合放布局与页面级状态。
- **`src/components/`**（可新建）：跨页面复用的展示组件（表格行、弹窗壳、表单字段等）。
- **`src/api/`**（可新建）：按后端模块拆分的请求函数（如 `auth.ts`、`prompts.ts`），避免在页面里散落 `fetch` URL。
- **`src/stores/`**（可新建）：若引入 Pinia，可放登录态、当前用户、全局 UI 状态等。
- **`src/composables/`**（可新建）：可复用的组合式函数（如 `useAuth()`、`useGuestSession()`）。

构建产物输出在 **`dist/`**，由 Nginx 或静态托管直接部署即可。

---

## TypeScript 与构建脚本说明

- **`tsconfig.json`**：覆盖 `src` 下 `.ts` / `.vue`，供 IDE 与 `vue-tsc --noEmit` 使用。
- **`tsconfig.node.json`**：单独对 `vite.config.ts` 做类型检查，并设置 **`noEmit: true`**，避免在根目录误生成多余的 `vite.config.js`。
- **`npm run build`**：依次执行「对 src 做类型检查」「对 Vite 配置做类型检查」「`vite build`」。类型错误时构建会失败，便于在 CI 中拦截问题。

若编辑器里个别文件仍有红线，多与「工作区使用的 tsconfig 不一致」有关；以 **`npm run build` 是否通过** 为准即可。

---

## 后续如何扩展

### 1. 新增页面与路由

1. 在 `src/pages/` 新建 `XxxPage.vue`。  
2. 在 `src/router/index.ts` 中 `createRouter` 的 `routes` 数组里增加一项，`component` 指向新页面。  
3. 需要鉴权时，可在此后增加 **路由守卫**（`beforeEach`），根据本地 token 决定跳转 `/login` 或放行。

### 2. 接入后端 API

1. 在项目根目录增加环境文件（需自行加入 `.gitignore` 若含密钥）：  
   - `.env.development`：`VITE_API_BASE_URL=http://localhost:8000`（示例）  
   - `.env.production`：生产环境基址  
2. 新建 `src/api/http.ts`：封装 `fetch` 或 Axios，统一设置 `baseURL`、`Authorization`、401 处理等。  
3. 新建 `src/api/*.ts`：按模块导出函数，例如 `login()`、`listPrompts()`。  
4. 页面中调用 API；列表类数据可后续接入 **TanStack Query（Vue Query）** 做缓存与重试（可选）。

接口路径与响应格式以组内 **OpenAPI / 接口说明** 为准（例如统一 `data` / `error.code` 等）。

### 3. UI 组件库（与架构设计对齐）

组内设计文档中提到了 **Element Plus** 或 **Ant Design Vue**，可按团队选定其一：

```bash
# 示例：Element Plus（具体以官方文档为准）
npm install element-plus
```

在 `main.ts` 中全局或按需注册后，将 `pages` 里的静态结构逐步替换为组件库表单、布局与表格。

### 4. 登录态与游客会话

- **登录态**：登录成功后保存 access token（内存或 `sessionStorage` 等策略需与安全要求一致），请求头携带 `Authorization: Bearer ...`。  
- **游客**：按后端约定携带 `guest_session_id` 等（见组内前后端约定），前端负责生成或存储会话标识并附加到请求。

### 5. 代码质量（可选）

- **ESLint + Prettier**：统一风格与基础静态检查。  
- **Vitest**：对纯函数与 composable 做单元测试。  
- **Playwright / Cypress**：对登录、核心列表做端到端冒烟（可选）。

---

## 与 `docs` 文档的关系

- **`docs/需求规格说明书.md`**、**`docs/数据库设计.md`**、**`docs/软件工程 D组 第七次整合.pptx`**：描述产品范围、表结构与接口草案；**实现以联调时生效的 API 契约为准**。  
- 前端实现功能前，建议与后端确认 **OpenAPI 或等价文档**，再同步类型与请求封装。

---

## 常见问题

**Q：为什么既有 `.ts` 又有 `.vue`？**  
`.vue` 是 Vue 规定的单文件组件格式；其中 `<script setup lang="ts">` 表示脚本使用 TypeScript。入口与路由表使用 `.ts` 即可。

**Q：开发端口不是 5173？**  
若本机 5173 已被占用，Vite 会自动尝试下一个可用端口，终端会打印实际地址。

---

## 许可证

内部课程 / 项目组使用；如需开源再补充许可证文件。
