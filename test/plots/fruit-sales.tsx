import {Replot, BarX, RuleX, groupY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function fruitSales() {
  const sales = await d3.csv<any>("data/fruit-sales.csv", d3.autoType);
  return (
    <Replot marginLeft={50} y={{label: null}}>
      <BarX data={sales} {...groupY({x: "sum"}, {x: "units", y: "fruit", sort: {y: "x"}})} />
      <RuleX data={[0]} />
    </Replot>
  );
}
