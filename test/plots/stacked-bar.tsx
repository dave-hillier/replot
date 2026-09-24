import {Replot, BarX, stackX} from "../../src/react/api.js";

export async function stackedBar() {
  return (
    <Replot
      x={{
        tickFormat: "%"
      }}
    >
      <BarX
        data={{length: 20}}
        {...stackX({
          x: (d, i) => i,
          fill: (d, i) => i,
          insetLeft: 1,
          offset: "normalize"
        })}
      />
    </Replot>
  );
}
