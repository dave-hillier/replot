import {Replot, BarY, groupX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function wordLengthMobyDick() {
  // Compute a set of “words” from the text. As with any natural language task,
  // this is messy and approximate.
  const words = (await d3.text("data/moby-dick-chapter-1.txt"))
    .replace(/’/g, "") // remove apostrophes
    .split(/\b/g) // split at word boundaries
    .map((word) => word.replace(/[^a-z]+/gi, "")) // strip non-letters
    .filter((word) => word); // ignore (now) empty words

  return (
    <Replot x={{label: "Word length", labelAnchor: "right", labelArrow: true}} y={{grid: true, percent: true}}>
      <BarY data={words} {...groupX({y: "proportion", title: "mode"}, {x: "length", title: (d) => d})} />
    </Replot>
  );
}
