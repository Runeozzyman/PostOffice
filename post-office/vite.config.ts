import fs from "node:fs";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";
import tailwindcss from "@tailwindcss/vite";

function googleOAuthDefine(mode: string) {
  const env = loadEnv(mode, process.cwd(), "");
  let clientId = env.GOOGLE_CLIENT_ID ?? "";
  let clientSecret = env.GOOGLE_CLIENT_SECRET ?? "";

  if (!clientId || !clientSecret) {
    const credentialsFile = path.join(process.cwd(), "credentials.json");

    if (fs.existsSync(credentialsFile)) {
      const parsed = JSON.parse(fs.readFileSync(credentialsFile, "utf8")) as {
        installed?: { client_id?: string; client_secret?: string };
        web?: { client_id?: string; client_secret?: string };
      };
      const installed = parsed.installed ?? parsed.web;
      clientId = installed?.client_id ?? "";
      clientSecret = installed?.client_secret ?? "";
    }
  }

  return {
    __GOOGLE_CLIENT_ID__: JSON.stringify(clientId),
    __GOOGLE_CLIENT_SECRET__: JSON.stringify(clientSecret),
  };
}

export default defineConfig(({ mode }) => {
  const oauthDefine = googleOAuthDefine(mode);

  return {
    plugins: [
      react(),
      tailwindcss(),
      electron({
        main: {
          entry: {
            main: "src/main/main.ts",
            mailWorker: "src/main/mailWorker.ts",
          },
          vite: {
            define: oauthDefine,
          },
        },
        preload: {
          input: "src/preload/preload.ts",
        },
      }),
    ],
  };
});
