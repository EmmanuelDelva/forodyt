import React from 'react';
import {Composition} from 'remotion';
import {VenueLoop} from './compositions/VenueLoop';import {SessionLoop} from './compositions/SessionLoop';import {LowerThird} from './compositions/LowerThird';import {StatePreview} from './compositions/StatePreview';

export const RemotionRoot:React.FC=()=> <>
  <Composition id="ForoDyT-VenueLoop" component={VenueLoop} durationInFrames={1500} fps={30} width={1920} height={1080} defaultProps={{venueId:'cucea',sessionId:'cucea-conf-inaugural',tagline:'Las grandes preguntas también tienen un foro.'}}/>
  <Composition id="ForoDyT-SessionLoop" component={SessionLoop} durationInFrames={1500} fps={30} width={1920} height={1080} defaultProps={{sessionId:'cucea-conf-inaugural',mode:'current'}}/>
  <Composition id="ForoDyT-LowerThird" component={LowerThird} durationInFrames={240} fps={30} width={1920} height={1080} defaultProps={{name:'Ing. Miguel Ángel Gaspar',institution:'ALGDETIC · CiberPadres LATAM',country:'Paraguay',role:'Conferencista inaugural',session:'Conferencia inaugural · CUCEA'}}/>
  <Composition id="ForoDyT-State-HOLDING" component={StatePreview} durationInFrames={180} fps={30} width={1920} height={1080} defaultProps={{state:'holding',sessionId:'cucea-conf-inaugural'}}/>
  <Composition id="ForoDyT-State-STARTING-SOON" component={StatePreview} durationInFrames={180} fps={30} width={1920} height={1080} defaultProps={{state:'starting-soon',sessionId:'cucea-conf-inaugural'}}/>
  <Composition id="ForoDyT-State-CURRENT" component={StatePreview} durationInFrames={240} fps={30} width={1920} height={1080} defaultProps={{state:'current',sessionId:'cucea-conf-inaugural'}}/>
  <Composition id="ForoDyT-State-SPEAKER" component={StatePreview} durationInFrames={240} fps={30} width={1920} height={1080} defaultProps={{state:'speaker',sessionId:'cucea-conf-inaugural'}}/>
  <Composition id="ForoDyT-State-NEXT" component={StatePreview} durationInFrames={180} fps={30} width={1920} height={1080} defaultProps={{state:'next',sessionId:'cucea-conf-inaugural'}}/>
  <Composition id="ForoDyT-State-BREAK" component={StatePreview} durationInFrames={180} fps={30} width={1920} height={1080} defaultProps={{state:'break',sessionId:'cucea-break-1'}}/>
  <Composition id="ForoDyT-State-LIVE" component={StatePreview} durationInFrames={240} fps={30} width={1920} height={1080} defaultProps={{state:'live',sessionId:'cucea-conf-inaugural'}}/>
  <Composition id="ForoDyT-State-TECHNICAL-PAUSE" component={StatePreview} durationInFrames={180} fps={30} width={1920} height={1080} defaultProps={{state:'technical-pause',sessionId:'cucea-conf-inaugural'}}/>
  <Composition id="ForoDyT-State-CLOSING" component={StatePreview} durationInFrames={180} fps={30} width={1920} height={1080} defaultProps={{state:'closing',sessionId:'cucea-closing'}}/>
  <Composition id="ForoDyT-State-STRESS" component={StatePreview} durationInFrames={240} fps={30} width={1920} height={1080} defaultProps={{state:'stress',sessionId:'cucea-conf-inaugural'}}/>
</>;
