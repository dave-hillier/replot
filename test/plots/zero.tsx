import {Replot, LineY} from "../../src/react/api.js";

export async function zeroNegativeY() {
  return (
    <Replot y={{zero: true}}>
      <LineY data={[-0.25, -0.15, -0.05]} />
    </Replot>
  );
}

export async function zeroPositiveY() {
  return (
    <Replot y={{zero: true}}>
      <LineY data={[0.25, 0.15, 0.05]} />
    </Replot>
  );
}

export async function zeroPositiveDegenerateY() {
  return (
    <Replot y={{zero: true}}>
      <LineY data={[0.25, 0.25, 0.25]} />
    </Replot>
  );
}

export async function zeroNegativeDegenerateY() {
  return (
    <Replot y={{zero: true}}>
      <LineY data={[-0.25, -0.25, -0.25]} />
    </Replot>
  );
}
