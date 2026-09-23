import {Replot, Frame} from "../../src/react/api.js";

export async function emptyLegend() {
  return (
    <Replot
      color={{
        legend: true // ignored because no color scale
      }}
    >
      <Frame />
    </Replot>
  );
}
