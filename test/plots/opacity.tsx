import {Replot, DotX, identity} from "../../src/react/api.js";
import * as d3 from "d3";

export function opacityDotsFillUnscaled() {
  return (
    <Replot>
      <DotX data={d3.ticks(0.3, 0.7, 40)} fill="black" r={7} fillOpacity={identity} />
    </Replot>
  );
}

export function opacityDotsStrokeUnscaled() {
  return (
    <Replot>
      <DotX data={d3.ticks(0.3, 0.7, 40)} stroke="black" r={3.5} strokeWidth={7} strokeOpacity={identity} />
    </Replot>
  );
}

export function opacityDotsUnscaled() {
  return (
    <Replot>
      <DotX data={d3.ticks(0.3, 0.7, 40)} fill="black" r={7} opacity={identity} />
    </Replot>
  );
}
