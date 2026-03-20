import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

document.title = "COBO by Mattz";
setTimeout(() => {
  document.title = "COBO by Mattz";
}, 1000);
setTimeout(() => {
  document.title = "COBO by Mattz";
}, 5000);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
