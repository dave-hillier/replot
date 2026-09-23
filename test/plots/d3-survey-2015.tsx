import {Replot, BarX, RuleX} from "../../src/react/api.js";
import * as d3 from "d3";

// TODO consolidate bars into Other category
export function chooseOne(responses, y, title) {
  return bars(
    d3.rollups(
      responses,
      (group) => group.length / responses.length,
      (d) => d[y]
    ),
    title
  );
}

export function chooseMany(responses, y, title) {
  return bars(
    Array.from(new Set(responses.flatMap((d) => d[y])), (v) => [v, d3.mean(responses, (d) => d[y].includes(v))]),
    title
  );
}

function bars(groups, title) {
  return (
    <Replot
      marginLeft={300}
      width={960}
      height={groups.length * 20 + 50}
      x={{
        grid: true,
        axis: "top",
        domain: [0, 100],
        label: "Frequency (%)",
        transform: (x) => x * 100
      }}
      y={{
        padding: 0,
        label: title,
        labelAnchor: "top"
      }}
    >
      <BarX data={groups} x={([, value]) => value} y={([key]) => key} fill="steelblue" insetTop={1} sort={{y: "-x"}} />
      <RuleX data={[0]} />
    </Replot>
  );
}
