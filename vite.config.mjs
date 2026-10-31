import { defineConfig } from "vite";
import { resolve } from "node:path";

// Every public page is emitted, including the dedicated full-viewport game.
const pages = [
  "index",
  "404",
  "mundo",
  "guia",
  "novidades",
  "comunidade",
  "privacidade",
  "termos",
  "jogar",
  "laboratorio-phaser",
];
export default defineConfig({
  server: { allowedHosts: ["terminal.local"] },
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        pages.map((page) => [
          page,
          resolve(
            process.cwd(),
            ["index", "404"].includes(page)
              ? page + ".html"
              : page + "/index.html",
          ),
        ]),
      ),
    },
  },
});
