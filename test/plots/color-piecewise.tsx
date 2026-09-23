import {Replot, CellX, identity} from "../../src/react/api.js";
import * as d3 from "d3";

export function colorPiecewiseLinearDomain() {
  return (
    <Replot color={{legend: true, type: "linear", domain: [0, 10, 20], range: ["red", "blue"]}}>
      <CellX data={d3.range(11)} fill={identity} />
    </Replot>
  );
}

export function colorPiecewiseLinearDomainReverse() {
  return (
    <Replot color={{legend: true, type: "linear", domain: [0, 10, 20], reverse: true, range: ["red", "blue"]}}>
      <CellX data={d3.range(11)} fill={identity} />
    </Replot>
  );
}

export function colorPiecewiseLinearRange() {
  return (
    <Replot color={{legend: true, type: "linear", domain: [0, 10], range: ["red", "blue", "green"]}}>
      <CellX data={d3.range(11)} fill={identity} />
    </Replot>
  );
}

export function colorPiecewiseLinearRangeHcl() {
  return (
    <Replot
      color={{legend: true, type: "linear", domain: [0, 10], range: ["red", "blue", "green"], interpolate: "hcl"}}
    >
      <CellX data={d3.range(11)} fill={identity} />
    </Replot>
  );
}

export function colorPiecewiseLinearRangeReverse() {
  return (
    <Replot color={{legend: true, type: "linear", domain: [0, 10], reverse: true, range: ["red", "blue", "green"]}}>
      <CellX data={d3.range(11)} fill={identity} />
    </Replot>
  );
}
