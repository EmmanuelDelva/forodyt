import React from 'react';
import {staticFile} from 'remotion';

export const FontFaces: React.FC = () => (
  <style>{`
    @font-face{font-family:'Fraunces';src:url('${staticFile('fonts/Fraunces.ttf')}') format('truetype');font-style:normal;font-weight:300 900;font-display:block;}
    @font-face{font-family:'Fraunces';src:url('${staticFile('fonts/Fraunces-Italic.ttf')}') format('truetype');font-style:italic;font-weight:300 900;font-display:block;}
    @font-face{font-family:'Inter';src:url('${staticFile('fonts/Inter.ttf')}') format('truetype');font-style:normal;font-weight:100 900;font-display:block;}
    @font-face{font-family:'JetBrains Mono';src:url('${staticFile('fonts/JetBrainsMono.ttf')}') format('truetype');font-style:normal;font-weight:100 800;font-display:block;}
  `}</style>
);
