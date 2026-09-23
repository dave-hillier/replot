import {Replot, RectY, groupX} from "../../src/react/api.js";

export async function groupedRects() {
  return (
    <Replot>
      <RectY data={{length: 10}} {...groupX({y: "count"}, {x: (d, i) => "ABCDEFGHIJ"[i]})} />
    </Replot>
  );
}
