import React from 'react';
import {sessionById, stressTestSession} from '../data/sessions-IV-2026';
import {Welcome} from '../scenes/Welcome';import {StartingSoon} from '../scenes/StartingSoon';import {CurrentSession} from '../scenes/CurrentSession';
import {Speaker} from '../scenes/Speaker';import {NextSession} from '../scenes/NextSession';import {Break} from '../scenes/Break';import {Live} from '../scenes/Live';import {TechnicalPause} from '../scenes/TechnicalPause';import {Closing} from '../scenes/Closing';
export type CanonicalState='holding'|'starting-soon'|'current'|'speaker'|'next'|'break'|'live'|'technical-pause'|'closing'|'stress'|'stress-speaker';
export const StatePreview:React.FC<{state:CanonicalState;sessionId?:string}>=({state,sessionId='cucea-conf-inaugural'})=>{
  const base=sessionById[sessionId]??sessionById['cucea-conf-inaugural']; const br=sessionById['cucea-break-1'];
  if(state==='holding')return <Welcome session={base}/>; if(state==='starting-soon')return <StartingSoon session={base}/>;
  if(state==='current')return <CurrentSession session={base}/>; if(state==='speaker')return <Speaker session={base}/>;
  if(state==='next')return <NextSession session={base}/>; if(state==='break')return <Break session={br}/>;
  if(state==='live')return <Live session={base}/>; if(state==='technical-pause')return <TechnicalPause session={base}/>;
  if(state==='closing')return <Closing session={base}/>; if(state==='stress-speaker')return <Speaker session={stressTestSession} speakerIndex={0}/>;
  return <CurrentSession session={stressTestSession}/>;
};