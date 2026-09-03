// Compares Replot's rendered test output against Observable Plot's for the
// same test plots, and reports what differs.
//
// Both libraries assert their own snapshot suites against committed outputs,
// so those outputs are what each library produces at its current commit:
// Replot's in test/output (refresh with `yarn test:mocha`; adopt any
// *-changed files it writes), upstream's in the sibling checkout's
// test/output. This script canonicalises both sides — attribute order,
// generated ids and class names, numeric precision, whitespace — so that
// only real structural and attribute differences remain, then summarises
// them per plot by element tag and attribute name.
//
//   yarn parity                       summary of every plot
//   yarn parity --filter tip          plots whose name contains "tip"
//   yarn parity --show tipDotFacets   unified diff of one plot's canonical form
//   yarn parity --upstream ../plot    upstream checkout (default ../observablehq-plot)
//   yarn parity --allow parity-allow.json --fail
//                                     exit 1 if any plot not listed in the
//                                     allow file (a JSON array of names) differs

import {execFileSync} from "node:child_process";
import {promises as fs} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {JSDOM} from "jsdom";

interface Options {
  upstream: string;
  filter?: string;
  show?: string;
  allow?: string;
  fail: boolean;
}

interface Comparison {
  name: string;
  status: "identical" | "differs" | "missing-upstream" | "missing-replot";
  added: number;
  removed: number;
  tagDeltas: Map<string, number>;
  attrDeltas: Map<string, number>;
}

function parseArgs(argv: string[]): Options {
  const options: Options = {upstream: path.resolve("../observablehq-plot"), fail: false};
  for (let i = 0; i < argv.length; ++i) {
    const a = argv[i];
    if (a === "--upstream") options.upstream = path.resolve(argv[++i]);
    else if (a === "--filter") options.filter = argv[++i];
    else if (a === "--show") options.show = argv[++i];
    else if (a === "--allow") options.allow = argv[++i];
    else if (a === "--fail") options.fail = true;
    else throw new Error(`unknown argument: ${a}`);
  }
  return options;
}

// --- canonical form ---------------------------------------------------------

// A canonical line per element: indentation by depth, tag, then sorted
// attributes. Text content becomes its own line. The result is stable under
// attribute reordering, id renumbering, and serialisation whitespace.
function canonicalize(markup: string): string[] {
  const dom = new JSDOM(markup);
  const root = dom.window.document.body;
  const idMap = canonicalIds(root);
  const lines: string[] = [];
  for (const child of root.childNodes) walk(child, 0, lines, idMap);
  return lines;
}

function walk(node: Node, depth: number, lines: string[], idMap: Map<string, string>): void {
  const indent = "  ".repeat(depth);
  if (node.nodeType === 3) {
    const text = normalizeText(node.textContent ?? "");
    if (text) lines.push(`${indent}"${text}"`);
    return;
  }
  if (node.nodeType !== 1) return;
  const el = node as Element;
  const attrs = [...el.attributes]
    .map((a) => [a.name.toLowerCase(), normalizeAttr(a.name, a.value, idMap)] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}="${v}"`);
  lines.push(`${indent}<${el.tagName.toLowerCase()}${attrs.length ? " " + attrs.join(" ") : ""}>`);
  for (const child of el.childNodes) walk(child, depth + 1, lines, idMap);
}

// Both libraries generate ids for markers, clip paths, patterns, and (Replot
// only) React's useId. Map each id to a name derived from the element it
// labels, so a reference resolves the same way on both sides regardless of
// numbering, and identical definitions collapse to the same name.
function canonicalIds(root: Element): Map<string, string> {
  const map = new Map<string, string>();
  const seen = new Map<string, number>();
  for (const el of root.querySelectorAll("[id]")) {
    const id = el.getAttribute("id")!;
    const signature = `${el.tagName.toLowerCase()}|${[...el.attributes]
      .filter((a) => a.name !== "id")
      .map((a) => `${a.name}=${normalizeAttr(a.name, a.value, new Map())}`)
      .sort()
      .join("|")}|${normalizeText(el.textContent ?? "")}`;
    const n = (seen.get(signature) ?? 0) + 1;
    seen.set(signature, n);
    map.set(id, `${el.tagName.toLowerCase()}-${hash(signature)}${n > 1 ? `-${n}` : ""}`);
  }
  return map;
}

function normalizeAttr(name: string, value: string, idMap: Map<string, string>): string {
  let v = value;
  if (name === "id") return idMap.get(v) ?? v;
  // url(#id) and href="#id" references
  v = v.replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${idMap.get(id) ?? id})`);
  if ((name === "href" || name === "xlink:href") && v.startsWith("#")) v = `#${idMap.get(v.slice(1)) ?? v.slice(1)}`;
  // generated class names: upstream plot-xxxxxx, Replot replot-xxxxxx
  v = v.replace(/\b(re)?plot-[a-z0-9]{6}\b/g, "PLOT-CLASS");
  // React's useId leaks into ids in a few places
  v = v.replace(/[:_]r[:_][0-9a-z]+[:_]/g, "REACT-ID");
  // canvas output differs by architecture; the harness compares pixels instead
  v = v.replace(/data:image\/png;base64,[A-Za-z0-9+/=]+/g, "data:image/png;base64,…");
  // numeric precision, matching test/plot.js
  v = v.replace(/-?\d+\.\d{4,}/g, (d) => String(+(+d).toFixed(3)));
  // -0 and 0 are the same coordinate
  v = v.replace(/(^|[^\d.])-0(?![.\d])/g, "$10");
  if (name === "style") v = normalizeStyle(v);
  return v;
}

function normalizeStyle(value: string): string {
  return value
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => d.replace(/\s*:\s*/, ":"))
    .sort()
    .join(";");
}

function normalizeText(text: string): string {
  return text
    .replace(/\b(re)?plot-[a-z0-9]{6}\b/g, "PLOT-CLASS")
    .replace(/-?\d+\.\d{4,}/g, (d) => String(+(+d).toFixed(3)))
    .replace(/\s+/g, " ")
    .trim();
}

function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; ++i) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

// --- comparison -------------------------------------------------------------

// Multiset difference of canonical lines. Ordering differences (the same
// elements in a different order) therefore don't count; only elements or
// attributes present on one side and not the other do. That is the question
// the report answers; `--show` gives the ordered unified diff for one plot.
function compare(name: string, replot: string[] | null, upstream: string[] | null): Comparison {
  const tagDeltas = new Map<string, number>();
  const attrDeltas = new Map<string, number>();
  if (!upstream) return {name, status: "missing-upstream", added: 0, removed: 0, tagDeltas, attrDeltas};
  if (!replot) return {name, status: "missing-replot", added: 0, removed: 0, tagDeltas, attrDeltas};
  // Indentation is dropped here so that one extra wrapper element counts as
  // one difference, not as every descendant it re-indents.
  const counts = new Map<string, number>();
  for (const line of upstream) counts.set(line.trimStart(), (counts.get(line.trimStart()) ?? 0) - 1);
  for (const line of replot) counts.set(line.trimStart(), (counts.get(line.trimStart()) ?? 0) + 1);
  let added = 0;
  let removed = 0;
  for (const [line, n] of counts) {
    if (n === 0) continue;
    if (n > 0) added += n;
    else removed -= n;
    const m = /^<([a-z0-9:-]+)((?: [a-z0-9:-]+="[^"]*")*)>$/.exec(line);
    if (!m) {
      tagDeltas.set("(text)", (tagDeltas.get("(text)") ?? 0) + n);
      continue;
    }
    tagDeltas.set(m[1], (tagDeltas.get(m[1]) ?? 0) + n);
    for (const attr of m[2].matchAll(/ ([a-z0-9:-]+)="/g)) {
      const key = `${m[1]}[${attr[1]}]`;
      attrDeltas.set(key, (attrDeltas.get(key) ?? 0) + n);
    }
  }
  return {name, status: added || removed ? "differs" : "identical", added, removed, tagDeltas, attrDeltas};
}

// The element-tag deltas that survive after cancelling: a tag that is added
// N times and removed N times differs only in attributes, so what remains
// is the attribute-name delta for that tag. Reported as e.g. "title +3107",
// "path[href] +94", "g −7".
function describe(c: Comparison): string {
  const parts: string[] = [];
  const attrOnly = new Set<string>();
  for (const [tag, n] of [...c.tagDeltas].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))) {
    if (n !== 0) parts.push(`${tag} ${signed(n)}`);
    else attrOnly.add(tag);
  }
  for (const [key, n] of [...c.attrDeltas].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))) {
    if (n === 0) continue;
    const tag = key.slice(0, key.indexOf("["));
    if (!attrOnly.has(tag) && c.tagDeltas.get(tag) !== 0) continue;
    parts.push(`${key} ${signed(n)}`);
  }
  return parts.slice(0, 6).join(", ") + (parts.length > 6 ? ", …" : "");
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : `−${-n}`;
}

// --- main -------------------------------------------------------------------

async function readOutputs(dir: string): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch {
    return files;
  }
  for (const f of names) {
    if (!/\.(svg|html)$/.test(f) || f.includes("-changed")) continue;
    files.set(path.parse(f).name, path.join(dir, f));
  }
  return files;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const replotDir = path.resolve("test/output");
  const upstreamDir = path.join(options.upstream, "test/output");
  const replot = await readOutputs(replotDir);
  const upstream = await readOutputs(upstreamDir);
  if (upstream.size === 0) {
    console.error(`No upstream outputs found in ${upstreamDir}; pass --upstream <observablehq-plot checkout>.`);
    process.exit(2);
  }

  if (options.show) {
    const name = options.show;
    if (!replot.has(name)) throw new Error(`no Replot output named ${name}`);
    if (!upstream.has(name)) throw new Error(`no upstream output named ${name}`);
    const a = canonicalize(await fs.readFile(upstream.get(name)!, "utf8"));
    const b = canonicalize(await fs.readFile(replot.get(name)!, "utf8"));
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "parity-"));
    await fs.writeFile(path.join(tmp, "upstream"), a.join("\n") + "\n");
    await fs.writeFile(path.join(tmp, "replot"), b.join("\n") + "\n");
    try {
      execFileSync("diff", ["-u", path.join(tmp, "upstream"), path.join(tmp, "replot")], {stdio: "inherit"});
    } catch {
      // diff exits 1 when the files differ; that's the point
    }
    return;
  }

  const allow = new Set<string>(options.allow ? JSON.parse(await fs.readFile(options.allow, "utf8")) : []);
  const names = new Set([...replot.keys(), ...upstream.keys()]);
  const results: Comparison[] = [];
  for (const name of [...names].sort()) {
    if (options.filter && !name.includes(options.filter)) continue;
    const a = upstream.has(name) ? canonicalize(await fs.readFile(upstream.get(name)!, "utf8")) : null;
    const b = replot.has(name) ? canonicalize(await fs.readFile(replot.get(name)!, "utf8")) : null;
    const result = compare(name, b, a);
    // The two suites may write the same plot with different extensions (a
    // bare <svg> versus a <figure> wrapper); that's a root-element difference
    // worth naming rather than hiding in the tag deltas.
    if (a && b && path.extname(upstream.get(name)!) !== path.extname(replot.get(name)!)) {
      result.status = "differs";
      result.tagDeltas.set(`(root ${path.extname(upstream.get(name)!)} → ${path.extname(replot.get(name)!)})`, 1);
    }
    results.push(result);
  }

  const differing = results
    .filter((r) => r.status === "differs")
    .sort((a, b) => b.added + b.removed - (a.added + a.removed));
  const identical = results.filter((r) => r.status === "identical");
  const missingUpstream = results.filter((r) => r.status === "missing-upstream");
  const missingReplot = results.filter((r) => r.status === "missing-replot");

  const nameWidth = Math.max(4, ...differing.map((r) => r.name.length));
  console.log(
    `${"plot".padEnd(nameWidth)}  ${"+".padStart(6)} ${"−".padStart(
      6
    )}  allowed  differences (Replot relative to upstream)`
  );
  for (const r of differing) {
    const flag = allow.has(r.name) ? "yes" : "";
    console.log(
      `${r.name.padEnd(nameWidth)}  ${String(r.added).padStart(6)} ${String(r.removed).padStart(6)}  ${flag.padEnd(
        7
      )}  ${describe(r)}`
    );
  }
  console.log();
  console.log(
    `compared ${identical.length + differing.length}: ${identical.length} identical, ${differing.length} differ`
  );
  if (missingUpstream.length)
    console.log(`only in Replot (${missingUpstream.length}): ${missingUpstream.map((r) => r.name).join(", ")}`);
  if (missingReplot.length)
    console.log(`only upstream (${missingReplot.length}): ${missingReplot.map((r) => r.name).join(", ")}`);

  const causes = new Map<string, number>();
  for (const r of differing) {
    for (const [tag, n] of r.tagDeltas) if (n !== 0) causes.set(tag, (causes.get(tag) ?? 0) + 1);
    for (const [key, n] of r.attrDeltas) if (n !== 0) causes.set(key, (causes.get(key) ?? 0) + 1);
  }
  const top = [...causes].sort((a, b) => b[1] - a[1]).slice(0, 12);
  if (top.length) {
    console.log();
    console.log("most common differences (number of plots affected):");
    for (const [key, n] of top) console.log(`  ${String(n).padStart(4)}  ${key}`);
  }

  if (options.fail) {
    const unexpected = differing.filter((r) => !allow.has(r.name));
    if (unexpected.length) {
      console.error(`\n${unexpected.length} plot(s) differ from upstream and are not in the allow list.`);
      process.exit(1);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
