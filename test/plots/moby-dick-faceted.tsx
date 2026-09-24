import {Replot, BarY, RuleY, groupX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function mobyDickFaceted() {
  const mobydick = await d3.text("data/moby-dick-chapter-1.txt");
  const letters = [...mobydick].filter((d) => /\w/.test(d));
  const uppers = letters.map((d) => d.toUpperCase());
  const cases = letters.map((d) => (d.toLowerCase() === d ? "lower" : "upper"));
  const vowels = letters.map((d) => (/[aeiouy]/i.test(d) ? "vowel" : "consonant"));
  return (
    <Replot
      y={{
        grid: true
      }}
      facet={{
        data: letters,
        x: vowels,
        y: cases
      }}
    >
      <BarY data={letters} {...groupX({y: "count"}, {x: uppers})} />
      <RuleY data={[0]} />
    </Replot>
  );
}
