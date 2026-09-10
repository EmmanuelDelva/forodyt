import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {brand} from '../tokens/brand';

type Props={opacity?:number; pulseRegion?:'americas'|'europe'|'asia'|'global'};
type Dot={x:number;y:number;r:string};
const dots:Dot[]=[];
const regions=[
  {r:'americas',cx:310,cy:260,rx:185,ry:225,tilt:-0.3},
  {r:'europe',cx:690,cy:210,rx:130,ry:85,tilt:0.12},
  {r:'africa',cx:705,cy:370,rx:135,ry:190,tilt:-0.05},
  {r:'asia',cx:950,cy:250,rx:250,ry:150,tilt:0.08},
  {r:'oceania',cx:1080,cy:490,rx:105,ry:65,tilt:-0.15},
];
for(const region of regions){
  for(let y=-region.ry;y<=region.ry;y+=18){for(let x=-region.rx;x<=region.rx;x+=18){
    const nx=x/region.rx,ny=y/region.ry;
    const noise=Math.sin((x+region.cx)*0.071)+Math.cos((y+region.cy)*0.083);
    if(nx*nx+ny*ny<0.82+noise*0.08){dots.push({x:region.cx+x+y*region.tilt,y:region.cy+y,r:region.r});}
  }}
}
export const DottedWorldMap:React.FC<Props>=({opacity=0.24,pulseRegion='global'})=>{
  const frame=useCurrentFrame();
  const driftX=Math.sin(frame/90)*5;
  const driftY=Math.cos(frame/110)*3;
  return <svg width="1220" height="650" viewBox="0 0 1220 650" style={{opacity,translate:`${driftX}px ${driftY}px`}}>
    {dots.map((dot,i)=>{
      const emerge=interpolate(frame,[i%35,(i%35)+24],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
      const pulse=pulseRegion==='global'||pulseRegion===dot.r ? 0.55+0.35*Math.sin((frame+i*3)/28) : 0.42;
      const gold=i%23===0 || (dot.r==='americas'&&i%31===0);
      return <circle key={`${dot.x}-${dot.y}-${i}`} cx={dot.x} cy={dot.y} r={gold?3.3:2.25}
        fill={gold?brand.gold:brand.ink} opacity={emerge*pulse}/>;
    })}
  </svg>;
};
