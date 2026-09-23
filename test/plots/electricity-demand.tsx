import {Replot, Frame, RuleY, AxisX, GridX, Dot, Line, windowY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function electricityDemand() {
  const electricity = await d3.csv<any>("data/electricity-demand.csv", d3.autoType);
  return (
    <Replot width={960} marginLeft={50} x={{round: true, nice: "week"}} y={{insetTop: 6}}>
      <Frame fill="#efefef" />
      <RuleY data={[0]} />
      <AxisX ticks="year" tickSize={28} tickPadding={-11} tickFormat="  %Y" textAnchor="start" />
      <AxisX ticks="month" tickSize={16} tickPadding={-11} tickFormat="  %B" textAnchor="start" />
      <GridX ticks="week" stroke="#fff" strokeOpacity={1} insetBottom={-0.5} />
      <Dot data={electricity} x="date" y="mwh" stroke="red" strokeOpacity={0.3} />
      <Line data={electricity} {...windowY(24, {x: "date", y: "mwh"})} />
    </Replot>
  );
}
