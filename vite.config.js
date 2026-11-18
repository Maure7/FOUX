import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// O canvas é um iframe srcdoc e herda esta política. Imagens, fontes, estilos, mídias e
// iframes do HTML do aluno continuam liberados como num navegador comum; o que fica
// restrito é script (só os do próprio app, sem eval nem inline), <object>/<embed> e envio de formulário.
const USER_CONTENT = "'self' https: http: data: blob: file:"
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  `style-src ${USER_CONTENT} 'unsafe-inline'`,
  `img-src ${USER_CONTENT}`,
  `font-src ${USER_CONTENT}`,
  `media-src ${USER_CONTENT}`,
  // A exportação de CSS lê folhas externas e blob: com fetch.
  `connect-src ${USER_CONTENT}`,
  `frame-src ${USER_CONTENT}`,
  "object-src 'none'",
  "form-action 'none'",
].join('; ')

// Só no build: o servidor de desenvolvimento injeta script inline (React Refresh) e usa WebSocket.
export function contentSecurityPolicy() {
  return {
    name: 'foux-content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [{
      tag: 'meta',
      attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
      injectTo: 'head-prepend',
    }],
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), contentSecurityPolicy()],
})
