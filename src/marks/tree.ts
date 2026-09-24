import {cluster as Cluster, tree as Tree} from "d3";
import type {CompoundMark, Data, MarkOptions} from "../mark.js";
import {marks} from "../mark.js";
import {isNoneish, keyword} from "../options.js";
import type {TreeTransformOptions} from "../transforms/tree.js";
import {maybeTreeAnchor, treeLink, treeNode} from "../transforms/tree.js";
import type {DotOptions} from "./dot.js";
import {dot} from "./dot.js";
import type {LinkOptions} from "./link.js";
import {link} from "./link.js";
import type {TextOptions} from "./text.js";
import {text} from "./text.js";

// TODO tree channels, e.g., "node:name" | "node:path" | "node:internal" | "node:external"?

// JSX port (Phase 1 unit 25): the tree (and cluster) factories are CompoundMark
// builders — they compose link, dot, and text marks via the marks() helper and
// do not perform any imperative DOM construction themselves. The underlying
// link/dot/text marks each have their own renderJSX implementations, so no JSX
// rendering is required at this layer.

/** Options for the compound tree mark. */
export interface TreeOptions extends DotOptions, LinkOptions, TextOptions, TreeTransformOptions {
  /**
   * Whether to represent the node with a dot; defaults to true unless a
   * **marker** is specified.
   */
  dot?: boolean;

  /**
   * The **stroke** color for the text mark to improve the legibility of labels
   * atop other marks by creating a halo effect; defaults to *white*.
   */
  textStroke?: MarkOptions["stroke"];

  /**
   * Layout for node labels: if *mirrored*, leaf-node labels are left-anchored,
   * and non-leaf nodes right-anchored (with a -dx offset). If *normal*, all
   * labels are left-anchored. Defaults to *mirrored* unless a **treeLayout**
   * has been specified.
   */
  textLayout?: "mirrored" | "normal";
}

/**
 * Returns a compound tree mark, with a link to display edges from parent to
 * child, a dot to display nodes, and a text to display node labels.
 *
 * The tree layout is computed via the treeLink and treeNode transforms, which
 * transform a tabular dataset into a hierarchy according to the given **path**
 * input channel, which must contain **delimiter**-separated strings (forward
 * slash by default); then executes a tree layout algorithm, by default
 * [Reingold–Tilford’s “tidy” algorithm][1].
 *
 * [1]: https://d3js.org/d3-hierarchy/tree
 */
export function tree(
  data?: Data,
  {
    fill,
    stroke,
    strokeWidth,
    strokeOpacity,
    strokeLinejoin,
    strokeLinecap,
    strokeMiterlimit,
    strokeDasharray,
    strokeDashoffset,
    marker,
    markerStart = marker,
    markerEnd = marker,
    dot: dotDot = isNoneish(markerStart) && isNoneish(markerEnd),
    text: textText = "node:name",
    textStroke = "var(--plot-background)",
    title = "node:path",
    dx,
    dy,
    textAnchor,
    treeLayout = Tree,
    textLayout = treeLayout === Tree || treeLayout === Cluster ? "mirrored" : "normal",
    tip,
    ...options
  }: TreeOptions = {}
): CompoundMark {
  if (dx === undefined) dx = maybeTreeAnchor(options.treeAnchor).dx;
  if (textAnchor !== undefined) throw new Error("textAnchor is not a configurable tree option");
  textLayout = keyword(textLayout, "textLayout", ["mirrored", "normal"]);

  function treeText(textOptions?: any) {
    return text(
      data,
      treeNode({
        treeLayout,
        text: textText,
        fill: fill === undefined ? "currentColor" : fill,
        stroke: textStroke,
        dx,
        dy,
        title,
        ...textOptions,
        ...options
      })
    );
  }

  return marks(
    link(
      data,
      treeLink({
        treeLayout,
        markerStart,
        markerEnd,
        stroke: stroke !== undefined ? stroke : fill === undefined ? "node:internal" : fill,
        strokeWidth,
        strokeOpacity,
        strokeLinejoin,
        strokeLinecap,
        strokeMiterlimit,
        strokeDasharray,
        strokeDashoffset,
        ...options
      })
    ),
    dotDot
      ? dot(data, treeNode({treeLayout, fill: fill === undefined ? "node:internal" : fill, title, tip, ...options}))
      : null,
    textText != null
      ? textLayout === "mirrored"
        ? [
            treeText({textAnchor: "start", treeFilter: "node:external"}),
            treeText({textAnchor: "end", treeFilter: "node:internal", dx: -dx})
          ]
        : treeText()
      : null
  );
}

/**
 * Shorthand for the tree mark using [d3.cluster][1] as the **treeLayout**
 * option, placing leaf nodes of the tree at the same depth. Equivalent to:
 *
 * ```js
 * Plot.tree(data, {...options, treeLayout: d3.cluster, textLayout: "mirrored"})
 * ```
 *
 * [1]: https://d3js.org/d3-hierarchy/cluster
 */
export function cluster(data?: Data, options?: TreeOptions): CompoundMark {
  return tree(data, {...options, treeLayout: Cluster});
}
