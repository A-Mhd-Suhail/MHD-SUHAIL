import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import 'leaflet/dist/leaflet.css';
import {Toaster} from './components/Toaster';
import {initPrefs} from './lib/prefs';
import {startI18N} from './lib/i18n';

initPrefs();
startI18N();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster />
  </StrictMode>,
);
