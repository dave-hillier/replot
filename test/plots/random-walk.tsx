import {Replot, LineY, mapY} from "../../src/react/api.js";
import * as d3 from "d3";

const random = () => d3.randomNormal.source(d3.randomLcg(42))();

export async function randomWalk() {
  return (
    <Replot>
      <LineY data={{length: 500}} {...mapY("cumsum", {y: random()})} />
    </Replot>
  );
}

export async function randomWalkCustomMap1() {
  const cumsum = (I: number[], V: number[]) => ((sum) => Float64Array.from(I, (i) => (sum += V[i])))(0);
  return (
    <Replot>
      <LineY data={{length: 500}} {...mapY(cumsum, {y: random()})} />
    </Replot>
  );
}

export async function randomWalkCustomMap2() {
  const cumsum = (V: number[]) => ((sum) => Float64Array.from(V, (v) => (sum += v)))(0);
  return (
    <Replot>
      <LineY data={{length: 500}} {...mapY(cumsum, {y: random()})} />
    </Replot>
  );
}

export async function randomWalkCustomMap3() {
  const cumsum = {
    mapIndex(I: number[], S: number[], T: number[]) {
      let sum = 0;
      for (const i of I) {
        T[i] = sum += S[i];
      }
    }
  };
  return (
    <Replot>
      <LineY data={{length: 500}} {...mapY(cumsum, {y: random()})} />
    </Replot>
  );
}
