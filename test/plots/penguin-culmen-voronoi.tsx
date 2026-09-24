import {Replot, Dot, Voronoi, VoronoiMesh, Frame, pointer, hexbin} from "../../src/react/api.js";
import * as d3 from "d3";

export async function penguinCulmenVoronoi() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot>
      <Dot data={penguins} x="culmen_depth_mm" y="culmen_length_mm" fill="currentColor" r={1.5} />
      <Voronoi data={penguins} x="culmen_depth_mm" y="culmen_length_mm" stroke="species" tip={true} />
    </Replot>
  );
}

export async function penguinCulmenVoronoiExclude() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  const xy = {fx: "species", x: "culmen_depth_mm", y: "culmen_length_mm"};
  return (
    <Replot inset={10}>
      <Frame />
      <Dot data={penguins} {...xy} facet="exclude" fill="currentColor" r={1.5} />
      <Dot data={penguins} {...xy} facet="include" fillOpacity={0.25} fill="currentColor" r={1.5} />
      <VoronoiMesh data={penguins} {...xy} facet="exclude" />
      <Voronoi
        data={penguins}
        {...pointer({
          ...xy,
          facet: "exclude",
          stroke: "species",
          fill: "species",
          fillOpacity: 0.2,
          maxRadius: Infinity
        })}
      />
    </Replot>
  );
}

export async function penguinCulmenVoronoiExcludeHex() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  const xy = {fx: "species", x: "culmen_depth_mm", y: "culmen_length_mm"};
  return (
    <Replot inset={20}>
      <Frame />
      <Dot data={penguins} {...hexbin({}, {...xy, facet: "exclude", stroke: "species", fill: "species"})} />
      <VoronoiMesh data={penguins} {...hexbin({}, {...xy, facet: "exclude", strokeOpacity: 1})} />
      <Voronoi
        data={penguins}
        {...pointer(hexbin({}, {...xy, facet: "exclude", strokeWidth: 2, maxRadius: Infinity}))}
      />
    </Replot>
  );
}
