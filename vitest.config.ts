import path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": path.resolve(
        import.meta.dirname,
        "src/test/server-only.ts"
      ),
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
    passWithNoTests: true,
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    env: { NEXT_PUBLIC_API_URL: "http://api.test" },
    clearMocks: true,
    unstubGlobals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/test/**",
        "src/**/*.d.ts",
        "src/shared/types/**",
        "src/shared/ui/**",
        "src/_app/providers/**",
        "src/**/index.{ts,tsx}",
        "src/features/**/config/*.tsx",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
})
