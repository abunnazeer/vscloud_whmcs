// src/types/environment.d.ts
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      DATABASE_URL: string;
      DATABASE_USER: string;
      DATABASE_PASSWORD: string;
      DATABASE_NAME: string;
      DATABASE_HOST: string;
      DATABASE_PORT: string;
      DATABASE_SSL: string;
      DATABASE_MAX_CONNECTIONS: string;
      DATABASE_IDLE_TIMEOUT: string;
      DATABASE_CONNECTION_TIMEOUT: string;
    }
  }
}

export {};
