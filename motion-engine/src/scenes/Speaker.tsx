import React from 'react';
import type {Session} from '../schema/session-schema';
import {SceneBase} from '../components/SceneBase';
export const Speaker:React.FC<{session:Session;speakerIndex?:number}>=({session,speakerIndex=0})=>{const speaker=session.speakers[speakerIndex];return <SceneBase session={session} kicker="Ponente" title={speaker?.name??session.title} accent={[speaker?.role,speaker?.institution,speaker?.country].filter(Boolean).join(' · ')} speakerIndex={speakerIndex} badge={speaker?.topic}/>;};
