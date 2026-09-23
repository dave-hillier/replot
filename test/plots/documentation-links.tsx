import {Replot, BarX, TextX, RuleX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function documentationLinks() {
  const data = await d3.json<any>("data/plot-documentation.json").then((d) => d.listings);
  return (
    <Replot
      marginLeft={140}
      x={{
        domain: [0, 41],
        clamp: true,
        grid: true
      }}
      y={{
        tickFormat: (i) => data[i].title.replace(" / Observable Plot", "")
      }}
    >
      <BarX
        data={data}
        x="likes"
        y={(d, i) => i}
        href={(d) => `https://observablehq.com/@observablehq/${d.slug}`}
        target="_blank"
      />
      <TextX
        data={data}
        x="likes"
        y={(d, i) => i}
        text={(d) => `${d.likes > 40 ? "⚡︎" : ""} ${d.likes}`}
        textAnchor="end"
        fill="white"
        dx={-3}
      />
      <RuleX data={[0]} />
    </Replot>
  );
}
