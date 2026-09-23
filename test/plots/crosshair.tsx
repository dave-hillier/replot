import {
  Replot,
  Dot,
  CrosshairX,
  Crosshair,
  Hexagon,
  LineY,
  GridX,
  AxisX,
  dodgeY,
  hexbin,
  pointerX
} from "../../src/react/api.js";
import * as d3 from "d3";

export async function crosshairDodge() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot height={160}>
      <Dot data={penguins} {...dodgeY({x: "culmen_length_mm", r: "body_mass_g"})} />
      <CrosshairX data={penguins} {...dodgeY({x: "culmen_length_mm", r: "body_mass_g"})} />
    </Replot>
  );
}

export async function crosshairDot() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot>
      <Dot data={penguins} x="culmen_length_mm" y="culmen_depth_mm" stroke="sex" />
      <Crosshair data={penguins} x="culmen_length_mm" y="culmen_depth_mm" />
    </Replot>
  );
}

export async function crosshairDotFacet() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot>
      <Dot data={penguins} x="culmen_length_mm" y="culmen_depth_mm" fy="species" stroke="sex" />
      <Crosshair data={penguins} x="culmen_length_mm" y="culmen_depth_mm" fy="species" />
    </Replot>
  );
}

export async function crosshairHexbin() {
  const olympians = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot>
      <Hexagon data={olympians} {...hexbin({r: "count"}, {x: "weight", y: "height"})} />
      <Crosshair data={olympians} {...hexbin({r: "count"}, {x: "weight", y: "height"})} />
    </Replot>
  );
}

export async function crosshairLine() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot marginLeft={60} marginRight={40}>
      <LineY data={aapl} x="Date" y="Close" />
      <CrosshairX data={aapl} x="Date" y="Close" />
    </Replot>
  );
}

export async function crosshairContinuousX() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot height={270} x={{nice: true}}>
      <LineY data={aapl} x="Date" y="Close" />
      <GridX {...pointerX({ticks: 1000, ariaLabel: `crosshair-x tick`})} />
      <AxisX
        {...pointerX({
          ticks: 1000,
          ariaLabel: `crosshair-x label`,
          tickFormat: `%Y\n%b`,
          textStroke: "var(--plot-background)",
          textStrokeWidth: 5,
          tickSize: 0
        })}
      />
    </Replot>
  );
}
