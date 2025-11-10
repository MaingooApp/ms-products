import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  NATS_SERVERS: string[];
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
}

const envSchema = joi
  .object<EnvVars>({
    PORT: joi.number().integer().positive().required(),
    NATS_SERVERS: joi.array().items(joi.string().uri()).min(1).required(),
    OPENAI_API_KEY: joi.string().optional(),
    OPENAI_MODEL: joi.string().optional().default('gpt-4o-mini'),
  })
  .unknown(true);

const { error, value } = envSchema.validate({
  ...process.env,
  NATS_SERVERS: process.env['NATS_SERVERS']?.split(',').map((item) => item.trim()),
});

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars = value as EnvVars;

export const envs = {
  port: envVars.PORT,
  natsServers: envVars.NATS_SERVERS,
  openAiApiKey: envVars.OPENAI_API_KEY,
  openAiModel: envVars.OPENAI_MODEL || 'gpt-4o-mini',
};
