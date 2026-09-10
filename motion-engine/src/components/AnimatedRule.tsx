import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';

export const AnimatedRule:React.FC<{width?:number}>=({width=620})=>{
  const frame=useCurrentFrame();
  return <div style={{width,height:2,background:'rgba(184,146,62,.18)',overflow:'hidden'}}>
    <div style={{height:'100%',width:`${interpolate(frame,[0,34],[0,100],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}%`,background:'#B8923E'}}/>
  </div>;
};
