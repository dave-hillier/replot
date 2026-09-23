// Pack-and-install smoke test.
//
// Packs the package the way `npm publish` does, installs the tarball into a
// throwaway project, and checks that a consumer can reach both entry points:
// through a bundler, through TypeScript's resolver, and through the UMD bundle
// in plain Node. Nothing in the repo's own test suite exercises the package as
// a consumer would, so an entry point that no longer resolves only shows up
// here. Run it with `yarn test:smoke`.

import {execFileSync} from "node:child_process";
import {existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const meta = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const name = meta.name;
const windows = process.platform === "win32";
const cli = (command) => (windows ? `${command}.cmd` : command);
const tool = (command) => path.join(root, "node_modules", ".bin", windows ? `${command}.cmd` : command);
const work = mkdtempSync(path.join(os.tmpdir(), "replot-smoke-"));
const consumer = path.join(work, "consumer");

// Exports a consumer is expected to reach through each entry point. The names
// are the documented ones: `plot` for the imperative API, `Plot` and the mark
// components for the React one.
const expected = {
  plot: "function",
  Density: "function",
  bin: "function",
  rectY: "function",
  Plot: "function",
  Replot: "function",
  Dot: "function",
  Line: "function"
};

function run(file, args, {cwd = consumer} = {}) {
  try {
    return execFileSync(file, args, {cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]});
  } catch (error) {
    throw new Error([`${file} ${args.join(" ")} failed`, error.stdout, error.stderr].filter(Boolean).join("\n"));
  }
}

function write(file, contents) {
  writeFileSync(path.join(consumer, file), contents);
}

function check(description, body) {
  body();
  console.log(`ok ${description}`);
}

// Every path the package points a resolver at, so a stale or renamed file is
// caught before a consumer finds it.
function declaredPaths(value) {
  if (typeof value === "string") return [value];
  if (value && typeof value === "object") return Object.values(value).flatMap(declaredPaths);
  return [];
}

function main() {
  console.log("Building the published artifacts (yarn run prepublishOnly)");
  run(cli("yarn"), ["run", "prepublishOnly"], {cwd: root});

  console.log(`Packing ${name} (npm pack)`);
  run(cli("npm"), ["pack", "--pack-destination", work], {cwd: root});
  const tarball = path.join(
    work,
    readdirSync(work).find((file) => file.endsWith(".tgz"))
  );

  mkdirSync(consumer);
  write(
    "package.json",
    JSON.stringify({name: "replot-smoke-consumer", version: "0.0.0", private: true, type: "module"}, null, 2)
  );

  console.log(`Installing ${path.basename(tarball)} into a throwaway project`);
  run(cli("npm"), ["install", "--no-audit", "--no-fund", tarball, "react", "react-dom"]);
  run(cli("npm"), ["install", "--no-audit", "--no-fund", "--save-dev", "@types/react", "@types/react-dom"]);

  const installed = path.join(consumer, "node_modules", name);
  const installedMeta = JSON.parse(readFileSync(path.join(installed, "package.json"), "utf8"));

  write(
    "app.tsx",
    `import {plot, Density, bin, rectY} from "${name}";
import {Plot, Replot, Dot, Line} from "${name}/react";

const api: Record<string, unknown> = {plot, Density, bin, rectY, Plot, Replot, Dot, Line};

console.log("SMOKE_EXPORTS " + JSON.stringify(Object.fromEntries(Object.entries(api).map(([k, v]) => [k, typeof v]))));
`
  );

  // Reflects the package's own tsconfig: the published declaration entries
  // re-export the TypeScript sources, so a strict consumer type-checks the
  // package's internals and reports their diagnostics. This leg is about the
  // entries resolving and being usable, which is what a rename breaks.
  write(
    "tsconfig.json",
    JSON.stringify(
      {
        compilerOptions: {
          strict: false,
          noEmit: true,
          module: "node16",
          moduleResolution: "node16",
          target: "es2022",
          jsx: "react-jsx",
          skipLibCheck: true,
          types: []
        },
        files: ["app.tsx"]
      },
      null,
      2
    )
  );

  write(
    "umd.mjs",
    `import {pathToFileURL} from "node:url";

// The UMD bundle is built for a page that loads d3 first, so give it the same
// global before importing it, as a <script src> consumer would.
globalThis.d3 = await import("d3");
await import(pathToFileURL(${JSON.stringify(path.join(installed, installedMeta.unpkg))}).href);
console.log("SMOKE_UMD " + typeof globalThis.Replot?.plot);

// Importing the bundle leaves React's scheduler pending, so the process would
// otherwise never exit.
process.exit(0);
`
  );

  check("every declared entry point exists in the tarball", () => {
    const declared = [
      installedMeta.main,
      installedMeta.module,
      installedMeta.types,
      installedMeta.unpkg,
      installedMeta.jsdelivr,
      ...declaredPaths(installedMeta.exports)
    ].filter(Boolean);
    const missing = [...new Set(declared)].filter((target) => !existsSync(path.join(installed, target)));
    if (missing.length) throw new Error(`declared but not in the tarball: ${missing.join(", ")}`);
  });

  check("a bundler imports both entry points and the bundle runs", () => {
    run(tool("esbuild"), ["app.tsx", "--bundle", "--outfile=app.cjs", "--platform=node", "--format=cjs"]);
    const output = run(process.execPath, ["app.cjs"]);
    const line = output.split("\n").find((text) => text.startsWith("SMOKE_EXPORTS "));
    if (!line) throw new Error(`the bundle reported no exports:\n${output}`);
    const actual = JSON.parse(line.slice("SMOKE_EXPORTS ".length));
    for (const [key, type] of Object.entries(expected)) {
      if (actual[key] !== type) throw new Error(`expected ${key} to be a ${type}, got ${actual[key]}`);
    }
  });

  check("a TypeScript consumer type-checks both entry points", () => {
    run(tool("tsc"), ["-p", "tsconfig.json"]);
  });

  check("the UMD bundle loads in plain Node", () => {
    const output = run(process.execPath, ["umd.mjs"]);
    if (!output.includes("SMOKE_UMD function")) throw new Error(`the UMD bundle did not expose plot:\n${output}`);
  });
}

let failed = false;
try {
  main();
  console.log(`\n${name} packs, installs and imports cleanly.`);
} catch (error) {
  failed = true;
  console.error(`\nFAILED: ${error.message}`);
} finally {
  if (process.env.REPLOT_SMOKE_KEEP) console.error(`kept ${work}`);
  else rmSync(work, {recursive: true, force: true});
}

process.exit(failed ? 1 : 0);
