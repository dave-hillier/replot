import {legend} from "../../src/react/api.js";
import {plot as imperativePlot, dotX as imperativeDotX} from "replot";

export function symbolLegendBasic() {
  return legend({symbol: {domain: "ABCDEF"}});
}

export function symbolLegendColorFill() {
  return legend({color: {domain: "ABCDEF"}, symbol: {domain: "ABCDEF"}, fill: "color"});
}

export function symbolLegendColorStroke() {
  return legend({color: {domain: "ABCDEF"}, symbol: {domain: "ABCDEF"}});
}

export function symbolLegendFill() {
  return legend({symbol: {domain: "ABCDEF"}, fill: "red"});
}

// Note: The symbol hint requires reference equality for channel definitions,
// and so doesn’t consider the fill and symbol channels to be using the same
// encoding here.
export function symbolLegendDifferentColor() {
  return imperativePlot({
    marks: [imperativeDotX("ABCDEF", {fill: (d) => d, symbol: (d) => d})]
  }).legend("symbol");
}

// Note: The symbol hint requires reference equality for channel definitions,
// and so doesn’t consider the fill and symbol channels to be using the same
// encoding here.
export function symbolLegendExplicitColor() {
  return imperativePlot({
    marks: [imperativeDotX("ABCDEF", {fill: (d) => d, symbol: (d) => d})]
  }).legend("symbol", {fill: "color"});
}

// Note: The symbol hint requires reference equality for channel definitions; we
// can tell the mark that they represent the same encoding by passing the same
// function for both channels.
export function symbolLegendImplicitRange() {
  const identity = (d) => d;
  return imperativePlot({
    marks: [imperativeDotX("ABCDEF", {fill: identity, symbol: identity})]
  }).legend("symbol");
}

export function symbolLegendStroke() {
  return legend({symbol: {domain: "ABCDEF"}, stroke: "red"});
}

export async function symbolLegendOpacityFill() {
  return legend({symbol: {domain: ["Dream", "Torgersen", "Biscoe"]}, fill: "red", fillOpacity: 0.5});
}

export async function symbolLegendOpacityColor() {
  return legend({color: {domain: "ABCDEF"}, symbol: {domain: "ABCDEF"}, strokeOpacity: 0.5});
}

export async function symbolLegendOpacityStroke() {
  return legend({symbol: {domain: ["Dream", "Torgersen", "Biscoe"]}, stroke: "red", strokeOpacity: 0.5});
}
