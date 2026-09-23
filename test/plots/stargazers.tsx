import {Replot, RuleY, Line, Text, selectLast} from "../../src/react/api.js";
import * as d3 from "d3";

export async function stargazers() {
  const stargazers = await d3.csv<any>("data/stargazers.csv", d3.autoType);
  return (
    <Replot
      marginRight={40}
      y={{
        grid: true,
        label: "Stargazers"
      }}
    >
      <RuleY data={[0]} />
      <Line data={stargazers} x="date" y={(_, i) => i} />
      <Text data={stargazers} {...selectLast({x: "date", y: (_, i) => i, textAnchor: "start", dx: 3})} />
    </Replot>
  );
}
