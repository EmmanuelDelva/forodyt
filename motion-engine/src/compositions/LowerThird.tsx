import React from 'react';
import {AbsoluteFill,Easing,Interactive,interpolate,spring,useCurrentFrame,useVideoConfig} from 'remotion';
import {FontFaces} from '../components/FontFaces';

export type LowerThirdProps={name:string;institution?:string;country?:string;role?:string;session?:string};
export const LowerThird:React.FC<LowerThirdProps>=({name,institution,country,role,session})=>{
  const frame=useCurrentFrame(); const {fps,durationInFrames}=useVideoConfig();
  const enter=spring({frame,fps,config:{damping:26,stiffness:100,mass:1.2}});
  const exit=interpolate(frame,[durationInFrames-30,durationInFrames],[0,1],{easing:Easing.bezier(.4,0,1,1),extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  return <AbsoluteFill style={{background:'transparent'}}><FontFaces/>
    <Interactive.Div name="Lower third panel" style={{position:'absolute',left:116,bottom:92,width:860,minHeight:188,background:'rgba(14,27,44,.96)',borderLeft:'5px solid #B8923E',padding:'26px 34px 24px 36px',opacity:1-exit,translate:`${(1-enter)*-90-exit*90}px 0px`}}>
      <Interactive.Div name="Speaker name" style={{fontFamily:'Fraunces',fontSize:name.length>42?42:50,fontWeight:700,lineHeight:1.02,color:'#F5EFE0',letterSpacing:-1}}>{name}</Interactive.Div>
      <div style={{fontFamily:'Inter',fontSize:20,lineHeight:1.35,color:'rgba(245,239,224,.86)',marginTop:12}}>{[role,institution,country].filter(Boolean).join(' · ')}</div>
      {session?<div style={{fontFamily:'JetBrains Mono',fontSize:14,fontWeight:700,letterSpacing:2.4,textTransform:'uppercase',color:'#B8923E',marginTop:13}}>{session}</div>:null}
    </Interactive.Div>
  </AbsoluteFill>;
};
