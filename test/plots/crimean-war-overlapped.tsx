import {Replot, RectY, RuleY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function crimeanWarOverlapped() {
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
      <RectY data={data} x="date" interval="month" y2="deaths" fill="cause" mixBlendMode="multiply" />
      <RuleY data={[0]} />
    </Replot>
  );
}
