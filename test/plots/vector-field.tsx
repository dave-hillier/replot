import {Replot, Vector} from "../../src/react/api.js";
import * as d3 from "d3";

export async function vectorField() {
  return (
    <Replot inset={12} height={600}>
      <Vector
        data={((T) => d3.cross(T, T))(d3.ticks(0, 2 * Math.PI, 20))}
        length={([x, y]) => (x + y) * 2 + 2}
        rotate={([x, y]) => (Math.sin(x) - Math.sin(y)) * 60}
      />
    </Replot>
  );
}
