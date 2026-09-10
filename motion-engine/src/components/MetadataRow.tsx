import React from 'react';
import {Interactive} from 'remotion';

export const MetadataRow:React.FC<{items:string[]}>=({items})=><Interactive.Div name="Metadata row" style={{
  display:'flex',gap:24,alignItems:'center',fontFamily:'JetBrains Mono',fontSize:18,fontWeight:650,
  letterSpacing:1.2,textTransform:'uppercase',color:'#2A5C5C',marginTop:26,flexWrap:'wrap'
}}>{items.filter(Boolean).map((item,i)=><React.Fragment key={`${item}-${i}`}><span>{item}</span>{i<items.length-1?<span style={{color:'#B8923E'}}>·</span>:null}</React.Fragment>)}</Interactive.Div>;
