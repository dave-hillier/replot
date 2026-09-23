import {Replot, RectY, binX} from "../../src/react/api.js";

export async function binStrings() {
  return (
    <Replot>
      <RectY data={["9.6", "9.6", "14.8", "14.8", "7.2"]} {...binX()} />
    </Replot>
  );
}
