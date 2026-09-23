import {Replot, Dot} from "../../src/react/api.js";

export async function percentNull() {
  const time = [1, 2, 3, 4, 5];
  const value = [null, null, 1, null, null];
  return (
    <Replot y={{percent: true}}>
      <Dot data={time} x={time} y={value} />
    </Replot>
  );
}
