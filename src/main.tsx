import React from 'react';
import ReactDOM from 'react-dom/client';
import { App as CapApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import App from './App';
import './index.css';
import { isNative } from './native/native';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if (isNative()) {
  void SplashScreen.hide();
  // Botão "voltar" do Android: volta na navegação; na tela inicial, minimiza.
  void CapApp.addListener('backButton', () => {
    if (location.hash && location.hash !== '#/' && location.hash !== '#') history.back();
    else void CapApp.minimizeApp();
  });
}
