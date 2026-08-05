import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    // R3.1 — `.test.tsx` entra na lista para que as primitivas visuais possam ser
    // RENDERIZADAS de verdade, com `renderToStaticMarkup`, em vez de verificadas por
    // leitura do próprio código-fonte.
    //
    // A diferença importa: um teste que procura a string `aria-label` no arquivo prova
    // que alguém escreveu `aria-label`. Um teste que renderiza prova que o atributo chega
    // ao HTML — que é a única coisa que o leitor de tela vê. `environment: "node"`
    // continua servindo, porque `react-dom/server` não precisa de DOM.
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "scripts/**/*.test.ts",
      "supabase/**/*.test.ts",
    ],
  },
});
