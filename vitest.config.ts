import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage/frontend",
      reporter: ["text", "html", "json"],
      include: [
        "src/utils/resolveAvatarSource.ts",
        "src/utils/commandSanitizer.ts",
        "src/utils/policyGuards.ts",
        "src/components/ui/Button.tsx",
        "src/components/ui/Modal.tsx",
        "src/components/questions/QuestionRenderer.tsx",
        "src/components/modals/AddSectionModal.tsx",
        "src/components/modals/EditMetadataModal.tsx",
        "src/components/modals/AddQuestionModal.tsx",
        "src/services/zoomService.ts",
        "src/services/hybridAvatarService.ts",
        "src/services/tauriService.ts",
        "src/services/desktopService.ts",
      ],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/types/**",
      ],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 45,
        statements: 50,
      },
    },
  },
});
