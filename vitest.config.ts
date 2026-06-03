import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    include: [
      "packages/shared/**/*.test.ts",
      "apps/api/**/*.test.ts",
      "apps/overlay/**/*.test.ts",
      "apps/web/**/*.test.ts"
    ]
  }
});
