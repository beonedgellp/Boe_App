/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BEO_API_MODE: string;
  readonly VITE_BEO_API_BASE_URL: string;
  readonly VITE_BEO_APP_TARGET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
