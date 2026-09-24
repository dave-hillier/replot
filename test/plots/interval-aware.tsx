import {Replot, BarY, binY, groupX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function intervalAwareBin() {
  const olympians = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot x={{interval: 10}}>
      <BarY data={olympians} {...binY({fill: "count"}, {x: "weight", y: "height", inset: 0})} />
    </Replot>
  );
}

export async function intervalAwareGroup() {
  const olympians = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot x={{interval: "5 years"}}>
      <BarY data={olympians} {...groupX({y: "count"}, {x: "date_of_birth"})} />
    </Replot>
  );
}

export async function intervalAwareStack() {
  const olympians = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot x={{interval: "5 years"}}>
      <BarY data={olympians} x="date_of_birth" y={1} />
    </Replot>
  );
}
