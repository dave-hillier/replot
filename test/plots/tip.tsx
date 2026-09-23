import React, {useEffect, useRef} from "react";
import {
  Replot,
  AreaY,
  Dot,
  DotX,
  LineX,
  LineY,
  RectY,
  RuleX,
  Tip,
  Frame,
  Geo,
  Raster,
  Cell,
  BarX,
  BarY,
  BoxX,
  Hexagon,
  Crosshair,
  CrosshairX,
  binX,
  groupY,
  groupX,
  group,
  dodgeY,
  hexbin,
  centroid,
  geoCentroid,
  pointer,
  identity
} from "../../src/react/api.js";
import * as d3 from "d3";
import {feature, mesh} from "topojson-client";

function DispatchPointerMove({x, y, children}: {x: number; y: number; children?: React.ReactNode}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const id = window.setTimeout(() => {
      const svg = ref.current?.querySelector("svg");
      if (!svg) return;
      const r = svg.getBoundingClientRect();
      svg.dispatchEvent(
        new PointerEvent("pointermove", {pointerType: "mouse", clientX: r.left + x, clientY: r.top + y, bubbles: true})
      );
    }, 50);
    return () => window.clearTimeout(id);
  }, [x, y]);
  return React.createElement("div", {ref}, children);
}

export async function tipDispatch() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return React.createElement(
    DispatchPointerMove,
    {x: 200, y: 200},
    React.createElement(
      Replot,
      {},
      React.createElement(Dot, {
        data: penguins,
        x: "culmen_length_mm",
        y: "culmen_depth_mm",
        title: "island",
        tip: true
      })
    )
  );
}

export async function tipNull() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return React.createElement(
    DispatchPointerMove,
    {x: 200, y: 200},
    React.createElement(
      Replot,
      {},
      React.createElement(Dot, {
        data: penguins,
        x: "culmen_length_mm",
        y: "culmen_depth_mm",
        title: (d: any) => (d.island === "Torgersen" ? null : d.island),
        tip: true
      })
    )
  );
}

export async function tipAnchors() {
  const anchors = [
    "top",
    "right",
    "bottom",
    "left",
    "top-left",
    "top-right",
    "bottom-right",
    "bottom-left",
    "middle"
  ] as const;
  return React.createElement(
    Replot,
    {style: "overflow: visible;", height: 160},
    React.createElement(Frame, {strokeOpacity: 0.2}),
    ...anchors.flatMap((anchor) => [
      React.createElement(Dot, {data: {length: 1}, frameAnchor: anchor, fill: "blue"}),
      React.createElement(Tip, {data: [anchor], frameAnchor: anchor, anchor})
    ])
  );
}

export async function tipBoxX() {
  const morley = await d3.csv<any>("data/morley.csv", d3.autoType);
  return React.createElement(Replot, {}, React.createElement(BoxX, {data: morley, x: "Speed", y: "Expt", tip: true}));
}

export async function tipCrosshair() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return React.createElement(
    Replot,
    {y: {grid: true}},
    React.createElement(LineY, {data: aapl, x: "Date", y: "Close", tip: true}),
    React.createElement(CrosshairX, {data: aapl, x: "Date", y: "Close"})
  );
}

export async function tipCrosshairFacet() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return React.createElement(
    Replot,
    {grid: true},
    React.createElement(Dot, {data: penguins, x: "culmen_length_mm", y: "culmen_depth_mm", fy: "species"}),
    React.createElement(Crosshair, {data: penguins, x: "culmen_length_mm", y: "culmen_depth_mm", fy: "species"})
  );
}

export async function tipPool() {
  const cars = await d3.csv<any>("data/cars.csv", d3.autoType);
  return React.createElement(
    Replot,
    {},
    React.createElement(Hexagon, {
      data: cars,
      ...hexbin({fill: "count"}, {x: "power (hp)", y: "economy (mpg)", tip: true})
    }),
    React.createElement(Dot, {data: cars, x: "power (hp)", y: "economy (mpg)", tip: true})
  );
}

export async function tipPoolFacet() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return React.createElement(
    Replot,
    {grid: true},
    React.createElement(Dot, {
      data: penguins,
      ...hexbin({}, {x: "culmen_length_mm", y: "culmen_depth_mm", fy: "species", tip: true})
    }),
    React.createElement(Dot, {
      data: penguins,
      x: "culmen_length_mm",
      y: "culmen_depth_mm",
      fy: "species",
      fill: "sex",
      tip: true
    })
  );
}

export async function tipAreaBand() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot>
      <AreaY data={aapl} x="Date" y1="Low" y2="High" tip={true} curve="step" stroke="currentColor" />
    </Replot>
  );
}

export async function tipAreaStack() {
  const industries = await d3.csv<any>("data/bls-industry-unemployment.csv", d3.autoType);
  return (
    <Replot marginLeft={50}>
      <AreaY data={industries} x="date" y="unemployed" fill="industry" tip={true} />
    </Replot>
  );
}

export async function tipBar() {
  const olympians = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot marginLeft={100}>
      <BarX data={olympians} {...groupY({x: "count"}, {y: "sport", sort: {y: "x"}, tip: true})} />
    </Replot>
  );
}

export async function tipBin() {
  const olympians = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot>
      <RectY data={olympians} {...binX({y: "count"}, {x: "weight", tip: true})} />
    </Replot>
  );
}

export async function tipBinStack() {
  const olympians = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot>
      <RectY data={olympians} {...binX({y: "count", sort: "z"}, {x: "weight", fill: "sex", tip: true})} />
    </Replot>
  );
}

export async function tipCell() {
  const olympians = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot height={400} marginLeft={100} color={{scheme: "blues"}}>
      <Cell data={olympians} {...group({fill: "count"}, {x: "sex", y: "sport", tip: "y"})} />
    </Replot>
  );
}

export async function tipCellFacet() {
  const olympians = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot height={400} marginLeft={100} color={{scheme: "blues"}}>
      <Cell data={olympians} {...groupY({fill: "count"}, {fx: "sex", y: "sport", tip: "y"})} />
    </Replot>
  );
}

export async function tipDodge() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot height={160}>
      <Dot data={penguins} {...dodgeY({x: "culmen_length_mm", r: "body_mass_g", tip: true})} />
    </Replot>
  );
}

export async function tipDot() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot>
      <Dot data={penguins} x="culmen_length_mm" y="culmen_depth_mm" stroke="sex" tip={true} />
    </Replot>
  );
}

export async function tipDotX() {
  return (
    <Replot>
      <DotX data={d3.range(10)} tip={true} />
    </Replot>
  );
}

export async function tipDotFacets() {
  const athletes = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot
      grid={true}
      fy={{
        label: "decade of birth",
        interval: "10 years"
      }}
    >
      <Dot data={athletes} x="weight" y="height" fx="sex" fy="date_of_birth" stroke="#aaa" filter={(d) => !d.info} />
      <Dot
        data={athletes}
        x="weight"
        y="height"
        fx="sex"
        fy="date_of_birth"
        filter={(d) => d.info}
        title={(d) => [d.name, d.info].join("\n")}
        tip={true}
      />
    </Replot>
  );
}

export async function tipDotFilter() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  const xy = {x: "culmen_length_mm", y: "culmen_depth_mm", stroke: "sex"};
  return (
    <Replot>
      <Dot data={penguins} {...xy} filter={(d) => d.sex === "MALE"} tip={true} />
      <Dot data={penguins} {...xy} filter={(d) => d.sex === "FEMALE"} tip={true} />
    </Replot>
  );
}

export async function tipGeoNoProjection() {
  const counties = await d3.json<any>("data/us-counties-10m.json").then((us) => feature(us, us.objects.counties));
  counties.features = counties.features.filter((d) => {
    const [x, y] = d3.geoCentroid(d);
    return x > -126 && x < -68 && y > 25 && y < 49;
  });
  return (
    <Replot>
      <Geo data={counties} {...centroid({title: (d) => d.properties.name, tip: true})} />
    </Replot>
  );
}

export async function tipGeoProjection() {
  const counties = await d3.json<any>("data/us-counties-10m.json").then((us) => feature(us, us.objects.counties));
  counties.features = counties.features.filter((d) => {
    const [x, y] = d3.geoCentroid(d);
    return x > -126 && x < -68 && y > 25 && y < 49;
  });
  return (
    <Replot projection="albers">
      <Geo data={counties} {...centroid({title: (d) => d.properties.name, tip: true})} />
    </Replot>
  );
}

export async function tipGeoCentroid() {
  const [[counties, countymesh]] = await Promise.all([
    d3
      .json<any>("data/us-counties-10m.json")
      .then((us) => [feature(us, us.objects.counties), mesh(us, us.objects.counties)])
  ]);
  // Alternatively, using centroid (slower):
  // const pntr = pointer(centroid());
  const {x, y} = geoCentroid();
  const pntr = pointer({px: x, py: y, x, y});
  return (
    <Replot width={960} height={600} projection="albers-usa">
      <Geo data={countymesh} />
      <Geo data={counties} {...pntr} stroke="red" strokeWidth={2} />
      <Tip data={counties.features} {...pntr} channels={{name: (d) => d.properties.name}} />
    </Replot>
  );
}

export async function tipGroupPrimitives() {
  return (
    <Replot height={80} x={{type: "band"}}>
      <BarY data="de156a2fc8" {...groupX({y: "count"}, {x: (d) => d, tip: true})} />
    </Replot>
  );
}

export async function tipHexbin() {
  const olympians = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot>
      <Hexagon data={olympians} {...hexbin({r: "count"}, {x: "weight", y: "height", tip: true})} />
    </Replot>
  );
}

// Normally you would slap a tip: true on the hexagon, as above, but here we
// want to test that the hexbin transform isn’t applying an erroneous stroke:
// none to the tip options (which would change the tip appearance).
export async function tipHexbinExplicit() {
  const olympians = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot>
      <Hexagon data={olympians} {...hexbin({fill: "count"}, {x: "weight", y: "height"})} />
      <Tip data={olympians} {...pointer(hexbin({fill: "count"}, {x: "weight", y: "height"}))} />
    </Replot>
  );
}

export async function tipLineX() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot>
      <LineX data={aapl} y="Date" x="Close" tip={true} />
    </Replot>
  );
}

export async function tipLineY() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot>
      <LineY data={aapl} x="Date" y="Close" tip={true} />
    </Replot>
  );
}

export async function tipLongText() {
  return (
    <Replot>
      <Tip data={[{x: "Long sentence that gets cropped after a certain length"}]} x="x" />
    </Replot>
  );
}

export async function tipNewLines() {
  return (
    <Replot height={40} style="overflow: visible;" x={{axis: "top", label: null}}>
      <Tip
        data={[
          {x: "after", label: `Hello\n\n`},
          {x: "before", label: `\n\nWorld`},
          {x: "between", label: `{\n\n}`}
        ]}
        x="x"
        anchor="top"
        title="label"
      />
      <Tip data={[{x: "no name"}]} x="x" channels={{a: ["first"], b: ["second"], "": [""]}} />
    </Replot>
  );
}

export async function tipRaster() {
  const ca55 = await d3.csv<any>("data/ca55-south.csv", d3.autoType);
  const domain = {type: "MultiPoint", coordinates: ca55.map((d) => [d.GRID_EAST, d.GRID_NORTH])} as const;
  return (
    <Replot width={640} height={484} projection={{type: "reflect-y", inset: 3, domain}} color={{type: "diverging"}}>
      <Raster data={ca55} x="GRID_EAST" y="GRID_NORTH" fill="MAG_IGRF90" interpolate="nearest" tip={true} />
    </Replot>
  );
}

export async function tipRule() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot>
      <RuleX data={penguins} x="body_mass_g" tip={true} />
    </Replot>
  );
}

export async function tipRuleAnchored() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot x={{insetLeft: 110}}>
      <RuleX data={penguins} x="body_mass_g" />
      <Tip data={penguins} {...pointer({px: "body_mass_g", frameAnchor: "left", anchor: "middle", dx: 42})} />
    </Replot>
  );
}

export async function tipTransform() {
  return (
    <Replot width={245} color={{percent: true, legend: true}}>
      <DotX data={[0, 0.1, 0.3, 1]} fill={identity} r={10} frameAnchor="middle" tip={true} />
    </Replot>
  );
}

export async function tipFacetX() {
  const data = d3.range(100).map((i) => ({f: i > 60 || i % 2 ? "b" : "a", x: i, y: i / 10}));
  return (
    <Replot inset={10} y={{domain: [0, 7]}}>
      <Frame />
      <Dot data={data} fy="f" x="x" y="y" tip="x" fill="f" />
      <Dot
        data={[
          {f: "a", y: 3},
          {f: "b", y: 1}
        ]}
        fy="f"
        x={90}
        y="y"
        r={30}
        fill="f"
        fillOpacity={0.1}
        stroke="currentColor"
        strokeDasharray={4}
      />
    </Replot>
  );
}

export async function tipColorLiteral() {
  const penguins = await d3.csv<any>("data/penguins.csv", d3.autoType);
  return (
    <Replot grid={true}>
      <Dot
        data={penguins}
        x="culmen_length_mm"
        y="culmen_depth_mm"
        fill={(d) => (d.species === "Adelie" ? "orange" : "steelblue")}
        tip={true}
      />
    </Replot>
  );
}
