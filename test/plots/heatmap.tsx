import {Replot, Raster, Frame, RuleX, RuleY, Rect} from "../../src/react/api.js";
import * as d3 from "d3";

export async function heatmap() {
  return (
    <Replot color={{type: "diverging"}}>
      <Raster
        fill={(x, y) => x * y * Math.sin(x) * Math.cos(y)}
        x1={0}
        y1={0}
        x2={4 * Math.PI}
        y2={4 * Math.PI * (350 / 580)}
        pixelSize={3}
      />
      <Frame />
    </Replot>
  );
}

export async function heatmapArray() {
  const x1 = 0;
  const y1 = 0;
  const x2 = 4 * Math.PI;
  const y2 = 4 * Math.PI * (350 / 580);
  const pixelSize = 3;
  const width = Math.round(580 / pixelSize);
  const height = Math.round(350 / pixelSize);
  const x = (f => i => f.invert(i % width + 0.5))(d3.scaleLinear([x1, x2], [0, width])); // prettier-ignore
  const y = (f => i => f.invert(Math.floor(i / width) + 0.5))(d3.scaleLinear([y2, y1], [height, 0])); // prettier-ignore
  return (
    <Replot color={{type: "diverging"}}>
      <Raster
        data={d3.range(width * height)}
        fill={((f) => (_, i) => f(x(i), y(i)))((x, y) => x * y * Math.sin(x) * Math.cos(y)) /* prettier-ignore */}
        x={x}
        y={y}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        width={width}
        height={height}
      />
      <Frame />
    </Replot>
  );
}

export async function heatmapLog() {
  return (
    <Replot
      height={630}
      x={{ticks: 10, tickFormat: "+f"}}
      y={{ticks: 10, tickFormat: "+f"}}
      color={{type: "log", scheme: "magma"}}
    >
      <Raster
        fill={(x, y) =>
          (1 + (x + y + 1) ** 2 * (19 - 14 * x + 3 * x ** 2 - 14 * y + 6 * x * y + 3 * y ** 2)) *
          (30 + (2 * x - 3 * y) ** 2 * (18 - 32 * x + 12 * x * x + 48 * y - 36 * x * y + 27 * y ** 2))
        }
        x1={-2}
        y1={-2.5}
        x2={2}
        y2={1.5}
        pixelSize={4}
      />
      <RuleX data={[0]} strokeOpacity={0.2} />
      <RuleY data={[0]} strokeOpacity={0.2} />
      <Frame />
    </Replot>
  );
}

export async function heatmapPartial() {
  return (
    <Replot axis={null}>
      <Raster x1={-7} x2={7} y1={-7} y2={7} fill={(x, y) => Math.atan2(y, x)} pixelSize={2} />
      <Rect data={{length: 1}} x1={-10} x2={10} y1={-10} y2={10} stroke="currentColor" />
    </Replot>
  );
}

export async function heatmapFillOpacity() {
  return (
    <Replot axis={null}>
      <Raster
        x1={-1}
        y1={-1}
        x2={1}
        y2={1}
        fill={(x, y) => Math.atan2(y, x)}
        fillOpacity={(x, y) => Math.PI - Math.atan2(y, x)}
        pixelSize={2}
      />
    </Replot>
  );
}

export async function heatmapOpacity() {
  return (
    <Replot axis={null}>
      <Raster
        x1={-1}
        y1={-1}
        x2={1}
        y2={1}
        fill="red"
        fillOpacity={(x, y) => Math.PI - Math.atan2(y, x)}
        pixelSize={2}
      />
    </Replot>
  );
}

export async function heatmapConstantOpacity() {
  return (
    <Replot axis={null}>
      <Raster x1={-1} y1={-1} x2={1} y2={1} fill={(x, y) => Math.atan2(y, x)} fillOpacity={0.5} pixelSize={2} />
    </Replot>
  );
}

export async function heatmapFaceted() {
  function lin(x) {
    return x / (4 * Math.PI);
  }
  return (
    <Replot
      height={580}
      color={{type: "diverging"}}
      fx={{tickFormat: (f) => f?.name}}
      fy={{tickFormat: (f) => f?.name}}
    >
      <Raster
        fill={(x, y, {fx, fy}) => fx(x) * fy(y)}
        fx={[Math.sin, Math.sin, lin, lin]}
        fy={[Math.cos, lin, lin, Math.cos]}
        x1={0}
        y1={0}
        x2={4 * Math.PI}
        y2={4 * Math.PI}
        pixelSize={2}
      />
      <Frame />
    </Replot>
  );
}

export function mandelbrot() {
  return (
    <Replot height={500}>
      <Raster
        fill={(x, y) => {
          for (let n = 0, zr = 0, zi = 0; n < 80; ++n) {
            [zr, zi] = [zr * zr - zi * zi + x, 2 * zr * zi + y];
            if (zr * zr + zi * zi > 4) return n;
          }
        }}
        x1={-2}
        y1={-1.164}
        x2={1}
        y2={1.164}
      />
    </Replot>
  );
}

export function mandelbrotClip() {
  return (
    <Replot
      height={500}
      clip={{
        type: "Polygon",
        coordinates: [
          [
            [-2, 0],
            [0, 1.5],
            [1, 0],
            [0, -1.5],
            [-2, 0]
          ]
        ]
      }}
    >
      <Raster
        fill={(x, y) => {
          for (let n = 0, zr = 0, zi = 0; n < 80; ++n) {
            [zr, zi] = [zr * zr - zi * zi + x, 2 * zr * zi + y];
            if (zr * zr + zi * zi > 4) return n;
          }
        }}
        x1={-2}
        y1={-1.164}
        x2={1}
        y2={1.164}
      />
    </Replot>
  );
}
