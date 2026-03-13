import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
  host: "0.0.0.0",
  port: 8080,
  strictPort: true,
  hmr: {
    host: "192.168.1.9",
    port: 8080,
    protocol: "ws",
    overlay: false,
  },
},
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
