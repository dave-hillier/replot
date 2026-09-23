import {Replot, Image} from "../../src/react/api.js";

export async function imagePixelated() {
  return (
    <Replot width={300} height={200}>
      <Image
        data={[0]}
        frameAnchor="middle"
        src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAYAAACddGYaAAAAAXNSR0IArs4c6QAAACNJREFUGFdjVBaX/s/TdotBLrqfgfHeXaP/Ek3PGGatfcEAAHifCmZc3SIiAAAAAElFTkSuQmCC"
        width={300}
        height={200}
        imageRendering="pixelated"
      />
    </Replot>
  );
}
