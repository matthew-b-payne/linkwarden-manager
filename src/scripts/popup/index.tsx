import '@/styles/index.css';
import { createRoot } from 'react-dom/client';
import Popup from './Popup';
import React from 'react';
import { applyDocumentSize, readPopupSize } from './popupSize';
import { initTheme } from '../utils/theme';

// Both run before the first paint: the browser sizes the popup window straight to the remembered
// size instead of opening at the default and visibly resizing once React mounts, and the theme
// lands without a flash of the wrong palette.
applyDocumentSize(readPopupSize());
initTheme();

const container = document.getElementById('popup-root');
const root = createRoot(container!);

root.render(<Popup />);
