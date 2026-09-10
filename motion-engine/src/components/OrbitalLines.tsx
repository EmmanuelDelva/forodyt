import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {brand} from '../tokens/brand';

export const OrbitalLines:React.FC=()=>{
  const frame=useCurrentFrame();
  const reveal=interpolate(frame,[0,45],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  const dash=1400-(frame%600)*1.6;
  return <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{position:'absolute',inset:0,opacity:0.72}}>
    <path d="M-120 870 C 390 480, 980 480, 2050 130" fill="none" stroke={brand.gold} strokeWidth="1.5" opacity={0.42*reveal} strokeDasharray="8 18" strokeDashoffset={dash}/>
    <path d="M310 1130 C 520 660, 1070 380, 1820 -80" fill="none" stroke={brand.petrol} strokeWidth="1.2" opacity={0.30*reveal}/>
    <ellipse cx="1505" cy="202" rx="340" ry="135" fill="none" stroke={brand.gold} strokeWidth="1" opacity={0.24*reveal} transform={`rotate(-11 1505 202)`}/>
    <circle cx="1600" cy="175" r="4" fill={brand.gold} opacity={0.8}/>
    <circle cx="1230" cy="315" r="3" fill={brand.petrol} opacity={0.62}/>
  </svg>;
};
