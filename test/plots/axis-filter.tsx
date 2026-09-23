import {Replot, Dot, GridX, GridY, AxisX, AxisY} from "../../src/react/api.js";

export async function axisFilter() {
  return (
    <Replot height={100}>
      <Dot
        data={[
          ["A", 0],
          ["B", 2],
          [0, 1]
        ]}
      />
      <GridX filter={(d) => d} />
      <GridY filter={(d) => d} />
      <AxisX filter={(d) => d} />
      <AxisY filter={(d) => d} />
    </Replot>
  );
}
