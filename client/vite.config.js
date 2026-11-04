import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    // Vercel builds from the client folder and needs "dist" inside it.
    // Locally, Express serves the build from the project root's "dist".
    outDir: process.env.VERCEL ? "dist" : "../dist",
    emptyOutDir: true,
  },
});
