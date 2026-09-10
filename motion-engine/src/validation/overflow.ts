import type {Session} from '../schema/session-schema';
export type OverflowRisk={id:string;field:string;length:number;limit:number};
export const detectOverflowRisk=(sessions:Session[]):OverflowRisk[]=>{
  const risks:OverflowRisk[]=[];
  for(const s of sessions){
    if(s.title.length>155)risks.push({id:s.id,field:'title',length:s.title.length,limit:155});
    for(const speaker of s.speakers){
      const meta=[speaker.name,speaker.role,speaker.institution,speaker.country].filter(Boolean).join(' · ');
      if(meta.length>230)risks.push({id:s.id,field:`speaker:${speaker.name}`,length:meta.length,limit:230});
    }
  }
  return risks;
};
