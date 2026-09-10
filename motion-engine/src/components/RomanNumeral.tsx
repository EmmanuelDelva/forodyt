import React from 'react';
import {Interactive, useCurrentFrame} from 'remotion';

export const RomanNumeral:React.FC<{size?:number;opacity?:number}>=({size=520,opacity=0.065})=>{
  const frame=useCurrentFrame();
  return <Interactive.Div name="Roman numeral IV" style={{
    position:'absolute',right:90,top:38,fontFamily:'Fraunces',fontWeight:900,fontSize:size,
    lineHeight:0.86,letterSpacing:-28,color:'#0E1B2C',opacity,
    translate:`${Math.sin(frame/120)*4}px ${Math.cos(frame/150)*3}px`,
    scale:1+Math.sin(frame/180)*0.004,userSelect:'none'
  }}>IV</Interactive.Div>;
};
