import React from 'react';
import type {Session} from '../schema/session-schema';
import {SceneBase} from '../components/SceneBase';
export const Live:React.FC<{session:Session}>=({session})=><SceneBase session={session} kicker="En vivo" title={session.title} accent={session.speakers.map(s=>s.name).slice(0,2).join(' · ')} badge="TRANSMISIÓN HÍBRIDA"/>;
