import {Replot, Density, Frame} from "../../src/react/api.js";
import * as d3 from "d3";

export async function penguinDensityZ() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot
      width={960}
      height={360}
      inset={20}
      color={{
        legend: true
      }}
    >
      <Density
        data={penguins}
        fx="island"
        x="flipper_length_mm"
        y="culmen_length_mm"
        stroke="species"
        fill="species"
        title="species"
        fillOpacity={0.1}
        thresholds={10}
        mixBlendMode="multiply"
        clip={true}
      />
      <Frame />
    </Replot>
  );
}
