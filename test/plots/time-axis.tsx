import {Replot, RuleY, Dot, BarY, DotX, groupX} from "../../src/react/api.js";
import * as Plot_ from "@dave-hillier/replot";
import * as d3 from "d3";
import {svg} from "htl";

const domains = [
  [new Date("2023-01-01"), new Date("2023-01-01T00:00:01Z")], // 100ms
  [new Date("2023-01-01"), new Date("2023-01-01T00:00:05Z")], // 500ms
  [new Date("2023-01-01"), new Date("2023-01-01T00:00:10Z")], // 1s
  [new Date("2023-01-01"), new Date("2023-01-01T00:01Z")], // 5s
  [new Date("2023-01-01"), new Date("2023-01-01T00:02Z")], // 15s
  [new Date("2023-01-01"), new Date("2023-01-01T00:04Z")], // 30s
  [new Date("2023-01-01"), new Date("2023-01-01T00:10Z")], // 1m
  [new Date("2023-01-01"), new Date("2023-01-01T01:00Z")], // 5m
  [new Date("2023-01-01"), new Date("2023-01-01T02:30Z")], // 15m
  [new Date("2023-01-01"), new Date("2023-01-01T05:00Z")], // 30m
  [new Date("2023-01-01T10:00Z"), new Date("2023-01-01T15:00Z")], // 30m
  [new Date("2023-01-01"), new Date("2023-01-01T10:00Z")], // 1h
  [new Date("2023-01-01"), new Date("2023-01-02T05:00Z")], // 3h
  [new Date("2023-01-01"), new Date("2023-01-03")], // 6h
  [new Date("2023-01-01"), new Date("2023-01-05")], // 12h
  [new Date("2023-01-05"), new Date("2023-01-11")], // 1d
  [new Date("2023-01-01"), new Date("2023-01-11")], // 1d
  [new Date("2023-01-01"), new Date("2023-01-23")], // 2d
  [new Date("2023-01-17"), new Date("2023-02-13")], // 2d
  [new Date("2023-01-01"), new Date("2023-04-01")], // 1w
  [new Date("2023-01-01"), new Date("2024-01-01")], // 1m
  [new Date("2023-04-01"), new Date("2024-04-01")], // 1m
  [new Date("2023-01-01"), new Date("2026-01-01")], // 3m
  [new Date("2023-01-01"), new Date("2033-01-01")], // 1y
  [new Date("2020-01-01"), new Date("2070-01-01")] // 5y
];

// TODO: These functions use svg tagged template literals (arrow function marks) and cannot be fully converted to React.createElement
export async function timeAxisBottom() {
  return svg`<svg width=640 height=${domains.length * 60}>${domains.map(
    (domain, i) =>
      svg`<g transform="translate(0,${i * 60})">${Plot_.plot({
        marginBottom: 40,
        height: 60,
        x: {axis: "bottom", grid: true, type: "utc", domain}
      })}`
  )}`;
}

export async function timeAxisTop() {
  return svg`<svg width=640 height=${domains.length * 60}>${domains.map(
    (domain, i) =>
      svg`<g transform="translate(0,${i * 60})">${Plot_.plot({
        marginTop: 40,
        height: 60,
        x: {axis: "top", grid: true, type: "utc", domain}
      })}`
  )}`;
}

export async function timeAxisLeft() {
  const somedomains = domains.filter((d, i) => i % 3 === 0);
  return svg`<svg height=400 width=${somedomains.length * 80}>${somedomains.map(
    (domain, i) =>
      svg`<g transform="translate(${i * 80},0)">${Plot_.plot({
        marginLeft: 60,
        width: 80,
        y: {grid: true, axis: "left", type: "utc", domain}
      })}`
  )}`;
}

export async function timeAxisRight() {
  const somedomains = domains.filter((d, i) => i % 3 === 0);
  return svg`<svg height=400 width=${somedomains.length * 80}>${somedomains.map(
    (domain, i) =>
      svg`<g transform="translate(${i * 80},0)">${Plot_.plot({
        marginRight: 60,
        width: 80,
        y: {grid: true, axis: "right", type: "utc", domain}
      })}`
  )}`;
}

export async function timeAxisExplicitInterval() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot x={{interval: "month"}}>
      <RuleY data={[0]} />
      <Dot data={aapl} x="Date" y="Close" />
    </Replot>
  );
}

export async function timeAxisExplicitNonstandardInterval() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot x={{interval: "4 weeks"}}>
      <RuleY data={[0]} />
      <Dot data={aapl} x="Date" y="Close" />
    </Replot>
  );
}

export async function timeAxisExplicitNonstandardIntervalTicks() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot x={{interval: "4 weeks", grid: true, ticks: "year"}}>
      <RuleY data={[0]} />
      <Dot data={aapl} x="Date" y="Close" />
    </Replot>
  );
}

export async function timeAxisOrdinal() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot x={{interval: "month"}}>
      <BarY data={aapl} {...groupX({y: "median", title: "min"}, {title: "Date", x: "Date", y: "Close"})} />
    </Replot>
  );
}

export async function warnTimeAxisOrdinalIncompatible() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot x={{interval: "4 weeks", ticks: "year"}}>
      <BarY data={aapl} {...groupX({y: "median", title: "min"}, {title: "Date", x: "Date", y: "Close"})} />
    </Replot>
  );
}

export async function timeAxisOrdinalSparseTicks() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot x={{interval: "4 weeks", ticks: "52 weeks"}}>
      <BarY data={aapl} {...groupX({y: "median", title: "min"}, {title: "Date", x: "Date", y: "Close"})} />
    </Replot>
  );
}

export async function timeAxisOrdinalSparseInterval() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot x={{interval: "52 weeks"}}>
      <BarY data={aapl} {...groupX({y: "median", title: "min"}, {title: "Date", x: "Date", y: "Close"})} />
    </Replot>
  );
}

export async function timeAxisOrdinalTicks() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  return (
    <Replot x={{interval: "month", ticks: "3 months"}}>
      <BarY data={aapl} {...groupX({y: "median", title: "min"}, {title: "Date", x: "Date", y: "Close"})} />
    </Replot>
  );
}

export async function warnTimeAxisOrdinalExplicitIncompatibleTicks() {
  const aapl = await d3.csv<any>("data/aapl.csv", d3.autoType);
  const [start, stop] = d3.extent(aapl, (d) => d.Date);
  return (
    <Replot x={{interval: "4 weeks", ticks: d3.utcYear.range(start, stop)}}>
      <BarY data={aapl} {...groupX({y: "median", title: "min"}, {title: "Date", x: "Date", y: "Close"})} />
    </Replot>
  );
}

export async function timeAxisLocal() {
  const dates = [
    "2023-09-30T15:05:48.452Z",
    "2023-09-30T16:05:48.452Z",
    "2023-09-30T17:05:48.452Z",
    "2023-09-30T18:05:48.452Z",
    "2023-09-30T19:05:48.452Z"
  ].map((d) => new Date(d));
  return (
    <Replot x={{type: "time"}}>
      <DotX data={dates} />
    </Replot>
  );
}
