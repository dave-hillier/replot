import {Replot, DotX} from "../../src/react/api.js";

export async function logDegenerate() {
  return (
    <Replot x={{type: "log"}}>
      <DotX data={[0, 0.1, 1, 2, 10]} />
    </Replot>
  );
}
