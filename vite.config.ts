import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget =
    env.VITE_API_PROXY_TARGET || env.VITE_API_URL || env.VITE_API_BASE_URL;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("/scheduler/")
            ) {
              return "react-vendor";
            }
            if (id.includes("/react-router")) return "router-vendor";
            if (id.includes("/@tanstack/")) return "tanstack-vendor";
            if (id.includes("/recharts/")) return "recharts-vendor";
            if (id.includes("/@supabase/")) return "supabase-vendor";
            if (
              id.includes("/@radix-ui/") ||
              id.includes("/@base-ui/") ||
              id.includes("/@tabler/icons-react/") ||
              id.includes("/lucide-react/")
            ) {
              return "ui-vendor";
            }
            return "vendor";
          },
        },
      },
    },
    server: {
      host: true,
      proxy: apiProxyTarget
        ? {
            "/api": {
              target: apiProxyTarget,
              changeOrigin: true,
              secure: true,
              rewrite: (pathValue) => pathValue.replace(/^\/api/, ""),
            },
          }
        : undefined,
    },
  };
});
