import {Replot, RectY, binX} from "../../src/react/api.js";

export async function singleValueBin() {
  return (
    <Replot>
      <RectY data={[3]} {...binX()} />
    </Replot>
  );
}
