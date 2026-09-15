import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

const suppressHmrPlugin: Plugin = {
  name: 'suppress-vite-hmr-rejection',
  transformIndexHtml: {
    order: 'pre',
    handler() {
      return [
        {
          tag: 'script',
          children: `(function(){if(typeof window==="undefined")return;var N=window.WebSocket;if(!N)return;function V(u,p){var em=new EventTarget();this.url=String(u);this.protocol="vite-hmr";this.readyState=1;this.OPEN=1;this.CONNECTING=0;this.CLOSING=2;this.CLOSED=3;this.bufferedAmount=0;this.binaryType="blob";this.extensions="";this.onopen=null;this.onclose=null;this.onerror=null;this.onmessage=null;this.send=function(){};this.close=function(c,r){this.readyState=3;var ev=typeof CloseEvent!=="undefined"?new CloseEvent("close",{code:c||1000,reason:r||"",wasClean:true}):new Event("close");this.dispatchEvent(ev);if(typeof this.onclose==="function")this.onclose(ev)};this.addEventListener=function(t,l,o){em.addEventListener(t,l,o)};this.removeEventListener=function(t,l,o){em.removeEventListener(t,l,o)};this.dispatchEvent=function(e){return em.dispatchEvent(e)};var s=this;setTimeout(function(){if(s.readyState===1){var ev=new Event("open");s.dispatchEvent(ev);if(typeof s.onopen==="function")s.onopen(ev)}},0)}V.prototype=N.prototype;var P=function(u,p){var isVite=p==="vite-hmr"||(Array.isArray(p)&&p.indexOf("vite-hmr")!==-1);if(isVite){return new V(u,p)}return new N(u,p)};P.prototype=N.prototype;P.OPEN=N.OPEN||1;P.CONNECTING=N.CONNECTING||0;P.CLOSING=N.CLOSING||2;P.CLOSED=N.CLOSED||3;window.WebSocket=P;var ce=console.error;console.error=function(){var m=arguments[0];if(typeof m==="string"&&(m.indexOf("[vite] failed to connect to websocket")!==-1||m.indexOf("WebSocket closed without opened")!==-1)){return}return ce.apply(console,arguments)};window.addEventListener("unhandledrejection",function(e){var r=e&&(e.reason||e);var s=(typeof r==="string"?r:(r&&(r.message||r.stack)))||"";if(s.indexOf("WebSocket closed without opened")!==-1||s.indexOf("failed to connect to websocket")!==-1){e.preventDefault();if(e.stopImmediatePropagation)e.stopImmediatePropagation()}},true);window.addEventListener("error",function(e){var m=(e&&(e.message||(e.error&&e.error.message)))||"";if(typeof m==="string"&&(m.indexOf("WebSocket closed without opened")!==-1||m.indexOf("failed to connect to websocket")!==-1)){e.preventDefault();if(e.stopImmediatePropagation)e.stopImmediatePropagation()}},true)})();`,
          injectTo: 'head-prepend'
        }
      ];
    }
  }
};

export default defineConfig(() => {
  return {
    plugins: [suppressHmrPlugin, react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
