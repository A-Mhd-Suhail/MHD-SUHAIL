import{j as e}from"./index-DL4z2lqT.js";const i=({inline:t=!1})=>e.jsxs("div",{className:t?"loader-inline":"loader-container",children:[e.jsx("section",{className:t?"loader-section-inline":"loader-section",children:e.jsxs("div",{className:"loader loader-1",children:[e.jsx("div",{className:"loader-outter"}),e.jsx("div",{className:"loader-inner"})]})}),e.jsx("style",{children:`
        .loader-container {
          width: 100%;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          background: black;
        }

        .loader-section {
          width: 30%;
          min-height: 215px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          background: #080915;
          border-radius: 5px;
          box-shadow: 0px 0px 30px 1px #103136 inset;
        }

        /* Inline variant used inside cards/containers */
        .loader-inline { display: flex; align-items: center; justify-content: center; }
        .loader-section-inline { display: inline-flex; align-items: center; justify-content: center; background: transparent; box-shadow: none; padding: 8px; }

        .loader {
          position: relative;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: inline-block;
        }

        .loader-section-inline .loader { width: 28px; height: 28px; }
        .loader-section-inline .loader-1 .loader-outter,
        .loader-section-inline .loader-1 .loader-inner { border-width: 3px; }

        /* LOADER 1 */

        .loader-1 .loader-outter {
          position: absolute;
          border: 4px solid #126b50;
          border-left-color: transparent;
          border-bottom: 0;
          width: 100%;
          height: 100%;
          border-radius: 50%;

          animation: loader-1-outter 1s cubic-bezier(.42, .61, .58, .41) infinite;
        }

        .loader-1 .loader-inner {
          position: absolute;
          border: 4px solid #126b50;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          left: calc(50% - 20px);
          top: calc(50% - 20px);
          border-right: 0;
          border-top-color: transparent;

          animation: loader-1-inner 1s cubic-bezier(.42, .61, .58, .41) infinite;
        }

        /* KEYFRAMES */

        @keyframes loader-1-outter { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes loader-1-inner { 0% { transform: rotate(0deg); } 100% { transform: rotate(-360deg); } }

        @media only screen and (max-width: 600px) {
          .loader-section { width: 90%; min-width: 300px; }
        }
      `})]}),d="w-full bg-white border border-line rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#1e3a8a] focus:outline-none focus:border-[#2a8eff] focus:ring-2 focus:ring-[#2a8eff]/20 transition-all",l="block text-xs font-bold text-[#1e3a8a] uppercase tracking-wider mb-1.5";function x({title:t,sub:r}){return e.jsxs("div",{className:"mb-6",children:[e.jsx("h2",{className:"text-2xl font-bold text-ink tracking-tight mb-1",children:t}),e.jsx("p",{className:"text-xs sm:text-sm text-muted",children:r})]})}function c(){return e.jsxs("div",{className:"bg-surface border border-line rounded-2xl p-8 text-center shadow-xs",children:[e.jsx(i,{inline:!0}),e.jsx("p",{className:"text-xs font-medium text-muted mt-2",children:"Loading feature data…"})]})}function b({icon:t,title:r,sub:a}){return e.jsxs("div",{className:"bg-surface border border-line rounded-2xl p-10 text-center shadow-xs",children:[e.jsx("div",{className:"w-12 h-12 rounded-2xl bg-app border border-line flex items-center justify-center text-primary mx-auto mb-3",children:t}),e.jsx("p",{className:"text-base font-bold text-ink",children:r}),e.jsx("p",{className:"text-xs sm:text-sm text-muted mt-1 max-w-sm mx-auto",children:a})]})}function m({ok:t,warn:r,danger:a,children:n}){const o=t?"text-ok bg-ok-bg/90 border-ok-bd/40":a?"text-danger bg-danger-bg/90 border-danger-bd/40":"text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30";return e.jsx("span",{className:`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-xs ${o}`,children:n})}function p({filters:t,value:r,onChange:a}){return e.jsx("div",{className:"flex gap-2 border-b border-line pb-4 overflow-x-auto custom-scrollbar",children:t.map((n,o)=>e.jsx("button",{onClick:()=>a(n),className:`shrink-0 text-xs font-semibold px-4 py-2 rounded-xl border transition-all ${r===n?"bg-primary text-white border-primary shadow-sm":"bg-surface border-line text-muted hover:text-ink hover:bg-app"}`,children:n},`${n}-${o}`))})}const u="h-10 px-4 bg-primary text-white rounded-xl text-xs font-bold shadow-sm hover:bg-primary-d transition-colors";export{b as E,p as F,c as L,x as P,m as S,u as b,d as i,l};
