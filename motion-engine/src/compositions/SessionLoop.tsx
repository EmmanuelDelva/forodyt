import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {sessionById} from '../data/sessions-IV-2026';
import {Welcome} from '../scenes/Welcome';
import {StartingSoon} from '../scenes/StartingSoon';
import {CurrentSession} from '../scenes/CurrentSession';
import {Speaker} from '../scenes/Speaker';
import {NextSession} from '../scenes/NextSession';
import {Closing} from '../scenes/Closing';
import {SceneBase} from '../components/SceneBase';

export type SessionLoopProps={sessionId:string;mode:'holding'|'starting-soon'|'current'|'live'};
export const SessionLoop:React.FC<SessionLoopProps>=({sessionId,mode})=>{
  const session=sessionById[sessionId]??sessionById['cucea-conf-inaugural'];
  const speakers=session.speakers.slice(0,3);
  const speakerDuration=Math.floor(300/Math.max(speakers.length,1));
  return <AbsoluteFill>
    <Sequence from={0} durationInFrames={150} name="Welcome"><Welcome session={session}/></Sequence>
    <Sequence from={150} durationInFrames={150} name="Starting soon"><StartingSoon session={session}/></Sequence>
    <Sequence from={300} durationInFrames={300} name="Current session"><CurrentSession session={{...session,state:mode==='live'?'live':'current'}}/></Sequence>
    {speakers.length?speakers.map((_,i)=><Sequence key={i} from={600+i*speakerDuration} durationInFrames={i===speakers.length-1?300-i*speakerDuration:speakerDuration} name={`Speaker ${i+1}`}><Speaker session={session} speakerIndex={i}/></Sequence>):<Sequence from={600} durationInFrames={300} name="Session hold"><CurrentSession session={session}/></Sequence>}
    <Sequence from={900} durationInFrames={180} name="Next"><NextSession session={session}/></Sequence>
    <Sequence from={1080} durationInFrames={210} name="Context"><SceneBase session={session} kicker="IV ForoDyT" title="Derecho ante la inteligencia que decide" accent="Una conversación académica, internacional y multidisciplinaria"/></Sequence>
    <Sequence from={1290} durationInFrames={210} name="Closing"><Closing session={session}/></Sequence>
  </AbsoluteFill>;
};