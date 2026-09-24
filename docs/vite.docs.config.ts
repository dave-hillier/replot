import {defineConfig, type Plugin} from "vite";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import rehypeShiki from "@shikijs/rehype";
import remarkPlotSource from "./plugins/remark-plot-source.js";
import remarkHeadingIds from "./plugins/remark-heading-ids.js";
import path from "node:path";
import fs from "node:fs";

// GitHub Pages serves the site under /replot/; the deploy workflow sets
// DOCS_BASE accordingly. Local dev and preview use the root.
const base = process.env.DOCS_BASE ?? "/";

// GitHub Pages has no history fallback, so deep links (e.g. /replot/marks/dot)
// 404 server-side. Serving the SPA shell as the 404 page lets the router take
// over; asset URLs are absolute under the base, so they resolve regardless of
// the requested path.
function spa404Fallback(): Plugin {
  return {
    name: "spa-404-fallback",
    closeBundle() {
      const out = path.resolve(__dirname, "../dist-docs");
      const index = path.join(out, "index.html");
      if (fs.existsSync(index)) fs.copyFileSync(index, path.join(out, "404.html"));
    }
  };
}

export default defineConfig({
  root: path.resolve(__dirname),
  base,
  publicDir: path.resolve(__dirname, "public"),
  plugins: [
    {
      enforce: "pre",
      ...mdx({
        providerImportSource: "@mdx-js/react",
        remarkPlugins: [remarkGfm, remarkFrontmatter, remarkPlotSource, remarkHeadingIds],
        // Highlight fenced code at build time with the same themes VitePress
        // uses upstream; the dark palette switches via CSS variables.
        rehypePlugins: [[rehypeShiki, {themes: {light: "github-light", dark: "github-dark"}, addLanguageClass: true}]]
      })
    },
    react({include: /\.(mdx|js|jsx|ts|tsx)$/}),
    spa404Fallback()
  ],
  resolve: {
    alias: {
      "@dave-hillier/replot/react": path.resolve(__dirname, "../src/react/api.tsx"),
      "@dave-hillier/replot": path.resolve(__dirname, "../src/index.js")
    },
    dedupe: ["react", "react-dom"]
  },
  optimizeDeps: {
    exclude: ["fsevents"]
  },
  server: {
    port: 3000
  },
  build: {
    outDir: path.resolve(__dirname, "../dist-docs"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/react") || id.includes("/node_modules/scheduler")) return "react-vendor";
          if (id.includes("/node_modules/d3") || id.includes("/node_modules/internmap")) return "d3-vendor";
        }
      }
    }
  }
});
