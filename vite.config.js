import path from "path";
import {defineConfig} from "vite";

export default defineConfig({
  root: "./test/plots",
  publicDir: path.resolve("./test"),
  resolve: {
    alias: {
      "@dave-hillier/replot": path.resolve("./src/index.ts")
    }
  },
  server: {
    port: 8008,
    open: "/"
  }
});
