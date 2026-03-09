import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.string().default('info'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  env: parsedEnv.data.NODE_ENV,
  port: parseInt(parsedEnv.data.PORT, 10),
  host: parsedEnv.data.HOST,
  database: {
    url: parsedEnv.data.DATABASE_URL,
  },
  jwt: {
    secret: parsedEnv.data.JWT_SECRET,
    expiresIn: parsedEnv.data.JWT_EXPIRES_IN,
  },
  cors: {
    origin: parsedEnv.data.CORS_ORIGIN,
  },
  logging: {
    level: parsedEnv.data.LOG_LEVEL,
  },
};
