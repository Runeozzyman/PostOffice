import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    electron({
      main: {
        entry: {
          main: "src/main/main.ts",
          mailWorker: "src/main/mailWorker.ts",
        },
      },

      preload: {
        input: "src/preload/preload.ts",
      },
    }),
  ],
});