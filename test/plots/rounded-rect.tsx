import {Replot, Frame, BarY, Rect, Cell, RectX, RectY, RuleX, RuleY, binX, binY} from "../../src/react/api.js";
import * as d3 from "d3";

export function roundedBarYR() {
  const xy = {y1: 0, y2: 1, inset: 4, insetLeft: 2, insetRight: 2};
  return (
    <Replot x={{inset: 2}} y={{reverse: true}} padding={0}>
      <Frame />
      <BarY data={{length: 1}} x={0} {...xy} r={25} />
      <BarY data={{length: 1}} x={1} {...xy} r={50} />
      <BarY data={{length: 1}} x={2} {...xy} r={75} />
      <BarY data={{length: 1}} x={3} {...xy} r={100} />
    </Replot>
  );
}

export function roundedBarYRx() {
  const xy = {y1: 0, y2: 1, inset: 4, insetLeft: 2, insetRight: 2};
  return (
    <Replot x={{inset: 2}} y={{reverse: true}} padding={0}>
      <Frame />
      <BarY data={{length: 1}} x={0} {...xy} rx={25} />
      <BarY data={{length: 1}} x={1} {...xy} rx={50} />
      <BarY data={{length: 1}} x={2} {...xy} rx={75} />
      <BarY data={{length: 1}} x={3} {...xy} rx={100} />
    </Replot>
  );
}

export function roundedBarYRy() {
  const xy = {y1: 0, y2: 1, inset: 4, insetLeft: 2, insetRight: 2};
  return (
    <Replot x={{inset: 2}} y={{reverse: true}} padding={0}>
      <Frame />
      <BarY data={{length: 1}} x={0} {...xy} ry={25} />
      <BarY data={{length: 1}} x={1} {...xy} ry={50} />
      <BarY data={{length: 1}} x={2} {...xy} ry={75} />
      <BarY data={{length: 1}} x={3} {...xy} ry={100} />
    </Replot>
  );
}

export function roundedRectR() {
  const xy = {y1: 0, y2: 1, inset: 4, insetLeft: 2, insetRight: 2};
  return (
    <Replot x={{inset: 2}} y={{reverse: true}} padding={0}>
      <Frame />
      <Rect data={{length: 1}} x={0} {...xy} r={25} />
      <Rect data={{length: 1}} x={1} {...xy} r={50} />
      <Rect data={{length: 1}} x={2} {...xy} r={75} />
      <Rect data={{length: 1}} x={3} {...xy} r={100} />
    </Replot>
  );
}

export function roundedRectRx() {
  const xy = {y1: 0, y2: 1, inset: 4, insetLeft: 2, insetRight: 2};
  return (
    <Replot x={{inset: 2}} y={{reverse: true}} padding={0}>
      <Frame />
      <Rect data={{length: 1}} x={0} {...xy} rx={25} />
      <Rect data={{length: 1}} x={1} {...xy} rx={50} />
      <Rect data={{length: 1}} x={2} {...xy} rx={75} />
      <Rect data={{length: 1}} x={3} {...xy} rx={100} />
    </Replot>
  );
}

export function roundedRectRy() {
  const xy = {y1: 0, y2: 1, inset: 4, insetLeft: 2, insetRight: 2};
  return (
    <Replot x={{inset: 2}} y={{reverse: true}} padding={0}>
      <Frame />
      <Rect data={{length: 1}} x={0} {...xy} ry={25} />
      <Rect data={{length: 1}} x={1} {...xy} ry={50} />
      <Rect data={{length: 1}} x={2} {...xy} ry={75} />
      <Rect data={{length: 1}} x={3} {...xy} ry={100} />
    </Replot>
  );
}

export function roundedRectAsymmetricX() {
  const xy = {y1: 0, y2: 1, inset: 4, insetLeft: 2, insetRight: 2};
  return (
    <Replot x={{inset: 2}} y={{reverse: true}} padding={0}>
      <Frame />
      <Rect data={{length: 1}} x={0} {...xy} rx1y1={500} rx2y1={50} />
      <Rect data={{length: 1}} x={1} {...xy} rx2y1={500} rx1y1={50} />
      <Rect data={{length: 1}} x={2} {...xy} rx2y2={500} rx1y2={50} />
      <Rect data={{length: 1}} x={3} {...xy} rx1y2={500} rx2y2={50} />
    </Replot>
  );
}

export function roundedRectAsymmetricY() {
  const xy = {x1: 0, x2: 1, inset: 4, insetTop: 2, insetBottom: 2};
  return (
    <Replot y={{inset: 2}} height={400} padding={0}>
      <Frame />
      <Rect data={{length: 1}} y={0} {...xy} rx1y1={500} rx1y2={50} />
      <Rect data={{length: 1}} y={1} {...xy} rx2y1={500} rx2y2={50} />
      <Rect data={{length: 1}} y={2} {...xy} rx2y2={500} rx2y1={50} />
      <Rect data={{length: 1}} y={3} {...xy} rx1y2={500} rx1y1={50} />
    </Replot>
  );
}

export function roundedRectCorners() {
  return (
    <Replot y={{reverse: true}} inset={4}>
      <Frame />
      <Rect data={{length: 1}} x1={0} x2={1} y1={0} y2={1} inset={4} rx1y1={20} />
      <Rect data={{length: 1}} x1={1} x2={2} y1={0} y2={1} inset={4} rx2y1={20} />
      <Rect data={{length: 1}} x1={2} x2={3} y1={0} y2={1} inset={4} rx2y2={20} />
      <Rect data={{length: 1}} x1={3} x2={4} y1={0} y2={1} inset={4} rx1y2={20} />
      <Rect data={{length: 1}} x1={1} x2={0} y1={1} y2={2} inset={4} rx1y1={20} />
      <Rect data={{length: 1}} x1={2} x2={1} y1={1} y2={2} inset={4} rx2y1={20} />
      <Rect data={{length: 1}} x1={3} x2={2} y1={1} y2={2} inset={4} rx2y2={20} />
      <Rect data={{length: 1}} x1={4} x2={3} y1={1} y2={2} inset={4} rx1y2={20} />
      <Rect data={{length: 1}} x1={0} x2={1} y1={3} y2={2} inset={4} rx1y1={20} />
      <Rect data={{length: 1}} x1={1} x2={2} y1={3} y2={2} inset={4} rx2y1={20} />
      <Rect data={{length: 1}} x1={2} x2={3} y1={3} y2={2} inset={4} rx2y2={20} />
      <Rect data={{length: 1}} x1={3} x2={4} y1={3} y2={2} inset={4} rx1y2={20} />
      <Rect data={{length: 1}} x1={1} x2={0} y1={4} y2={3} inset={4} rx1y1={20} />
      <Rect data={{length: 1}} x1={2} x2={1} y1={4} y2={3} inset={4} rx2y1={20} />
      <Rect data={{length: 1}} x1={3} x2={2} y1={4} y2={3} inset={4} rx2y2={20} />
      <Rect data={{length: 1}} x1={4} x2={3} y1={4} y2={3} inset={4} rx1y2={20} />
    </Replot>
  );
}

export function roundedRectBand() {
  return (
    <Replot x={{inset: 2}} y={{reverse: true}} padding={0}>
      <Frame />
      <Rect data={{length: 1}} x={1} y1={0} y2={1} inset={4} insetLeft={2} insetRight={2} ry1={20} />
      <Rect data={{length: 1}} x={2} y1={0} y2={1} inset={4} insetLeft={2} insetRight={2} ry1={20} />
      <Rect data={{length: 1}} x={3} y1={0} y2={1} inset={4} insetLeft={2} insetRight={2} ry1={20} />
    </Replot>
  );
}

export function roundedRectCollapsedX() {
  return (
    <Replot y={{reverse: true}}>
      <Frame />
      <Rect data={{length: 1}} x2={1} y1={0} y2={1} inset={4} ry1={20} />
    </Replot>
  );
}

export function roundedRectCollapsedY() {
  return (
    <Replot>
      <Frame />
      <Rect data={{length: 1}} x1={0} x2={1} y2={1} inset={4} ry1={20} />
    </Replot>
  );
}

export function roundedRectSides() {
  return (
    <Replot y={{reverse: true}} inset={4}>
      <Frame />
      <Rect data={{length: 1}} x1={0} x2={1} y1={0} y2={1} inset={4} rx1={20} />
      <Rect data={{length: 1}} x1={1} x2={2} y1={0} y2={1} inset={4} ry1={20} />
      <Rect data={{length: 1}} x1={2} x2={3} y1={0} y2={1} inset={4} rx2={20} />
      <Rect data={{length: 1}} x1={3} x2={4} y1={0} y2={1} inset={4} ry2={20} />
      <Rect data={{length: 1}} x1={1} x2={0} y1={1} y2={2} inset={4} rx1={20} />
      <Rect data={{length: 1}} x1={2} x2={1} y1={1} y2={2} inset={4} ry1={20} />
      <Rect data={{length: 1}} x1={3} x2={2} y1={1} y2={2} inset={4} rx2={20} />
      <Rect data={{length: 1}} x1={4} x2={3} y1={1} y2={2} inset={4} ry2={20} />
      <Rect data={{length: 1}} x1={0} x2={1} y1={3} y2={2} inset={4} rx1={20} />
      <Rect data={{length: 1}} x1={1} x2={2} y1={3} y2={2} inset={4} ry1={20} />
      <Rect data={{length: 1}} x1={2} x2={3} y1={3} y2={2} inset={4} rx2={20} />
      <Rect data={{length: 1}} x1={3} x2={4} y1={3} y2={2} inset={4} ry2={20} />
      <Rect data={{length: 1}} x1={1} x2={0} y1={4} y2={3} inset={4} rx1={20} />
      <Rect data={{length: 1}} x1={2} x2={1} y1={4} y2={3} inset={4} ry1={20} />
      <Rect data={{length: 1}} x1={3} x2={2} y1={4} y2={3} inset={4} rx2={20} />
      <Rect data={{length: 1}} x1={4} x2={3} y1={4} y2={3} inset={4} ry2={20} />
    </Replot>
  );
}

export async function roundedRectNegativeX() {
  const olympians = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot color={{legend: true}} height={640}>
      <RectX data={olympians} {...binY({x: "count"}, {rx2: 4, rx1: -4, clip: "frame", y: "weight", fill: "sex"})} />
      <RuleX data={[0]} />
    </Replot>
  );
}

export async function roundedRectNegativeY() {
  const olympians = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot color={{legend: true}}>
      <RectY data={olympians} {...binX({y: "count"}, {ry2: 4, ry1: -4, clip: "frame", x: "weight", fill: "sex"})} />
      <RuleY data={[0]} />
    </Replot>
  );
}

export async function roundedRectNegativeY1() {
  const olympians = await d3.csv<any>("data/athletes.csv", d3.autoType);
  return (
    <Replot color={{legend: true}}>
      <RectY data={olympians} {...binX({y: "count"}, {rx1y2: 4, rx1y1: -4, clip: "frame", x: "weight", fill: "sex"})} />
      <RuleY data={[0]} />
    </Replot>
  );
}

export function roundedRectOpposing() {
  return (
    <Replot height={400} padding={0} inset={10} round={false}>
      <Frame />
      <Cell data={{length: 1}} x={0} y={0} inset={10} rx1y1={20} rx2y1={20} rx2y2={20} rx1y2={20} />
      <Cell data={{length: 1}} x={1} y={0} inset={10} rx1y1={-20} rx2y1={20} rx2y2={20} rx1y2={20} />
      <Cell data={{length: 1}} x={2} y={0} inset={10} rx1y1={20} rx2y1={-20} rx2y2={20} rx1y2={20} />
      <Cell data={{length: 1}} x={3} y={0} inset={10} rx1y1={-20} rx2y1={-20} rx2y2={20} rx1y2={20} fill="#5ca75b" />
      <Cell data={{length: 1}} x={0} y={1} inset={10} rx1y1={20} rx2y1={20} rx2y2={-20} rx1y2={20} />
      <Cell data={{length: 1}} x={1} y={1} inset={10} rx1y1={-20} rx2y1={20} rx2y2={-20} rx1y2={20} />
      <Cell data={{length: 1}} x={2} y={1} inset={10} rx1y1={20} rx2y1={-20} rx2y2={-20} rx1y2={20} fill="#5ca75b" />
      <Cell data={{length: 1}} x={3} y={1} inset={10} rx1y1={-20} rx2y1={-20} rx2y2={-20} rx1y2={20} />
      <Cell data={{length: 1}} x={0} y={2} inset={10} rx1y1={20} rx2y1={20} rx2y2={20} rx1y2={-20} />
      <Cell data={{length: 1}} x={1} y={2} inset={10} rx1y1={-20} rx2y1={20} rx2y2={20} rx1y2={-20} fill="#5ca75b" />
      <Cell data={{length: 1}} x={2} y={2} inset={10} rx1y1={20} rx2y1={-20} rx2y2={20} rx1y2={-20} />
      <Cell data={{length: 1}} x={3} y={2} inset={10} rx1y1={-20} rx2y1={-20} rx2y2={20} rx1y2={-20} />
      <Cell data={{length: 1}} x={0} y={3} inset={10} rx1y1={20} rx2y1={20} rx2y2={-20} rx1y2={-20} fill="#5ca75b" />
      <Cell data={{length: 1}} x={1} y={3} inset={10} rx1y1={-20} rx2y1={20} rx2y2={-20} rx1y2={-20} />
      <Cell data={{length: 1}} x={2} y={3} inset={10} rx1y1={20} rx2y1={-20} rx2y2={-20} rx1y2={-20} />
      <Cell data={{length: 1}} x={3} y={3} inset={10} rx1y1={-20} rx2y1={-20} rx2y2={-20} rx1y2={-20} />
    </Replot>
  );
}
