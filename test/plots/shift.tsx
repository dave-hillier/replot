import {Replot, Arrow, shiftX as shiftXTransform, shiftY as shiftYTransform} from "../../src/react/api.js";
import * as d3 from "d3";

export async function shiftX() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot>
      <Arrow data={aapl} {...shiftXTransform("quarter", {x: "Date", y: "Close", bend: true})} />
    </Replot>
  );
}

export async function shiftY() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot>
      <Arrow data={aapl} {...shiftYTransform("quarter", {y: "Date", x: "Close", bend: true})} />
    </Replot>
  );
}
