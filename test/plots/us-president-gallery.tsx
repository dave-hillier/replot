import {Replot, Image, dodgeY, sort} from "../../src/react/api.js";
import * as d3 from "d3";

export async function usPresidentGallery() {
  const presidents = await d3.csv<any>("data/us-president-favorability.csv", d3.autoType);
  return (
    <Replot inset={30} width={960} height={300}>
      <Image
        data={presidents}
        {...dodgeY({
          x: "First Inauguration Date",
          r: 22,
          preserveAspectRatio: "xMidYMin slice", // try not to clip heads
          src: "Portrait URL",
          title: "Name"
        })}
      />
    </Replot>
  );
}

export async function usPresidentGalleryAlt() {
  const presidents = await d3.csv<any>("data/us-president-favorability.csv", d3.autoType);
  return (
    <Replot inset={30} width={960} height={300}>
      <Image
        data={presidents}
        {...sort(
          {channel: "y"}, // try not to occlude the heads
          {
            ...dodgeY({
              x: "First Inauguration Date",
              r: 22,
              dy: -10, // these aren’t circles, so don’t overlap the x-axis
              src: "Portrait URL",
              title: "Name",
              width: 60
            }),
            r: null // don’t clip the images
          }
        )}
      />
    </Replot>
  );
}
