import React from 'react';
import '@/styles/index.css';
import { createRoot } from 'react-dom/client';
import Options from './Options';
import { initTheme } from '../utils/theme';

initTheme();

const container = document.getElementById('options-root');
const root = createRoot(container!);

root.render(<Options />);
