import React from 'react';
import {Interactive} from 'remotion';

export const VenueFooter:React.FC<{venue:string;room?:string;date?:string}>=({venue,room,date})=><Interactive.Div name="Venue footer" style={{
  position:'absolute',left:116,right:116,bottom:66,display:'flex',justifyContent:'space-between',alignItems:'flex-end',
  fontFamily:'JetBrains Mono',fontSize:16,fontWeight:650,letterSpacing:1.1,color:'#0E1B2C'
}}><div><div style={{color:'#B8923E',marginBottom:5}}>IV FORODYT · 2026</div><div>{venue}{room?` · ${room}`:''}</div></div><div style={{textAlign:'right',color:'#2A5C5C'}}>{date??'21 · 22 SEP 2026'}<br/>forodyt.com</div></Interactive.Div>;
