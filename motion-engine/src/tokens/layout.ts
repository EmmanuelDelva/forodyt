export const layout = {
  width: 1920,
  height: 1080,
  safeX: 116,
  safeY: 65,
  safePercent: 0.06,
  contentMaxWidth: 1480,
  lowerThirdBottom: 92,
  lowerThirdLeft: 116,
} as const;

export const insideSafeArea = (x:number,y:number,w:number,h:number) =>
  x >= layout.safeX && y >= layout.safeY &&
  x + w <= layout.width - layout.safeX && y + h <= layout.height - layout.safeY;
