import React from 'react';
import type {Session} from '../schema/session-schema';
import {SceneBase} from '../components/SceneBase';
export const TechnicalPause:React.FC<{session:Session}>=({session})=><SceneBase session={session} kicker="Pausa técnica" title="Volvemos en breve" accent="Gracias por permanecer con nosotros" badge="EQUIPO TÉCNICO EN OPERACIÓN"/>;
