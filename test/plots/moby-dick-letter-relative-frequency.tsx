import {Replot, BarY, RuleY, groupX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function mobyDickLetterRelativeFrequency() {
  const mobydick = await d3.text("data/moby-dick-chapter-1.txt");
  const letters = [...mobydick].filter((c) => /[a-z]/i.test(c)).map((c) => c.toUpperCase());
  return (
    <Replot
      y={{
        grid: true,
        percent: true
      }}
    >
      <BarY data={letters} {...groupX({y: "proportion"})} />
      <RuleY data={[0]} />
    </Replot>
  );
}
