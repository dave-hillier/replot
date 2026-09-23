import {Replot, BarX, Frame} from "../../src/react/api.js";

export async function tickFormatEmptyDomain() {
  return (
    <Replot y={{tickFormat: "%W"}}>
      <BarX data={[]} />
      <Frame />
    </Replot>
  );
}

export async function tickFormatEmptyFacetDomain() {
  return (
    <Replot fy={{tickFormat: "%W"}}>
      <BarX data={[]} />
      <Frame />
    </Replot>
  );
}
