import {Replot, RuleX, dodgeY} from "../../src/react/api.js";

export async function dodgeRule() {
  return (
    <Replot>
      <RuleX data={[1, 2, 3]} {...dodgeY()} />
    </Replot>
  );
}
