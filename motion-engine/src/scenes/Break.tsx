import React from 'react';
import type {Session} from '../schema/session-schema';
import {SceneBase} from '../components/SceneBase';
export const Break:React.FC<{session:Session}>=({session})=><SceneBase session={session} kicker="Receso" title="Pausa breve" accent={session.resumeTime?`Retomamos a las ${session.resumeTime}`:'Regresamos en breve'} badge="FORODyT · CONVERSACIÓN GLOBAL"/>;
