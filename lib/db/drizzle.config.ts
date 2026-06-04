import { defineConfig } from "drizzle-kit";
import path from "path";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://localhost/placeholder_for_generate_only";

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  out: "./migrations",
  dbCredentials: {
    url: databaseUrl,
  },
});
