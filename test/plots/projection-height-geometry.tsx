import {Replot, Geo, Frame, Graticule, Sphere} from "../../src/react/api.js";

const shape = {
  type: "LineString",
  coordinates: Array.from({length: 201}, (_, i) => {
    const angle = (i / 100) * Math.PI;
    const r = (i % 2) + 5;
    return [300 + 30 * r * Math.cos(angle), 185 + 30 * r * Math.sin(angle)];
  })
} as const;

export async function projectionHeightGeometry() {
  return (
    <Replot facet={{data: [0, 1], y: [0, 1]}} projection="identity">
      <Geo data={shape} />
      <Frame stroke="red" strokeDasharray={4} />
    </Replot>
  );
}

export async function projectionHeightDegenerate() {
  return (
    <Replot style="border: #777 1px solid;" projection="mercator" height={400} inset={199.5}>
      <Graticule />
      <Sphere />
    </Replot>
  );
}

export async function projectionHeightGeometryDomain() {
  return (
    <Replot projection={{type: "identity", domain: shape}}>
      <Geo data={shape} />
      <Frame stroke="red" strokeDasharray={4} />
    </Replot>
  );
}

export async function projectionHeightGeometryNull() {
  return (
    <Replot aspectRatio={true} width={400} facet={{data: [0, 1], y: [0, 1]}}>
      <Geo data={shape} />
      <Frame stroke="red" strokeDasharray={4} />
    </Replot>
  );
}
