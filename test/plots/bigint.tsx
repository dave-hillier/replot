import {Replot, Auto, Line, TickX, CellX, BarY} from "../../src/react/api.js";
import * as d3 from "d3";

const integers = d3.range(40).map((int) => ({
  big1: BigInt(int),
  big2: BigInt(int * int)
}));

export async function bigint1() {
  return (
    <Replot>
      <Auto data={integers} x="big2" />
    </Replot>
  );
}

export async function bigint2() {
  return (
    <Replot>
      <Line data={integers} x="big1" y="big2" marker="circle" />
    </Replot>
  );
}

export async function bigintLog() {
  return (
    <Replot x={{type: "log"}}>
      <TickX data={integers} x="big2" stroke="big1" />
    </Replot>
  );
}

export async function bigintOrdinal() {
  return (
    <Replot color={{type: "log", legend: true}}>
      <CellX data={integers.slice(1, 11)} x="big1" fill="big1" />
    </Replot>
  );
}

export async function bigintStack() {
  return (
    <Replot>
      <BarY data={integers} x={(d, i) => i % 5} y="big1" />
    </Replot>
  );
}
