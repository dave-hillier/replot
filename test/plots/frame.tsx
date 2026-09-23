import {Replot, Frame, Dot, Text, GridX, GridY, AxisX, AxisY, AxisFx} from "../../src/react/api.js";
import * as d3 from "d3";

export async function frameFillCategorical() {
  return (
    <Replot color={{legend: true}}>
      <Frame fill="foo" />
      <Frame fill="bar" inset={5} />
      <Frame fill="baz" inset={10} />
      <Frame fill="white" inset={15} />
    </Replot>
  );
}

export async function frameFillQuantitative() {
  return (
    <Replot color={{type: "linear", legend: true}}>
      {d3.range(11).map((t, i) => (
        <Frame key={i} fill={t} inset={i} />
      ))}
      <Frame fill="white" inset={11} />
    </Replot>
  );
}

export async function frameFacet() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot marginLeft={80} inset={10}>
      <Frame fy="Gentoo" />
      <Dot data={penguins} x="body_mass_g" fy="species" />
    </Replot>
  );
}

export async function frameCorners() {
  return (
    <Replot>
      <Frame rx={16} ry={10} />
    </Replot>
  );
}

const marks = [
  <Frame key="left" anchor="left" stroke="red" strokeWidth={4} />,
  <Frame key="right" anchor="right" stroke="green" strokeWidth={4} />,
  <Frame key="top" anchor="top" stroke="blue" strokeWidth={4} />,
  <Frame key="bottom" anchor="bottom" stroke="black" strokeWidth={4} />
];

export async function frameSides() {
  return (
    <Replot width={350} height={250} margin={2}>
      {marks}
    </Replot>
  );
}

export async function frameSidesXY() {
  return (
    <Replot width={350} height={250} x={{domain: [0, 1]}} y={{domain: [0, 1]}}>
      {marks}
    </Replot>
  );
}

export async function frameSidesX() {
  return (
    <Replot width={350} height={250} x={{domain: [0, 1]}}>
      {marks}
    </Replot>
  );
}

export async function frameSidesY() {
  return (
    <Replot width={350} height={250} y={{domain: [0, 1]}}>
      {marks}
    </Replot>
  );
}

export async function futureSplom() {
  const data = {columns: ["A", "B", "C"]};
  return (
    <Replot
      width={400}
      height={400}
      fx={{domain: data.columns, axis: null}}
      fy={{domain: data.columns, axis: null}}
      x={{type: "linear", domain: [-1.5, 1.5]}}
      y={{type: "linear", domain: [-1.5, 1.5]}}
    >
      <GridX ticks={7} />
      <GridY ticks={7} />
      <AxisX facetAnchor="bottom" ticks={3} />
      <AxisY facetAnchor="left" ticks={3} />
      <Text
        data={d3.cross(data.columns, data.columns).filter(([key1, key2]) => key2 !== key1)}
        fx="0"
        fy="1"
        text={() => "*"}
        frameAnchor="middle"
      />
      <AxisFx label={null} frameAnchor="middle" dy={10} facetAnchor="empty" />
      <Frame facetAnchor="empty" />
    </Replot>
  );
}
