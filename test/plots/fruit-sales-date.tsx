import {Replot, BarY, Text, stackY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function fruitSalesDate() {
  const sales = await d3.csv<any>("data/fruit-sales.csv", d3.autoType);
  return (
    <Replot x={{type: "band"}}>
      <BarY data={sales} {...stackY({x: "date", y: "units", fill: "fruit"})} />
      <Text data={sales} {...stackY({x: "date", y: "units", text: "fruit"})} />
    </Replot>
  );
}

export async function fruitSalesSingleDate() {
  const sales = (await d3.csv<any>("data/fruit-sales.csv", d3.autoType)).slice(0, 3);
  return (
    <Replot x={{type: "band"}}>
      <BarY data={sales} {...stackY({x: "date", y: "units", fill: "fruit"})} />
      <Text data={sales} {...stackY({x: "date", y: "units", text: "fruit"})} />
    </Replot>
  );
}
