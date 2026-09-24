import {Replot, Line, Dot} from "../../src/react/api.js";
import * as d3 from "d3";

export async function curves() {
  const random = d3.randomLcg(42);
  const values = d3.ticks(0, 1, 11).map((t) => {
    const r = 1 + 2 * random();
    return [r * Math.cos(t * 2 * Math.PI), r * Math.sin(t * 2 * Math.PI)];
  });
  return (
    <Replot width={500} axis={null} aspectRatio={true} inset={10}>
      {d3
        .ticks(0, 1, 4)
        .flatMap((tension) => [
          <Line data={values} curve="bundle" tension={tension} stroke="red" mixBlendMode="multiply" />,
          <Line data={values} curve="cardinal-closed" tension={tension} stroke="green" mixBlendMode="multiply" />,
          <Line data={values} curve="catmull-rom-closed" tension={tension} stroke="blue" mixBlendMode="multiply" />
        ])}
      <Dot data={values} stroke="white" fill="black" />
    </Replot>
  );
}
