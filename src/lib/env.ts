import type { JSONSchemaType } from "env-schema";
import envSchema from "env-schema";

interface Env {
  DISCORD_TOKEN: string;
  MONGO_URI: string;
  CLIENT_ID: string;

  EMAIL_USER: string;
  EMAIL_PASS: string;

  VERIFIED_ROLE_ID: string;
  VERIFY_GUILD_ID: string;
  UNVERIFIED_ROLE_ID: string;
}

const schema: JSONSchemaType<Env> = {
  type: "object",
  properties: {
    DISCORD_TOKEN: { type: "string" },
    MONGO_URI: { type: "string" },
    CLIENT_ID: { type: "string" },

    EMAIL_USER: { type: "string" },
    EMAIL_PASS: { type: "string" },

    VERIFIED_ROLE_ID: { type: "string" },
    VERIFY_GUILD_ID: { type: "string" },
    UNVERIFIED_ROLE_ID: { type: "string" },
  },
  required: [
    "DISCORD_TOKEN",
    "MONGO_URI",
    "CLIENT_ID",
    "EMAIL_USER",
    "EMAIL_PASS",
    "VERIFIED_ROLE_ID",
    "VERIFY_GUILD_ID",
    "UNVERIFIED_ROLE_ID",
  ],
  additionalProperties: false,
};

export const env = envSchema<Env>({
  schema,
  dotenv: true,
});
