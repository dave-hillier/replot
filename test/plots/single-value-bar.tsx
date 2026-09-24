import {Replot, BarY, RuleX} from "../../src/react/api.js";

export async function singleValueBar() {
  return (
    <Replot>
      <BarY data={{length: 1}} x={["foo"]} y1={[0]} y2={[0]} />
      <RuleX data={["foo"]} stroke="red" y1={[0]} y2={[0]} />
    </Replot>
  );
}
