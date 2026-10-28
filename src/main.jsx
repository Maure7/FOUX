import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import './index.css'
import './styles/Dashboard.css'
import './styles/LiquidGlass.css'
import './styles/scrollbars.css'
import './styles/interaction-polish.css'
import App from './App.jsx'

function flushPendingChanges() {
  // Complete editor updates and React's persistence effects before acknowledging.
  flushSync(() => window.dispatchEvent(new Event('foux:before-close')));
}
window.fouxDesktop?.onBeforeClose(flushPendingChanges);
if (window.fouxDesktop) {
  window.addEventListener('beforeunload', flushPendingChanges);
  // Renderer-initiated closes also pass through the main-process save handshake.
  window.close = () => window.fouxDesktop.requestClose();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
