/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL of the Socket.IO server. Defaults to same origin in production. */
  readonly VITE_SERVER_URL?: string;
  /** Public source-code URL shown in the footer. */
  readonly VITE_GITHUB_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
