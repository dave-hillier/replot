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
//                                     exit 1 if any plot differs in a way the
//                                     allow file doesn't already record
//   yarn parity --allow parity-allow.json --update
//                                     rewrite the allow file from this run
//
// The allow file records, per plot, the divergence that plot is allowed to
// have, so that a *new* difference inside an already-allowed plot changes the
// record and fails:
//
//   {
//     "tipDispatch": {
//       "differs": "g −1, path −1, text −1, tspan −1, (text) −1",
//       "note": "upstream's snapshot is hovered; the snapshot harness cannot hover"
//     },
//     "rasterVaporP3": {"onlyUpstream": "node-canvas drops oklch fills (#164)"}
//   }
//
// {"differs": "…"} is the same summary the report prints for that plot, so
// anything that changes it has to be reviewed. Its optional "note" is for a
// human: the cause where it is known, in a sentence. {"onlyUpstream": "…"} and
// {"onlyReplot": "…"} record a plot present on only one side, together with
// the reason it is absent from the other. An entry for a plot that no longer
// diverges is stale and fails too, so fixed divergences leave the list.
//
// When the list is legitimately out of date, run --update and review the diff
// it produces: it rewrites signatures but keeps existing notes, and never
// invents reasons, so a plot that newly goes missing on one side (and any note
// you want on a newly recorded difference) has to be written by hand first.

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
  update: boolean;
}

// What a plot is allowed to do, keyed by what the two sides have for it.
// A plot that renders on both sides but differs records its signature, which
// the script can generate and check; a plot missing from one side records the
// reason, which is why the reason is a string a person writes rather than a
// count the script can generate. A signature may carry a note, for a cause the
// script cannot know: prose, written by hand, that --update preserves.
type AllowEntry = {differs: string; note?: string} | {onlyUpstream: string} | {onlyReplot: string};

interface Comparison {
  name: string;
  status: "identical" | "differs" | "missing-upstream" | "missing-replot";
  added: number;
  removed: number;
  // Every difference the pair of files has, at the level that distinguishes it:
  // an element count by tag, an attribute count by tag and attribute name, a
  // text node by its words, or the number of different values an attribute
  // takes where the elements and attributes themselves both cancel out.
  tagDeltas: Map<string, number>;
  attrDeltas: Map<string, number>;
  textDeltas: Map<string, number>;
  attrValueDeltas: Map<string, number>;
}

function parseArgs(argv: string[]): Options {
  const options: Options = {upstream: path.resolve("../observablehq-plot"), fail: false, update: false};
  for (let i = 0; i < argv.length; ++i) {
    const a = argv[i];
    if (a === "--upstream") options.upstream = path.resolve(argv[++i]);
    else if (a === "--filter") options.filter = argv[++i];
    else if (a === "--show") options.show = argv[++i];
    else if (a === "--allow") options.allow = argv[++i];
    else if (a === "--fail") options.fail = true;
    else if (a === "--update") options.update = true;
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

const elementRe = /^<([a-z0-9:-]+)((?: [a-z0-9:-]+="[^"]*")*)>$/;
const attributeRe = / ([a-z0-9:-]+)="([^"]*)"/g;

function bump(map: Map<string, number>, key: string, n: number): void {
  map.set(key, (map.get(key) ?? 0) + n);
}

// Multiset difference of canonical lines. Ordering differences (the same
// elements in a different order) therefore don't count; only elements or
// attributes present on one side and not the other do. That is the question
// the report answers; `--show` gives the ordered unified diff for one plot.
//
// Lines are counted twice: once whole, which is what tells an added element
// from a removed one, and once per attribute value and per text node, which is
// what tells a moved path from a reworded label. The second reading only
// surfaces where the first cancels to nothing, so it never repeats a
// difference already named above it.
function compare(name: string, replot: string[] | null, upstream: string[] | null): Comparison {
  const tagDeltas = new Map<string, number>();
  const attrDeltas = new Map<string, number>();
  const textDeltas = new Map<string, number>();
  const attrValueDeltas = new Map<string, number>();
  if (!upstream)
    return {name, status: "missing-upstream", added: 0, removed: 0, tagDeltas, attrDeltas, textDeltas, attrValueDeltas};
  if (!replot)
    return {name, status: "missing-replot", added: 0, removed: 0, tagDeltas, attrDeltas, textDeltas, attrValueDeltas};
  // Indentation is dropped here so that one extra wrapper element counts as
  // one difference, not as every descendant it re-indents.
  const counts = new Map<string, number>();
  const values = new Map<string, Map<string, number>>();
  for (const [lines, sign] of [
    [upstream, -1],
    [replot, 1]
  ] as const) {
    for (const line of lines) {
      const text = line.trimStart();
      bump(counts, text, sign);
      const m = elementRe.exec(text);
      if (!m) {
        bump(collect(values, "(text)"), text, sign);
        continue;
      }
      for (const attr of m[2].matchAll(attributeRe)) bump(collect(values, `${m[1]}[${attr[1]}]`), attr[2], sign);
    }
  }
  let added = 0;
  let removed = 0;
  for (const [line, n] of counts) {
    if (n === 0) continue;
    if (n > 0) added += n;
    else removed -= n;
    const m = elementRe.exec(line);
    if (!m) {
      bump(tagDeltas, "(text)", n);
      continue;
    }
    bump(tagDeltas, m[1], n);
    for (const attr of m[2].matchAll(attributeRe)) bump(attrDeltas, `${m[1]}[${attr[1]}]`, n);
  }
  // What the counts above cancel out. A tag that appears the same number of
  // times on both sides but carries different attributes is that tag's
  // difference, so nothing below it is reported either.
  const cancelled = new Set([...tagDeltas].filter(([, n]) => n === 0).map(([tag]) => tag));
  for (const [key, multiset] of values) {
    const bracket = key.indexOf("[");
    if (!cancelled.has(bracket < 0 ? key : key.slice(0, bracket))) continue;
    if (bracket < 0) {
      // Text: the words are the difference, and they are short enough to quote.
      for (const [content, n] of multiset) if (n !== 0) bump(textDeltas, content, n);
    } else {
      // Attributes: path data and embedded media run to thousands of
      // characters, so the count of values that differ is recorded and
      // `--show` is where the values themselves are read.
      if (attrDeltas.get(key)) continue;
      let count = 0;
      for (const n of multiset.values()) if (n !== 0) ++count;
      if (count) attrValueDeltas.set(key, count);
    }
  }
  return {
    name,
    status: added || removed ? "differs" : "identical",
    added,
    removed,
    tagDeltas,
    attrDeltas,
    textDeltas,
    attrValueDeltas
  };
}

function collect(map: Map<string, Map<string, number>>, key: string): Map<string, number> {
  let inner = map.get(key);
  if (inner === undefined) map.set(key, (inner = new Map()));
  return inner;
}

// The element-tag deltas that survive after cancelling: a tag that is added
// N times and removed N times differs only in attributes, so what remains
// is the attribute-name delta for that tag. Reported as e.g. "title +3107",
// "path[href] +94", "g −7".
//
// This is the whole summary, never truncated, because it doubles as the
// record the allow file keeps and has to distinguish any two states of a
// plot's output. The order is by magnitude and then by insertion, which is
// fixed by the (unordered) multiset difference above, so the same pair of
// files always yields the same string.
function signature(c: Comparison): string {
  const parts: string[] = [];
  const cancelled = new Set<string>();
  for (const [tag, n] of byMagnitude(c.tagDeltas)) {
    if (n !== 0) parts.push(`${tag} ${signed(n)}`);
    else cancelled.add(tag);
  }
  for (const [key, n] of byMagnitude(c.attrDeltas)) {
    if (n === 0 || !cancelled.has(key.slice(0, key.indexOf("[")))) continue;
    parts.push(`${key} ${signed(n)}`);
  }
  for (const [text, n] of byMagnitude(c.textDeltas)) parts.push(`${text} ${signed(n)}`);
  for (const [key, n] of byMagnitude(c.attrValueDeltas)) parts.push(`${key} ${n} ${n === 1 ? "value" : "values"}`);
  return parts.join(", ");
}

function byMagnitude(deltas: Map<string, number>): [string, number][] {
  return [...deltas].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
}

// --- allow list -------------------------------------------------------------

// The allow file's shape is checked rather than trusted: a hand-edited file
// that loses a key would otherwise silently allow everything.
function parseAllow(text: string, file: string): Map<string, AllowEntry> {
  const parsed: unknown = JSON.parse(text);
  if (Array.isArray(parsed)) {
    throw new Error(
      `${file} is the old format (an array of plot names); it now maps each plot to the divergence it is allowed, e.g. {"tipDispatch": {"differs": "g −1, path −1"}}. Run with --update to rewrite it.`
    );
  }
  if (parsed === null || typeof parsed !== "object") throw new Error(`${file} must be a JSON object`);
  const entries = new Map<string, AllowEntry>();
  for (const [name, entry] of Object.entries(parsed as Record<string, unknown>)) {
    if (entry === null || typeof entry !== "object") throw new Error(`${file}: ${name} must be an object`);
    const record = entry as Record<string, unknown>;
    const kinds = ["differs", "onlyUpstream", "onlyReplot"].filter((k) => k in record);
    if (kinds.length !== 1)
      throw new Error(`${file}: ${name} must have exactly one of "differs", "onlyUpstream" or "onlyReplot"`);
    const kind = kinds[0] as keyof AllowEntry;
    const value = record[kind];
    if (typeof value !== "string") throw new Error(`${file}: ${name}.${kind} must be a string`);
    const extra = Object.keys(record).filter((k) => k !== kind && k !== "note");
    if (extra.length) throw new Error(`${file}: ${name} has unknown key(s): ${extra.join(", ")}`);
    const note = record.note;
    // A note explains a signature; the other two kinds state their reason in
    // the value itself, so a note beside one of them would have nowhere to go.
    if (note !== undefined && (kind !== "differs" || typeof note !== "string"))
      throw new Error(`${file}: ${name}.note must be a string, and only alongside "differs"`);
    entries.set(name, (note === undefined ? {[kind]: value} : {[kind]: value, note}) as AllowEntry);
  }
  return entries;
}

// One line per plot, sorted, so a diff of the file reads as a list of the
// plots that changed and how. JSON.stringify can't do that on its own, and it
// writes a record as {"differs":"…"} with a bare minus sign rather than the
// escaped, spaced form the file holds, so an update would rewrite every line
// and the diff would stop showing which plot actually moved.
function formatAllow(entries: Map<string, AllowEntry>): string {
  const lines = [...entries.keys()]
    .sort()
    .map((name) => `  ${escaped(name)}: ${formatRecord(entries.get(name)!)}`);
  return `{\n${lines.join(",\n")}\n}\n`;
}

function formatRecord(entry: AllowEntry): string {
  const fields = Object.entries(entry).map(([key, value]) => `${escaped(key)}: ${escaped(value as string)}`);
  return `{${fields.join(", ")}}`;
}

// The summary prints U+2212 for a minus, which the file escapes.
function escaped(value: string): string {
  return JSON.stringify(value).replace(
    /[\u007f-￿]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`
  );
}

// What the allow file says about a comparison, and what is wrong with it.
// An entry that is present but for the wrong status is as much a failure as a
// missing one: the list has to describe what is actually the case.
function allowance(result: Comparison, allow: Map<string, AllowEntry>): {flag: string; problem?: string} {
  const entry = allow.get(result.name);
  if (result.status === "differs") {
    const expected = (entry as {differs?: string} | undefined)?.differs;
    if (expected === undefined) return {flag: "", problem: "differs and is not in the allow list"};
    if (expected !== signature(result))
      return {flag: "changed", problem: "differs in a way the allow list does not record"};
    return {flag: "yes"};
  }
  if (result.status === "identical") {
    if (entry === undefined) return {flag: ""};
    return {flag: "stale", problem: "is in the allow list but no longer differs"};
  }
  const kind = result.status === "missing-replot" ? "onlyUpstream" : "onlyReplot";
  if (entry === undefined || (entry as Record<string, string>)[kind] === undefined)
    return {flag: "", problem: `is ${result.status} and is not recorded in the allow list as ${kind}`};
  return {flag: "yes"};
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

  if (options.update && !options.allow) throw new Error("--update needs --allow <file> to know what to rewrite");
  if (options.update && options.filter)
    throw new Error("--update cannot be combined with --filter; it rewrites the whole list");
  const allow = new Map<string, AllowEntry>(
    options.allow ? parseAllow(await fs.readFile(options.allow, "utf8"), options.allow) : []
  );
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

  // The allow list is checked here rather than only under --fail so that a
  // plain run also reports a drifting or stale record.
  const allowances = new Map(results.map((r) => [r.name, allowance(r, allow)]));
  const problems = results
    .map((r) => ({name: r.name, problem: allowances.get(r.name)!.problem}))
    .filter((p): p is {name: string; problem: string} => p.problem !== undefined);
  for (const name of allow.keys()) {
    if (!names.has(name)) problems.push({name, problem: "is in the allow list but is not a test plot"});
  }

  const nameWidth = Math.max(4, ...differing.map((r) => r.name.length));
  console.log(
    `${"plot".padEnd(nameWidth)}  ${"+".padStart(6)} ${"−".padStart(
      6
    )}  allowed  differences (Replot relative to upstream)`
  );
  for (const r of differing) {
    const flag = allowances.get(r.name)!.flag;
    console.log(
      `${r.name.padEnd(nameWidth)}  ${String(r.added).padStart(6)} ${String(r.removed).padStart(6)}  ${flag.padEnd(
        7
      )}  ${signature(r)}`
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
    for (const [text, n] of r.textDeltas) if (n !== 0) causes.set("(text)", (causes.get("(text)") ?? 0) + 1);
    for (const key of r.attrValueDeltas.keys()) causes.set(key, (causes.get(key) ?? 0) + 1);
  }
  const top = [...causes].sort((a, b) => b[1] - a[1]).slice(0, 12);
  if (top.length) {
    console.log();
    console.log("most common differences (number of plots affected):");
    for (const [key, n] of top) console.log(`  ${String(n).padStart(4)}  ${key}`);
  }

  if (options.allow) {
    console.log();
    console.log(
      `allow list: ${[...allowances.values()].filter((a) => a.flag === "yes").length} of ${allow.size} entries match, ${
        problems.length
      } problem(s)`
    );
    for (const p of problems) console.log(`  ${p.name} ${p.problem}`);
  }

  if (options.update && options.allow) {
    const updated = new Map<string, AllowEntry>();
    const noReason: string[] = [];
    for (const r of results) {
      if (r.status === "differs") {
        // The note is a person's explanation for the divergence; refreshing the
        // signature it sits beside must not throw it away.
        const note = (allow.get(r.name) as {note?: string} | undefined)?.note;
        updated.set(r.name, note === undefined ? {differs: signature(r)} : {differs: signature(r), note});
      } else if (r.status !== "identical") {
        const kind = r.status === "missing-replot" ? "onlyUpstream" : "onlyReplot";
        const reason = (allow.get(r.name) as Record<string, string> | undefined)?.[kind];
        if (reason === undefined) noReason.push(`${r.name} (${kind})`);
        else updated.set(r.name, {[kind]: reason} as AllowEntry);
      }
    }
    if (noReason.length) {
      throw new Error(`--update will not invent a reason for ${noReason.join(", ")}; add those entries by hand first.`);
    }
    const before = formatAllow(allow);
    const after = formatAllow(updated);
    await fs.writeFile(options.allow, after);
    console.log(
      before === after
        ? `\n${options.allow} rewritten (no change).`
        : `\n${options.allow} rewritten: review the diff, then commit it with the change that caused it.`
    );
    return;
  }

  if (options.fail && problems.length) {
    console.error(`\n${problems.length} plot(s) are not as ${options.allow} records them:`);
    for (const p of problems) console.error(`  ${p.name} ${p.problem}`);
    console.error(
      `\nIf the change is intended, run \`yarn parity --allow ${options.allow} --update\`, review the diff it writes, and commit that with the change.`
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
