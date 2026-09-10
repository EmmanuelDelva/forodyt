import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {sessionById} from '../data/sessions-IV-2026';
import {Welcome} from '../scenes/Welcome';
import {StartingSoon} from '../scenes/StartingSoon';
import {CurrentSession} from '../scenes/CurrentSession';
import {NextSession} from '../scenes/NextSession';
import {SceneBase} from '../components/SceneBase';
import {FontFaces} from '../components/FontFaces';

export type VenueLoopProps={venueId:string;sessionId:string;tagline:string};
const LoopAnchor=()=> <AbsoluteFill style={{background:'#F5EFE0',display:'flex',alignItems:'center',justifyContent:'center'}}><FontFaces/><div style={{fontFamily:'Fraunces',fontSize:84,fontWeight:750,color:'#0E1B2C',textAlign:'center'}}>IV<br/><span style={{fontSize:38,fontStyle:'italic',fontWeight:500,color:'#2A5C5C'}}>Foro Internacional de Derecho y Tecnología</span></div></AbsoluteFill>;
export const VenueLoop:React.FC<VenueLoopProps>=({sessionId,tagline})=>{
  const session=sessionById[sessionId]??sessionById['cucea-conf-inaugural'];
  return <AbsoluteFill>
    <Sequence from={0} durationInFrames={30} name="Loop anchor"><LoopAnchor/></Sequence>
    <Sequence from={30} durationInFrames={150} name="Identity"><Welcome session={session}/></Sequence>
    <Sequence from={180} durationInFrames={180} name="Editorial thesis"><SceneBase session={session} kicker="IV ForoDyT" title={tagline} accent="Derecho · cultura · tecnología · conversación global"/></Sequence>
    <Sequence from={360} durationInFrames={180} name="Starting soon"><StartingSoon session={session}/></Sequence>
    <Sequence from={540} durationInFrames={300} name="Current session"><CurrentSession session={session}/></Sequence>
    <Sequence from={840} durationInFrames={210} name="Next session"><NextSession session={session}/></Sequence>
    <Sequence from={1050} durationInFrames={240} name="Institutional"><SceneBase session={session} kicker="Conversación global" title="Las grandes preguntas también tienen un foro." accent="Agentes · algoritmos · autonomía"/></Sequence>
    <Sequence from={1290} durationInFrames={180} name="Return identity"><Welcome session={session}/></Sequence>
    <Sequence from={1470} durationInFrames={30} name="Loop anchor return"><LoopAnchor/></Sequence>
  </AbsoluteFill>;
};
