import {Replot, AreaY, stackY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function industryUnemploymentStream() {
  const data = await d3.csv<any>("data/bls-industry-unemployment.csv", d3.autoType);
  return (
    <Replot marginLeft={44}>
      <AreaY
        data={data}
        {...stackY({
          x: "date",
          y: "unemployed",
          fill: "industry",
          title: "industry",
          offset: "wiggle"
        })}
      />
    </Replot>
  );
}
