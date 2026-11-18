import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import './index.css'
import './styles/Dashboard.css'
import './styles/LiquidGlass.css'
import './styles/scrollbars.css'
import './styles/interaction-polish.css'
import './styles/glass.css'
import './styles/refinements.css'
import './styles/logo.css'
import './styles/themes/light-comfort.css'
import App from './App.jsx'

function flushPendingChanges() {
  // Conclui as atualizações do editor e os efeitos de persistência do React antes de responder ao processo principal.
  flushSync(() => window.dispatchEvent(new Event('foux:before-close')));
}
window.fouxDesktop?.onBeforeClose(flushPendingChanges);
if (window.fouxDesktop) {
  window.addEventListener('beforeunload', flushPendingChanges);
  // Fechamentos pedidos pela própria página também passam pelo aperto de mão de salvamento.
  window.close = () => window.fouxDesktop.requestClose();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
