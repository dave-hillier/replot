import {Replot, Dot, Arrow, Text} from "../../src/react/api.js";
import * as d3 from "d3";

export async function markovChain() {
  const matrix = [
    [0.3, 0.2, 0.5],
    [0.1, 0.7, 0.2],
    [0.1, 0.1, 0.8]
  ];
  const centers = matrix.map((m, i) => d3.pointRadial(((2 - i) * 2 * Math.PI) / matrix.length, 100));
  const factors = matrix.flatMap((m, i) => m.map((value, j) => ({i, j, value})));
  return (
    <Replot width={400} inset={60} aspectRatio={1} axis={null}>
      <Dot data={centers} r={40} />
      <Arrow
        data={factors}
        x1={({i}) => centers[i][0]}
        y1={({i}) => centers[i][1]}
        x2={({j}) => centers[j][0]}
        y2={({j}) => centers[j][1]}
        strokeOpacity="value"
        bend={true}
        strokeWidth={1}
        inset={55}
      />
      <Text data={centers} text={["A", "B", "C"]} dy={55} />
      <Text
        data={factors}
        x={({i, j}) => (centers[i][0] + centers[j][0]) / 2 + (centers[i][1] - centers[j][1]) * 0.16}
        y={({i, j}) => (centers[i][1] + centers[j][1]) / 2 - (centers[i][0] - centers[j][0]) * 0.16}
        text="value"
      />
    </Replot>
  );
}
