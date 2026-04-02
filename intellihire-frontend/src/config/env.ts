interface EnvConfig {
  API_URL: string;
  APP_NAME: string;
  APP_VERSION: string;
  IS_DEVELOPMENT: boolean;
  IS_PRODUCTION: boolean;
}

export const env: EnvConfig = {
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  APP_NAME: import.meta.env.VITE_APP_NAME || 'IntelliHire',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD,
};