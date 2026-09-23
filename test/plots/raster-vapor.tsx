import {Replot, Raster, Contour, Sphere, Geo, identity} from "../../src/react/api.js";
import * as d3 from "d3";
import {feature} from "topojson-client";

async function vapor() {
  return d3
    .csvParseRows(await d3.text("data/water-vapor.csv"))
    .flat()
    .map((x) => (x === "99999.0" ? NaN : +x));
}

export async function rasterVapor() {
  return (
    <Replot color={{scheme: "blues"}} x={{transform: (x) => x - 180}} y={{transform: (y) => 90 - y}}>
      <Raster data={await vapor()} width={360} height={180} />
    </Replot>
  );
}

export async function rasterVapor2() {
  return (
    <Replot color={{scheme: "blues", legend: true}} x={{transform: (x) => x - 180}} y={{transform: (y) => 90 - y}}>
      <Raster data={await vapor()} width={360} height={180} />
      <Raster
        data={await vapor()}
        width={360}
        height={180}
        fill={{value: (d) => (d > 4 ? "red" : null), scale: null}}
      />
    </Replot>
  );
}

export async function contourVapor() {
  return (
    <Replot width={960} projection="equal-earth" color={{scheme: "blues"}}>
      <Contour
        data={await vapor()}
        fill={identity}
        width={360}
        height={180}
        x1={-180}
        y1={90}
        x2={180}
        y2={-90}
        interval={0.25}
        blur={0.5}
        stroke="currentColor"
        strokeWidth={0.5}
        clip="sphere"
      />
      <Sphere />
    </Replot>
  );
}

export async function contourVaporClip() {
  const [world, data] = await Promise.all([d3.json<any>("data/countries-50m.json"), vapor()]);
  const land = feature(world, world.objects.land);
  return (
    <Replot width={960} projection={{type: "orthographic", rotate: [0, -90]}} color={{scheme: "blues"}}>
      <Sphere fill="#eee" />
      <Raster
        data={data}
        fill={identity}
        interpolate="random-walk"
        width={360}
        height={180}
        x1={-180}
        y1={90}
        x2={180}
        y2={-90}
        blur={1}
        pixelSize={3}
        clip={land}
      />
      <Contour
        data={data}
        value={identity}
        width={360}
        height={180}
        x1={-180}
        y1={90}
        x2={180}
        y2={-90}
        blur={0.5}
        stroke="black"
        strokeWidth={0.5}
        clip={land}
      />
      <Geo data={land} stroke="black" />
      <Sphere stroke="black" />
    </Replot>
  );
}

export async function rasterVaporPeters() {
  const radians = Math.PI / 180;
  const sin = (y) => Math.sin(y * radians);
  const asin = (y) => Math.asin(y) / radians;
  return (
    <Replot
      width={Math.floor(30 + (500 * Math.PI) / 2)}
      height={500 + 20}
      marginLeft={30}
      marginBottom={20}
      y={{
        transform: sin,
        ticks: d3.ticks(-80, 80, 10).map(sin),
        tickFormat: (y) => Math.round(asin(y))
      }}
      color={{
        scheme: "blues"
      }}
    >
      <Raster data={await vapor()} width={360} height={180} x1={-180} y1={90} x2={180} y2={-90} interpolate="nearest" />
    </Replot>
  );
}

export async function rasterVaporEqualEarth() {
  return (
    <Replot projection="equal-earth" color={{scheme: "blues"}}>
      <Raster
        data={await vapor()}
        width={360}
        height={180}
        x1={-180}
        y1={90}
        x2={180}
        y2={-90}
        interpolate="random-walk"
        clip="sphere"
      />
      <Sphere />
    </Replot>
  );
}

export async function rasterVaporEqualEarthBarycentric() {
  return (
    <Replot projection="equal-earth" color={{scheme: "blues"}}>
      <Raster
        data={await vapor()}
        width={360}
        height={180}
        x1={-180}
        y1={90}
        x2={180}
        y2={-90}
        interpolate="barycentric"
        clip="sphere"
      />
      <Sphere />
    </Replot>
  );
}
