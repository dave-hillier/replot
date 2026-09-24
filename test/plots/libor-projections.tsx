import {Replot, Dot, Text, Frame, LineY} from "../../src/react/api.js";
import * as d3 from "d3";

export async function liborProjections() {
  const libor = await d3.csv<any>("data/libor-projections.csv", d3.autoType);
  const pc = d3.format(".2%");
  return (
    <Replot width={960} aspectRatio={1} insetLeft={10} insetRight={5} insetBottom={7} y={{grid: true, line: true}}>
      <Dot data={libor} x="about" y="on" fill="value" />
      <Text
        data={libor}
        x="about"
        y="on"
        text={(d) => pc(d.value)}
        filter={(d) => d.about.getUTCMonth() === 0}
        stroke="white"
        fill="black"
      />
    </Replot>
  );
}

export async function liborProjectionsFacet() {
  const libor = await d3.csv<any>("data/libor-projections.csv", d3.autoType);
  return (
    <Replot
      fy={{tickFormat: "d"}}
      y={{percent: true, nice: true, grid: true, axis: "right", label: "rate (%)"}}
      color={{legend: true}}
    >
      <Frame />
      <LineY
        data={libor}
        markerStart={true}
        fy={(d) => d.on.getFullYear()}
        x="about"
        stroke={(d) => "H" + (1 + d3.utcMonth.count(d3.utcYear(d.on), d.on)) / 3}
        y="value"
        tip={true}
      />
    </Replot>
  );
}
