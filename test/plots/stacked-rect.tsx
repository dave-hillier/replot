import {Replot, RectX} from "../../src/react/api.js";

export async function stackedRect() {
  return (
    <Replot
      x={{
        tickFormat: "%"
      }}
    >
      <RectX data={{length: 20}} x={(d, i) => i} fill={(d, i) => i} insetLeft={1} offset="normalize" />
    </Replot>
  );
}
