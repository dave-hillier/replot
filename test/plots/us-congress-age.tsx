import {Replot, Dot, RuleY, stackY2} from "../../src/react/api.js";
import * as d3 from "d3";

export async function usCongressAge() {
  const data = await d3.csv<any>("data/us-congress-members.csv", d3.autoType);
  return (
    <Replot height={300} x={{nice: true, label: "Age"}} y={{grid: true, label: "Frequency"}}>
      <Dot data={data} {...stackY2({x: (d) => 2021 - d.birth, fill: "currentColor", title: "full_name"})} />
      <RuleY data={[0]} />
    </Replot>
  );
}
