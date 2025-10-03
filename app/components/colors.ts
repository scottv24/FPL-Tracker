export const palette = [
  "hsl(210, 100%, 55%)", // blue
  "hsl(145, 80%, 55%)",  // green
  "hsl(275, 85%, 60%)",  // purple
  "hsl(30, 100%, 55%)",  // orange
];


export function colorForSeries(name: string, seriesKeys: string[]) {
  const idx = Math.max(0, seriesKeys.indexOf(name));
  return palette[idx % palette.length];
}


export function hsla(hsl: string, alpha = 0.1) {
  const m = hsl.trim().match(/^hsl\((.+)\)$/i);
  return m ? `hsla(${m[1]}, ${alpha})` : hsl;
}
