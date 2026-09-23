import {Replot, Line, AreaY} from "../../src/react/api.js";

export async function integerInterval() {
  const requests = [
    [2, 9],
    [3, 17],
    [3.5, 10],
    [5, 12]
  ];
  return (
    <Replot x={{interval: 1}} y={{zero: true}}>
      <Line data={requests} />
    </Replot>
  );
}

export async function integerIntervalArea() {
  const series = [
    {x: 0, y: 5, type: "a"},
    {x: 5, y: 7, type: "a"},
    {x: 5, y: 9, type: "b"},
    {x: 10, y: 4, type: "b"}
  ];
  return (
    <Replot color={{legend: true}}>
      <AreaY
        data={series}
        interval={5}
        x="x"
        y="y"
        fill="type"
        stroke="type"
        strokeWidth={2}
        fillOpacity={0.7}
        tip={true}
      />
    </Replot>
  );
}

export async function integerIntervalAreaZ() {
  const series = [
    {x: 0, y: 5, type: "a", category: "P"},
    {x: 1, y: 7, type: "a", category: "P"},
    {x: 1, y: 9, type: "b", category: "P"},
    {x: 2, y: 4, type: "b", category: "P"},
    {x: 1, y: 1, type: "c", category: "R"},
    {x: 3, y: 7, type: "c", category: "R"}
  ];
  return (
    <Replot x={{interval: 1}} color={{scheme: "Paired", legend: true}}>
      <AreaY
        data={series}
        x="x"
        y="y"
        interval={1}
        fill="type"
        stroke="category"
        z="type"
        strokeWidth={2}
        fillOpacity={0.7}
        tip={true}
      />
    </Replot>
  );
}
