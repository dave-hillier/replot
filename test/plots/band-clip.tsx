import {Replot, Frame, Text, RuleY, BarY, groupX} from "../../src/react/api.js";
import * as d3 from "d3";

export async function bandClip() {
  return (
    <Replot y={{type: "band"}} clip>
      <Frame />
      <Text data={["A", "B", "C"]} x={(d) => d} y={(d) => d} fontSize={50} />
    </Replot>
  );
}

export async function bandClip2() {
  const data = [
    {Date: new Date("2022-12-01"), Count: 10},
    {Date: new Date("2022-12-02"), Count: 1},
    {Date: new Date("2022-12-02"), Count: 1},
    {Date: new Date("2022-12-03"), Count: 2},
    {Date: new Date("2022-12-04"), Count: 3},
    {Date: new Date("2022-12-05"), Count: 4},
    {Date: new Date("2022-12-06"), Count: 5}
  ];
  return (
    <Replot grid x={{interval: d3.utcDay}}>
      <RuleY data={[0]} />
      <BarY data={data} {...groupX({y: "sum"}, {x: "Date", y: "Count", rx: 6, insetBottom: -6, clip: "frame"})} />
    </Replot>
  );
}
