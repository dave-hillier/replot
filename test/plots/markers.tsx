import {Replot, RuleX, RuleY, TickX, TickY, LineY} from "../../src/react/api.js";

export async function markerDasharray() {
  return (
    <Replot axis={null} inset={20}>
      <LineY
        data={[
          [0, 5],
          [5, 2],
          [10, 0]
        ]}
        x={(d: number[]) => d[0]}
        y={(d: number[]) => d[1]}
        strokeDasharray="1,10"
        strokeWidth={3}
        markerStart="dot"
        markerMid="arrow"
        markerEnd="circle-stroke"
      />
    </Replot>
  );
}

export async function markerRuleX() {
  return (
    <Replot>
      <RuleX data={[1, 2, 3]} marker="arrow-reverse" inset={3} />
    </Replot>
  );
}

export async function markerRuleY() {
  return (
    <Replot>
      <RuleY data={[1, 2, 3]} marker="arrow-reverse" inset={3} />
    </Replot>
  );
}

export async function markerTickX() {
  return (
    <Replot>
      <TickX data={[1, 2, 3]} marker="arrow-reverse" inset={3} />
    </Replot>
  );
}

export async function markerTickY() {
  return (
    <Replot>
      <TickY data={[1, 2, 3]} marker="arrow-reverse" inset={3} />
    </Replot>
  );
}
