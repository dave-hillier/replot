import {Replot, Voronoi, Dot, VoronoiMesh} from "../../src/react/api.js";
import * as d3 from "d3";

export async function penguinVoronoi1D() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot inset={10}>
      <Voronoi
        data={penguins}
        x="body_mass_g"
        fill="species"
        fillOpacity={0.5}
        href={(d) => `https://en.wikipedia.org/wiki/${d.species}_penguin`}
        target="_blank"
        title={(d) => `${d.species} (${d.sex})\n${d.island}`}
      />
      <Dot data={penguins} x="body_mass_g" fill="currentColor" r={1.5} pointerEvents="none" />
      <VoronoiMesh data={penguins} x="body_mass_g" pointerEvents="none" />
    </Replot>
  );
}
