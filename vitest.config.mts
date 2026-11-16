import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts", "tests/components/**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["tests/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "int",
          include: ["tests/integration/**/*.test.ts", "tests/rls/**/*.test.ts"],
          environment: "node",
          setupFiles: ["tests/int-setup.ts"],
          fileParallelism: false,
          testTimeout: 30_000,
        },
      },
    ],
  },
});
