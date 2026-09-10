import React from 'react';
import {Easing, Interactive, interpolate, useCurrentFrame} from 'remotion';

type Props={kicker?:string;title:string;accent?:string;maxWidth?:number;size?:number};
export const EditorialTitle:React.FC<Props>=({kicker,title,accent,maxWidth=1180,size=82})=>{
  const frame=useCurrentFrame();
  return <div style={{maxWidth}}>
    {kicker?<Interactive.Div name="Editorial kicker" style={{fontFamily:'JetBrains Mono',fontSize:19,fontWeight:700,letterSpacing:5,textTransform:'uppercase',color:'#B8923E',marginBottom:22,opacity:interpolate(frame,[0,18],[0,1],{extrapolateRight:'clamp'})}}>{kicker}</Interactive.Div>:null}
    <div style={{overflow:'hidden',paddingBottom:12}}>
      <Interactive.Div name="Editorial title" style={{fontFamily:'Fraunces',fontSize:size,fontWeight:700,lineHeight:0.98,letterSpacing:-2.8,color:'#0E1B2C',translate:`0 ${interpolate(frame,[0,28],[96,0],{easing:Easing.bezier(.22,1,.36,1),extrapolateRight:'clamp'})}px`,opacity:interpolate(frame,[0,15],[0,1],{extrapolateRight:'clamp'})}}>{title}</Interactive.Div>
    </div>
    {accent?<Interactive.Div name="Expressive accent" style={{fontFamily:'Fraunces',fontStyle:'italic',fontSize:36,lineHeight:1.2,color:'#2A5C5C',marginTop:16,opacity:interpolate(frame,[12,38],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}}>{accent}</Interactive.Div>:null}
  </div>;
};
