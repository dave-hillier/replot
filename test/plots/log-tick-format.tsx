import {Replot, formatNumber} from "../../src/react/api.js";

export async function logTickFormatFunction() {
  return <Replot x={{type: "log", domain: [1, 4200], tickFormat: formatNumber()}} />;
}

export async function logTickFormatFunctionSv() {
  return <Replot x={{type: "log", domain: [1, 4200], tickFormat: formatNumber("sv-SE")}} />;
}
