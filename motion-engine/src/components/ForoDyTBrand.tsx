import React from 'react';
import {Interactive} from 'remotion';
import {AnimatedRule} from './AnimatedRule';

export const ForoDyTBrand:React.FC<{compact?:boolean}>=({compact=false})=><div>
  <Interactive.Div name="ForoDyT wordmark" style={{fontFamily:'Fraunces',fontSize:compact?42:66,fontWeight:750,lineHeight:.96,letterSpacing:-1.5,color:'#0E1B2C'}}>Foro Internacional<br/>de Derecho <em style={{color:'#2A5C5C',fontWeight:500}}>y Tecnología</em></Interactive.Div>
  <div style={{marginTop:18}}><AnimatedRule width={compact?360:570}/></div>
  <Interactive.Div name="Edition label" style={{fontFamily:'JetBrains Mono',fontSize:15,fontWeight:750,letterSpacing:4.2,textTransform:'uppercase',color:'#B8923E',marginTop:14}}>IV EDICIÓN · 2026</Interactive.Div>
</div>;
