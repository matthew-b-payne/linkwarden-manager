import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/index.css';
import { initTheme } from '../utils/theme';

initTheme();

const OnInstalled = () => {
  return (
    <div>
      <h1>Thanks for Installing!</h1>
    </div>
  );
};

const container = document.getElementById('onInstalled');
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <OnInstalled />
  </React.StrictMode>,
);
