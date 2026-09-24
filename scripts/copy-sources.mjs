// Copies the plain-JavaScript sources that `tsc -p tsconfig.esm.json` declines
// to emit (see issue #140).
//
// Most of the core is plain .js with a sibling hand-written .d.ts
// (src/channel.js + src/channel.d.ts, …). TypeScript treats the .d.ts as the
// authoritative module for that specifier and skips compiling the .js, so
// without this step dist/esm is full of dangling imports. The files are
// already ESM, so copying is the whole job.
//
// The companion for declarations is scripts/copy-declarations.mjs.
import {mkdir, copyFile, readdir, access} from "node:fs/promises";
import {dirname, join, relative} from "node:path";
import {fileURLToPath} from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "src");
const target = join(root, "dist", "esm");

async function* sources(dir) {
  for (const entry of await readdir(dir, {withFileTypes: true})) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* sources(path);
    else if (entry.name.endsWith(".js")) yield path;
  }
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

let copied = 0;
for await (const path of sources(source)) {
  const destination = join(target, relative(source, path));
  if (await exists(destination)) continue; // tsc emitted it; leave that alone
  await mkdir(dirname(destination), {recursive: true});
  await copyFile(path, destination);
  copied++;
}

console.log(`copy-sources: copied ${copied} JavaScript source${copied === 1 ? "" : "s"} into dist/esm`);
