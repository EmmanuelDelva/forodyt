import rawSessions from './sessions-IV-2026.json';
import {sessionSchema, type Session} from '../schema/session-schema';

export const sessions: Session[] = rawSessions.map((item) => sessionSchema.parse(item));
export const sessionById = Object.fromEntries(sessions.map((session) => [session.id, session]));
export const demoSession = sessionById['cucea-conf-inaugural'];

export const stressTestSession: Session = sessionSchema.parse({
  id:'stress-long-academic', edition:'IV', venue:'CUCEA', room:'Auditorio Lic. Raúl Padilla López',
  date:'2026-09-21', startTime:'11:35', endTime:'12:20', sessionType:'panel', sessionLabel:'Mesa de stress-test',
  axis:'Ejes 1 · 5 · 7 · validación tipográfica y de overflow',
  title:'Gobernanza algorítmica, salud digital, propiedad intelectual generativa y garantías fundamentales ante sistemas autónomos de decisión pública',
  speakers:[
    {name:'Dra. Alejandra María Fernanda Rodríguez Hernández', role:'Profesora Investigadora y Coordinadora de Vinculación Internacional', institution:'Centro Universitario de Ciencias Económico Administrativas · Universidad de Guadalajara', country:'México'},
    {name:'Dr. Christopher Alexander Montgomery-Williams', role:'Senior Research Fellow in Law, Technology and Public Policy', institution:'International Institute for Artificial Intelligence Governance and Digital Rights', country:'Reino Unido'},
    {name:'Mtra. María de los Ángeles Fernández Villaseñor', role:'Directora de Innovación, Datos y Transformación Institucional', institution:'Secretaría Ejecutiva del Sistema Estatal Anticorrupción de Jalisco', country:'México'},
    {name:'Prof. Jean-Pierre Alexandre de la Roche', role:'Chercheur associé', institution:'Université Internationale de Droit Numérique et Gouvernance Algorithmique', country:'Francia'},
  ],
  state:'current',
});
