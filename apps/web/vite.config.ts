import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Foundry Command Deck (apps/web). Pure client app; runs entirely on local mock
// data by default. When the API is running it proxies /demo/* to it so the deck
// can optionally hydrate from the dev-safe demo routes (auth boundary untouched).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/demo": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
