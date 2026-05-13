/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 留空则走 Vite 代理的 `/api`（见 vite.config.ts） */
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
