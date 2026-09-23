import {Replot, BarY} from "../../src/react/api.js";

export async function emptyFacet() {
  const data = [
    {PERIOD: 1, VALUE: 3, TYPE: "c"},
    {PERIOD: 2, VALUE: 4, TYPE: "c"}
  ];
  return (
    <Replot facet={{data, x: "TYPE"}} fx={{domain: ["a", "b"]}}>
      <BarY data={data} x="PERIOD" y="VALUE" />
    </Replot>
  );
}
