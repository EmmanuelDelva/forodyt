import type {Venue} from '../schema/venue-schema';

export const venues: Record<string, Venue> = {
  cucea: {
    id:'cucea', shortName:'CUCEA', name:'Centro Universitario de Ciencias Económico Administrativas',
    city:'Zapopan, Jalisco', room:'Auditorio Lic. Raúl Padilla López', date:'2026-09-21',
    operationStart:'08:00', operationEnd:'15:00', capacity:400, productionStatus:'PRE-FINAL',
    blockers:['Carga/descarga, responsable de sede, contacto técnico, AV, streaming, accesibilidad y emergencias pendientes de confirmación operativa.'],
  },
  cugdl:{id:'cugdl',shortName:'CUGDL',name:'Centro Universitario de Guadalajara',city:'Guadalajara, Jalisco',date:'2026-09-21',operationStart:'16:00',operationEnd:'19:00',productionStatus:'PRE-FINAL',blockers:[]},
  cineteca:{id:'cineteca',shortName:'Cineteca FICG',name:'Cineteca FICG',city:'Zapopan, Jalisco',date:'2026-09-22',operationStart:'10:00',operationEnd:'14:00',productionStatus:'PRE-FINAL',blockers:[]},
  ciudadJudicial:{id:'ciudad-judicial',shortName:'Ciudad Judicial',name:'Ciudad Judicial',city:'Zapopan, Jalisco',date:'2026-09-22',operationStart:'15:00',operationEnd:'19:00',productionStatus:'PRE-FINAL',blockers:[]},
  virtual:{id:'virtual',shortName:'Jornada Virtual',name:'Jornada Virtual ForoDyT',city:'En línea',date:'2026-09-22',operationStart:'00:00',operationEnd:'23:59',productionStatus:'PRE-FINAL',blockers:[]},
};
