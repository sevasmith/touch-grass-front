import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    environment: "happy-dom",
    passWithNoTests: true,
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    clearMocks: true,
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
        "src/shared/components/ui/**",
        "src/_app/**",
        "src/**/index.{ts,tsx}",
        "src/entities/**",
        "src/shared/lib/apollo/**",
        "src/shared/providers/**",
        "src/features/**/providers/**",
        "src/features/**/config/*.tsx",
        "src/features/skills/hooks/user-skills/use-add-user-skill.ts",
        "src/features/skills/hooks/user-skills/use-update-user-skill.ts",
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
