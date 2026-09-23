import {Replot, Sphere, Graticule, Link} from "../../src/react/api.js";

export async function geoLink() {
  const xy = {x1: [-122.4194], y1: [37.7749], x2: [2.3522], y2: [48.8566]};
  return (
    <Replot projection="equal-earth">
      <Sphere />
      <Graticule />
      <Link data={{length: 1}} curve="linear" strokeOpacity={0.3} {...xy} />
      <Link data={{length: 1}} markerEnd="arrow" {...xy} />
    </Replot>
  );
}
