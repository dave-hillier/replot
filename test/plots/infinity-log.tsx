import {Replot, DotX} from "../../src/react/api.js";

export async function infinityLog() {
  return (
    <Replot x={{type: "log", tickFormat: "f"}}>
      <DotX data={[NaN, 0.2, 0, 1, 2, 1 / 0]} />
    </Replot>
  );
}
