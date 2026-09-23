import {Replot, Geo, Text, centroid, geoCentroid} from "../../src/react/api.js";
import * as d3 from "d3";
import {feature} from "topojson-client";

export async function geoText() {
  const london = feature(await d3.json("data/london.json"), "boroughs");
  return (
    <Replot projection={{type: "transverse-mercator", rotate: [2, 0, 0], domain: london}}>
      <Geo data={london} />
      <Text
        data={london.features}
        {...centroid({text: "id", stroke: "var(--plot-background)", fill: "currentColor"})}
      />
    </Replot>
  );
}

/** The geo mark with the tip option. */
export async function geoTip() {
  const [london, boroughs] = await getLondonBoroughs();
  const access = await getLondonAccess();
  return (
    <Replot
      width={900}
      projection={{type: "transverse-mercator", rotate: [2, 0, 0], domain: london}}
      color={{scheme: "RdYlBu", pivot: 0.5}}
    >
      <Geo
        data={access}
        fx="year"
        geometry={(d) => boroughs.get(d.borough)}
        fill="access"
        stroke="var(--plot-background)"
        strokeWidth={0.75}
        channels={{borough: "borough"}}
        tip={true}
      />
    </Replot>
  );
}

/** The geo mark with the tip option and the centroid transform. */
export async function geoTipCentroid() {
  const [london, boroughs] = await getLondonBoroughs();
  const access = await getLondonAccess();
  return (
    <Replot
      width={900}
      projection={{type: "transverse-mercator", rotate: [2, 0, 0], domain: london}}
      color={{scheme: "RdYlBu", pivot: 0.5}}
    >
      <Geo
        data={access}
        {...centroid({
          fx: "year",
          geometry: (d) => boroughs.get(d.borough),
          fill: "access",
          stroke: "var(--plot-background)",
          strokeWidth: 0.75,
          channels: {borough: "borough"},
          tip: true
        })}
      />
    </Replot>
  );
}

/** The geo mark with the tip option and the geoCentroid transform. */
export async function geoTipGeoCentroid() {
  const [london, boroughs] = await getLondonBoroughs();
  const access = await getLondonAccess();
  return (
    <Replot
      width={900}
      projection={{type: "transverse-mercator", rotate: [2, 0, 0], domain: london}}
      color={{scheme: "RdYlBu", pivot: 0.5}}
    >
      <Geo
        data={access}
        {...geoCentroid({
          fx: "year",
          geometry: (d) => boroughs.get(d.borough),
          fill: "access",
          stroke: "var(--plot-background)",
          strokeWidth: 0.75,
          channels: {borough: "borough"},
          tip: true
        })}
      />
    </Replot>
  );
}

function getFirstPoint(feature) {
  return feature.geometry.type === "Polygon"
    ? feature.geometry.coordinates[0][0]
    : feature.geometry.coordinates[0][0][0];
}

/** The geo mark with the tip option, x and y channels and a projection. */
export async function geoTipXY() {
  const [london, boroughs] = await getLondonBoroughs();
  const access = await getLondonAccess();
  return (
    <Replot
      width={900}
      projection={{type: "transverse-mercator", rotate: [2, 0, 0], domain: london}}
      color={{scheme: "RdYlBu", pivot: 0.5}}
    >
      <Geo
        data={access}
        x={(d) => getFirstPoint(boroughs.get(d.borough))[0]}
        y={(d) => getFirstPoint(boroughs.get(d.borough))[1]}
        fx="year"
        geometry={(d) => boroughs.get(d.borough)}
        fill="access"
        stroke="var(--plot-background)"
        strokeWidth={0.75}
        channels={{borough: "borough"}}
        tip={true}
      />
    </Replot>
  );
}

/** The geo mark with the tip option, and scaled x and y channels. */
export async function geoTipScaled() {
  const [, boroughs] = await getLondonBoroughs();
  const access = await getLondonAccess();
  return (
    <Replot width={900} height={265} color={{scheme: "RdYlBu", pivot: 0.5}}>
      <Geo
        data={access}
        {...centroid({
          fx: "year",
          geometry: (d) => boroughs.get(d.borough),
          fill: "access",
          stroke: "var(--plot-background)",
          strokeWidth: 0.75,
          channels: {borough: "borough"},
          tip: true
        })}
      />
    </Replot>
  );
}

async function getLondonBoroughs() {
  const london = feature(await d3.json("data/london.json"), "boroughs");
  const boroughs = new Map(london.features.map((d) => [d.id, d]));
  return [london, boroughs];
}

async function getLondonAccess() {
  return (await d3.csv<any>("data/london-car-access.csv", d3.autoType)).flatMap(({borough, y2001, y2011, y2021}) => [
    {borough, year: "2001", access: y2001},
    {borough, year: "2011", access: y2011},
    {borough, year: "2021", access: y2021}
  ]);
}
