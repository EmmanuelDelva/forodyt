import React from 'react';
import type {Session} from '../schema/session-schema';
import {SceneBase} from '../components/SceneBase';
export const StartingSoon:React.FC<{session:Session}>=({session})=><SceneBase session={session} kicker="Comenzamos en breve" title={session.title} accent={session.speakers[0]?.name??'Las grandes preguntas también tienen un foro.'} badge="PREPÁRATE · LA CONVERSACIÓN CONTINÚA"/>;
