import {Replot, TreeMark} from "../../src/react/api.js";
import * as d3 from "d3";

export async function flareIndent() {
  const flare = await d3.csv<any>("data/flare.csv", d3.autoType);
  return (
    <Replot axis={null} inset={10} insetRight={120} round={true} width={200} height={3600}>
      <TreeMark
        data={flare}
        strokeWidth={1}
        r={2.5}
        curve="step-before"
        treeLayout={indent}
        path="name"
        delimiter="."
      />
    </Replot>
  );
}

function indent() {
  return (root) => root.eachBefore((node, i) => ((node.y = node.depth), (node.x = i)));
}
