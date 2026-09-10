import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import type {Session} from '../schema/session-schema';
import {DottedWorldMap} from './DottedWorldMap';
import {OrbitalLines} from './OrbitalLines';
import {RomanNumeral} from './RomanNumeral';
import {EditorialTitle} from './EditorialTitle';
import {MetadataRow} from './MetadataRow';
import {VenueFooter} from './VenueFooter';
import {FontFaces} from './FontFaces';

type Props={session?:Session;kicker:string;title:string;accent?:string;speakerIndex?:number;dark?:boolean;badge?:string;metadataItems?:string[]};
export const SceneBase:React.FC<Props>=({session,kicker,title,accent,speakerIndex,dark=false,badge,metadataItems})=>{
  const frame=useCurrentFrame();
  const speaker=session?.speakers[speakerIndex??-1];
  const zoom=1+interpolate(frame,[0,180],[0,.012],{extrapolateRight:'clamp'});
  const metadata=metadataItems??(session?[session.startTime+'–'+session.endTime,session.sessionLabel,session.axis??'',session.venue]:[]);
  return <AbsoluteFill style={{background:dark?'#0E1B2C':'#F5EFE0',color:dark?'#F5EFE0':'#0E1B2C',overflow:'hidden'}}>
    <FontFaces/><div style={{position:'absolute',right:-45,top:128,scale:zoom}}><DottedWorldMap opacity={dark ? .16 : .20}/></div><OrbitalLines/><RomanNumeral/>
    <div style={{position:'absolute',left:116,top:108,right:116,bottom:150,display:'flex',alignItems:'center'}}>
      <div style={{width:speaker?.avatar?'68%':'82%',zIndex:2}}><EditorialTitle kicker={kicker} title={title} accent={accent} size={title.length>95?58:title.length>62?68:82}/>
      {badge?<div style={{marginTop:30,fontFamily:'JetBrains Mono',fontSize:16,letterSpacing:3,color:'#B8923E'}}>{badge}</div>:null}
      {metadata.length?<MetadataRow items={metadata}/>:null}</div>
      {speaker?.avatar?<div style={{position:'absolute',right:50,top:125,width:300,height:390,border:'1px solid rgba(184,146,62,.55)',padding:10,background:'rgba(245,239,224,.62)'}}>
        <Img src={staticFile(speaker.avatar)} style={{width:'100%',height:'100%',objectFit:'cover',filter:'saturate(.86) contrast(1.03)'}}/>
        <div style={{position:'absolute',left:-18,bottom:28,width:54,height:2,background:'#B8923E'}}/>
      </div>:null}
    </div>
    <VenueFooter venue={session?.venue??'IV ForoDyT 2026'} room={session?.room} date={session?.date}/>
  </AbsoluteFill>;
};