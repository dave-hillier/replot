import {Replot, RectY, TextY, RuleY, map, window as win} from "../../src/react/api.js";
import * as d3 from "d3";

export async function seattlePrecipitationSum() {
  const weather = (await d3.csv<any>("data/seattle-weather.csv", d3.autoType)).slice(-28);
  const y = win({k: 7, strict: true, reduce: "sum", anchor: "end"});
  const text = win({k: 7, strict: true, reduce: (V) => Math.round(d3.sum(V)), anchor: "end"});
  return (
    <Replot x={{domain: d3.extent(weather.slice(6), (d) => d.date)}} y={{insetTop: 10}}>
      <RectY data={weather} {...map({y}, {x: "date", y: "precipitation", interval: "day"})} />
      <TextY
        data={weather}
        {...map({y, text}, {x: "date", y: "precipitation", text: "precipitation", interval: "day", dy: -6})}
      />
      <RuleY data={[0]} />
    </Replot>
  );
}
