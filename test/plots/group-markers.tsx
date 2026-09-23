import {Replot, Line} from "../../src/react/api.js";
import {range} from "d3";

export async function groupMarker() {
  return (
    <Replot aspectRatio={1} axis={null} inset={30}>
      <Line
        data={range(20, 200)}
        x={(i) => i * Math.sin(i / 40 + ((i % 5) * 2 * Math.PI) / 5)}
        y={(i) => i * Math.cos(i / 40 + ((i % 5) * 2 * Math.PI) / 5)}
        stroke={(i) => `arrow ${i % 5}`}
        strokeWidth={(i) => Math.round(1 + i / 40)}
        marker="dot"
      />
    </Replot>
  );
}

export async function groupMarkerStart() {
  return (
    <Replot aspectRatio={1} axis={null} inset={30}>
      <Line
        data={range(500, 0, -1)}
        x={(i) => i * Math.sin(i / 100 + ((i % 5) * 2 * Math.PI) / 5)}
        y={(i) => i * Math.cos(i / 100 + ((i % 5) * 2 * Math.PI) / 5)}
        stroke={(i) => `arrow ${i % 5}`}
        strokeWidth={(i) => i / 100}
        markerStart="circle-stroke"
      />
    </Replot>
  );
}

export async function groupMarkerMid() {
  return (
    <Replot aspectRatio={1} axis={null} inset={30}>
      <Line
        data={range(20, 200)}
        x={(i) => i * Math.sin(i / 40 + ((i % 5) * 2 * Math.PI) / 5)}
        y={(i) => i * Math.cos(i / 40 + ((i % 5) * 2 * Math.PI) / 5)}
        stroke={(i) => `arrow ${i % 5}`}
        strokeWidth={(i) => Math.round(i / 40)}
        markerMid="dot"
      />
    </Replot>
  );
}

export async function groupMarkerEnd() {
  return (
    <Replot aspectRatio={1} axis={null} inset={30}>
      <Line
        data={range(500)}
        x={(i) => i * Math.sin(i / 100 + ((i % 5) * 2 * Math.PI) / 5)}
        y={(i) => i * Math.cos(i / 100 + ((i % 5) * 2 * Math.PI) / 5)}
        stroke={(i) => `arrow ${i % 5}`}
        strokeWidth={(i) => i / 100}
        markerEnd="arrow"
      />
    </Replot>
  );
}
