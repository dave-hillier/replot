import {Replot, Frame} from "../../src/react/api.js";

export async function empty() {
  return (
    <Replot grid={true} inset={6} x={{type: "linear"}} y={{type: "linear"}}>
      <Frame />
      {/* TODO: arrow fn marks — undefined, null, () => null, () => undefined, () => svg`<circle cx=50% cy=50% r=5 fill=green>` */}
    </Replot>
  );
}
