import {Replot, DotX, indexOf} from "../../src/react/api.js";

export async function symbolSetFill() {
  return (
    <Replot>
      <DotX
        data={["circle", "cross", "diamond", "square", "star", "triangle", "wye"]}
        fill="currentColor"
        symbol={indexOf}
      />
    </Replot>
  );
}

export async function symbolSetStroke() {
  return (
    <Replot>
      <DotX
        data={["circle", "cross", "diamond", "square", "star", "triangle", "wye"]}
        stroke="currentColor"
        symbol={indexOf}
      />
    </Replot>
  );
}

export async function symbolSetFillColor() {
  return (
    <Replot symbol={{legend: true}}>
      <DotX
        data={["circle", "cross", "diamond", "square", "star", "triangle", "wye"]}
        fill={indexOf}
        symbol={indexOf}
      />
    </Replot>
  );
}

export async function symbolSetStrokeColor() {
  return (
    <Replot symbol={{legend: true}}>
      <DotX
        data={["circle", "cross", "diamond", "square", "star", "triangle", "wye"]}
        stroke={indexOf}
        symbol={indexOf}
      />
    </Replot>
  );
}
