import {Replot, RectY} from "../../src/react/api.js";

export async function autoHeightEmpty() {
  return (
    <Replot>
      <RectY data={[]} x="date" y="visitors" fy="path" />
    </Replot>
  );
}
