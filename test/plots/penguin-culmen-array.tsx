import {Replot, Dot} from "../../src/react/api.js";
import * as d3 from "d3";

export async function penguinCulmenArray() {
  const data = await d3.csv<any>("data/penguins.csv", d3.autoType);
  const culmen_depth_mm = data.map((d) => d.culmen_depth_mm);
  const culmen_length_mm = data.map((d) => d.culmen_length_mm);
  return (
    <Replot
      height={600}
      grid={true}
      facet={{
        data,
        x: "sex",
        y: "species",
        marginRight: 80
      }}
    >
      <Dot data={data} facet={null} x={culmen_depth_mm} y={culmen_length_mm} r={2} fill="#ddd" />
      <Dot data={data} x={culmen_depth_mm} y={culmen_length_mm} />
    </Replot>
  );
}
