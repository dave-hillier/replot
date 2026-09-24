import {Replot, CellX, identity} from "../../src/react/api.js";
import * as d3 from "d3";

export async function ordinalOpacity() {
  return (
    <Replot opacity={{type: "ordinal"}}>
      <CellX data={d3.range(10)} fill="red" opacity={identity} />
    </Replot>
  );
}

export async function ordinalOpacityImplicitZero() {
  return (
    <Replot opacity={{type: "ordinal"}}>
      <CellX data={d3.range(2, 10)} fill="red" opacity={identity} />
    </Replot>
  );
}

export async function ordinalOpacityRamp() {
  return (
    <Replot opacity={{type: "ordinal", legend: "ramp"}}>
      <CellX data={d3.range(10)} fill="red" opacity={identity} />
    </Replot>
  );
}

export async function ordinalOpacityThreshold() {
  return (
    <Replot opacity={{type: "threshold", legend: true, domain: [2, 5, 8], range: [0.2, 0.4, 0.6, 0.8]}}>
      <CellX data={d3.range(10)} fill="red" opacity={identity} />
    </Replot>
  );
}
