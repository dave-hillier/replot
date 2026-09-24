import {Replot, AreaY, Line, RuleY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function metroUnemploymentRidgeline() {
  const data = await d3.csv<any>("data/bls-metro-unemployment.csv", d3.autoType);
  return (
    <Replot
      width={960}
      height={1080}
      y={{
        insetTop: -40,
        axis: null
      }}
      fy={{
        round: true,
        label: null
      }}
      facet={{
        data,
        y: "division",
        marginLeft: 300
      }}
    >
      <AreaY data={data} x="date" y="unemployment" fill="#eee" />
      <Line data={data} x="date" y="unemployment" sort={{fy: "-y"}} />
      <RuleY data={[0]} />
    </Replot>
  );
}
