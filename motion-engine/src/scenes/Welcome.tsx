import React from 'react';
import type {Session} from '../schema/session-schema';
import {SceneBase} from '../components/SceneBase';
export const Welcome:React.FC<{session?:Session}>=({session})=><SceneBase session={session} kicker="IV ForoDyT · 2026" title="Foro Internacional de Derecho y Tecnología" accent="Agentes, Algoritmos y Autonomía" badge="21 · 22 SEP · GUADALAJARA / ZAPOPAN"/>;
