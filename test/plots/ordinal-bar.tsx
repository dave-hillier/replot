import {Replot, BarY, RuleY} from "../../src/react/api.js";

export async function ordinalBar() {
  return (
    <Replot
      y={{
        grid: true
      }}
    >
      <BarY data="ABCDEF" />
      <RuleY data={[0]} />
    </Replot>
  );
}
