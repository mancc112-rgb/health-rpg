import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // 部署到 Vercel/Netlify 根網域用 "/"；
  // 若放在子路徑（例如 GitHub Pages 的 /repo/）再改成 "/repo/"
  base: "/",
});
