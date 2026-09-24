import {Replot, Text, AxisX, AxisY, BarX, TickX, Frame, valueof} from "../../src/react/api.js";
import type * as Plot_ from "@dave-hillier/replot";
import * as d3 from "d3";

export async function textOverflow() {
  const names = [
    "The Best Years of Our Lives",
    "The Ballad of Gregorio Cortez",
    "My Big Fat Independent Movie",
    "Battle for the Planet of the Apes",
    "Big Things",
    "Bogus",
    "Beverly Hills Cop",
    "Beverly Hills Cop II",
    "Beverly Hills Cop III",
    "The Black Hole",
    "The Big Parade",
    "Boyz n the Hood",
    "The Book of Mormon Movie,\nVolume 1: The Journey", // split lines
    "Return to the Blue Lagoon",
    "Bright Lights, Big City",
    "The Blue Bird",
    "The Blue Butterfly",
    "Blade Runner",
    "Bloodsport",
    "The Blues Brothers",
    "Blow Out",
    "De battre mon cœur s'est arrêté",
    "The Broadway Melody",
    "Boom Town",
    "Bill & Ted's Bogus Journey",
    "The Birth of a Nation",
    "The Ballad of Cable Hogue",
    "The Blood of Heroes",
    "The Blood of My Brother: A Story of Death in Iraq",
    "Boomerang",
    "The Bridge on the River Kwai",
    "Born on the Fourth of July",
    "Basquiat",
    "Black Rain",
    "Bottle Rocket",
    "👁️‍🗨️👩‍❤️‍💋‍👩👁️‍🗨️👩‍❤️‍💋‍👩👁️‍🗨️👩‍❤️‍💋‍👩👁️‍🗨️👩‍❤️‍💋‍👩👁️‍🗨️👩‍❤️‍💋‍👩👁️‍🗨️👩‍❤️‍💋‍👩", // composed emoji
    "🧑🏾.👨🏻.👧🏼.👦🏽.🧒🏿.🧑🏾.👨🏻.👧🏼.👦🏽.🧒🏿" // fitz modifiers
  ];
  const options: Plot_.TextOptions["textOverflow"][] = [
    "clip-start",
    "clip-end",
    "ellipsis-start",
    "ellipsis-middle",
    "ellipsis-end"
  ];
  return (
    <Replot width={800} marginLeft={180} fx={{axis: "top", domain: [...options, "monospace"]}} y={{domain: names}}>
      {options.map((textOverflow) => (
        <Text
          data={names}
          text={names}
          y={names}
          fx={() => textOverflow}
          textOverflow={textOverflow}
          lineWidth={8}
          dx={textOverflow.endsWith("-start") ? 4 : textOverflow.endsWith("-middle") ? 0 : -4}
          frameAnchor={textOverflow.endsWith("-start") ? "left" : textOverflow.endsWith("-middle") ? "middle" : "right"}
        />
      ))}
      <Text
        data={names}
        text={names}
        y={names}
        fx={() => "monospace"}
        monospace={true}
        textOverflow="ellipsis-end"
        lineWidth={8}
        dx={-4}
        frameAnchor="right"
      />
      <Frame />
    </Replot>
  );
}

export async function textOverflowClip() {
  return textOverflowPlot("clip");
}

export async function textOverflowEllipsis() {
  return textOverflowPlot("ellipsis");
}

export async function textOverflowMonospace() {
  return textOverflowPlot("ellipsis", {monospace: true});
}

export async function textOverflowNone() {
  return textOverflowPlot(null);
}

async function textOverflowPlot(textOverflow, {monospace = false} = {}) {
  const presidents = await d3.csv<any>("data/us-president-favorability.csv", d3.autoType);
  const opinions = [
    "Very Unfavorable %",
    "Somewhat Unfavorable %",
    "Don’t know %",
    "Have not heard of them %",
    "Somewhat Favorable %",
    "Very Favorable %"
  ];
  const dates = new Map(presidents.map((p) => [p.Name, p["First Inauguration Date"]]));
  return (
    <Replot
      width={500}
      height={textOverflow ? 730 : 1100}
      marginLeft={95}
      marginRight={54}
      x={{percent: true, label: "opinion (%)"}}
      y={{domain: valueof(presidents, "Name")}}
      color={{domain: opinions, scheme: "rdylbu"}}
    >
      <AxisX monospace={monospace} />
      <AxisY lineWidth={6} textOverflow={textOverflow} monospace={monospace} />
      <AxisY
        anchor="right"
        tickFormat={(name) => `${dates.get(name).getUTCFullYear()}`}
        label="First inauguration date"
        tickSize={0}
        monospace={monospace}
      />
      <BarX
        data={presidents}
        x="share"
        fill="opinion"
        y="President"
        title={(d) => d.opinion.replace("%", `${d.share}%`)}
        offset="normalize"
        transform={(data, facets) => ({
          data: data.flatMap((p) => opinions.map((o) => ({President: p.Name, share: p[o], opinion: o}))),
          facets: facets.map((f) =>
            Array.from(f, (i) => d3.range(i * opinions.length, (i + 1) * opinions.length)).flat()
          )
        })}
      />
      <TickX data={[0.5]} stroke="white" />
    </Replot>
  );
}
