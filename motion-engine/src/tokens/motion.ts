import {Easing} from 'remotion';

export const motion = {
  fps: 30,
  premiumEase: Easing.bezier(0.22, 1, 0.36, 1),
  softEase: Easing.bezier(0.16, 1, 0.3, 1),
  spring: {damping: 24, stiffness: 90, mass: 1.2},
  revealFrames: 24,
  staggerFrames: 6,
  microZoom: 0.018,
} as const;
