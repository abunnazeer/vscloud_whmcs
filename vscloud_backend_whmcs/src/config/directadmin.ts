// src/config/directadmin.ts
export const config = {
  host: process.env.DIRECTADMIN_HOST || 'your-directadmin-server.com',
  port: parseInt(process.env.DIRECTADMIN_PORT || '2222', 10),
  username: process.env.DIRECTADMIN_USERNAME || 'admin',
  password: process.env.DIRECTADMIN_PASSWORD || 'your-password',
  useSSL: process.env.DIRECTADMIN_USE_SSL !== 'false',
};
