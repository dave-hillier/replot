import {Replot, Legend, Dot} from "../../src/react/api.js";

export function styleOverrideLegendCategorical() {
  // This test verifies legend style overrides. The React version uses the
  // Legend component inside a Plot with color scale configuration.
  return (
    <Replot color={{domain: "ABCDEFGHIJ"}} className="style-override">
      <Dot data={Array.from("ABCDEFGHIJ")} fill={(d) => d} x={(d, i) => i} y={() => 0} />
      <Legend {...({scale: "color", label: "Hello"} as any)} />
    </Replot>
  );
}
