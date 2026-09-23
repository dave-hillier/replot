import {Replot, Sphere, Graticule} from "../../src/react/api.js";

export async function graticule() {
  return (
    <Replot width={960} height={470} projection={{type: "equal-earth", rotate: [20, 40, 60]}}>
      <Sphere />
      <Graticule />
    </Replot>
  );
}
