import { defineConfig, loadEnv, mergeConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

export default defineConfig(({ command, mode }) => {
  const isDevBuild = command === "build" && mode === "development";
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine = Object.fromEntries(
    Object.entries(env).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
  );

  return mergeConfig(
    {
      server: {
        host: "::",
        port: 8080,
        watch: { awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 } },
      },
    },
    {
      define: envDefine,
      // Fixado explicitamente (Onda 3): nunca publicar mapa de fonte no build
      // de cliente, independente do default futuro do Nitro/Vite.
      build: { sourcemap: false },
      ...(isDevBuild
        ? {
            environments: {
              client: { define: { "process.env.NODE_ENV": JSON.stringify("development") } },
            },
            esbuild: { keepNames: true },
          }
        : {}),
      css: { transformer: "lightningcss" },
      resolve: {
        alias: { "@": `${process.cwd()}/src` },
        dedupe: [
          "react",
          "react-dom",
          "react/jsx-runtime",
          "react/jsx-dev-runtime",
          "@tanstack/react-query",
          "@tanstack/query-core",
        ],
      },
      optimizeDeps: {
        include: [
          "react",
          "react-dom",
          "react-dom/client",
          "react/jsx-runtime",
          "react/jsx-dev-runtime",
        ],
        ignoreOutdatedRequests: true,
      },
      plugins: [
        tailwindcss(),
        tsConfigPaths({ projects: ["./tsconfig.json"] }),
        tanstackStart({
          importProtection: {
            behavior: "error",
            // "**/server/**" cobre uma convenção de diretório; "**/*.server.ts"
            // fecha a lacuna para a convenção de sufixo de arquivo usada neste
            // projeto (achado da Onda 3 — nenhum arquivo *.server.ts existe
            // hoje, mas o guard deve barrar a reintrodução por engano).
            client: { files: ["**/server/**", "**/*.server.ts"], specifiers: ["server-only"] },
          },
          server: { entry: "server" },
        }),
        ...(command === "build"
          ? [
              nitro({
                defaultPreset: "cloudflare-module",
                // CF_WORKER_NAME permite ao workflow de deploy de produção nomear o Worker
                // explicitamente (`vipreco-production`); sem ela, o nome continua sendo o
                // gerado automaticamente pelo Nitro (comportamento de staging, inalterado).
                ...(process.env.CF_WORKER_NAME
                  ? { cloudflare: { wrangler: { name: process.env.CF_WORKER_NAME } } }
                  : {}),
              }),
            ]
          : []),
        viteReact(),
      ],
    },
  );
});
