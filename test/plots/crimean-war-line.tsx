import {Replot, RuleY, LineY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function crimeanWarLine() {
  const crimea = await d3.csv<any>("data/crimean-war.csv", d3.autoType);
  const causes = crimea.columns.slice(2);
  const data = causes.flatMap((cause) => crimea.map(({date, [cause]: deaths}) => ({date, cause, deaths})));
  return (
    <Replot
      x={{
        tickFormat: "%b",
        label: null
      }}
    >
      <RuleY data={[0]} />
      <LineY data={data} x="date" y="deaths" stroke="cause" marker="circle" />
    </Replot>
  );
}
