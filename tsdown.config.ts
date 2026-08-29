import { defineConfig } from "tsdown";
export default defineConfig({
  entry: ["src/index.ts", "src/commands/*.ts"],
  outDir: "dist",
  format: "esm",
  target: "node22",
  clean: true,
  sourcemap: true,
});
