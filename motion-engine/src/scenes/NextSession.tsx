import React from 'react';
import type {Session} from '../schema/session-schema';
import {SceneBase} from '../components/SceneBase';

export const NextSession:React.FC<{session:Session}>=({session})=>{
  const next=session.nextSession;
  if(!next)return <SceneBase session={session} kicker="Continuamos" title="La conversación sigue" accent="IV Foro Internacional de Derecho y Tecnología" metadataItems={[session.venue]}/>;
  const repeated=next.title.trim().toLocaleLowerCase('es')===next.sessionLabel.trim().toLocaleLowerCase('es');
  return <SceneBase
    session={session}
    kicker="A continuación"
    title={next.title}
    accent={repeated?next.startTime:`${next.startTime} · ${next.sessionLabel}`}
    badge="SIGUIENTE SESIÓN"
    metadataItems={repeated?[next.sessionLabel,session.venue]:[next.startTime,next.sessionLabel,session.venue]}
  />;
};