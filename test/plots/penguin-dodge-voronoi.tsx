import {Replot, VoronoiMesh, Dot, dodgeY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function penguinDodgeVoronoi() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot height={200}>
      <VoronoiMesh data={penguins} {...dodgeY({x: "body_mass_g"})} />
      <Dot data={penguins} {...dodgeY({x: "body_mass_g", fill: "currentColor"})} />
    </Replot>
  );
}
