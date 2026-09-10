import {sessionSchema,type Session} from '../schema/session-schema';
export type ValidationIssue={code:string;message:string;id?:string};
const forbidden=/POR CONFIRMAR|PLACEHOLDER|TBD|LOREM IPSUM/i;
export const validateSessions=(sessions:Session[]):ValidationIssue[]=>{
  const issues:ValidationIssue[]=[];
  for(const session of sessions){
    const parsed=sessionSchema.safeParse(session); if(!parsed.success)issues.push({code:'SCHEMA',message:parsed.error.message,id:session.id});
    const text=JSON.stringify(session); if(forbidden.test(text))issues.push({code:'PLACEHOLDER',message:'Dato provisional detectado',id:session.id});
    if(!session.title.trim()||!session.startTime||!session.endTime||!session.venue||!session.sessionLabel)issues.push({code:'REQUIRED',message:'Falta título, horario, sede o nombre de sesión',id:session.id});
    if(session.nextSession&&(!session.nextSession.title||!session.nextSession.startTime||!session.nextSession.sessionLabel))issues.push({code:'NEXT_SESSION',message:'nextSession incompleta',id:session.id});
  }
  return issues;
};
