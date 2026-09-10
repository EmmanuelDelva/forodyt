import React from 'react';
import type {Session} from '../schema/session-schema';
import {SceneBase} from '../components/SceneBase';
export const CurrentSession:React.FC<{session:Session}>=({session})=><SceneBase session={session} kicker="Ahora" title={session.title} accent={session.axis??session.sessionLabel} speakerIndex={session.speakers.length===1?0:undefined} badge="EN CURSO"/>;
