import{c as n,d as o}from"./index-MNC2LUgz.js";import{j as f,d as r,r as i,n as d,u,t as w}from"./firebase-tnuaLdwr.js";/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=[["path",{d:"M10.268 21a2 2 0 0 0 3.464 0",key:"vwvbt9"}],["path",{d:"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",key:"11g9vi"}]],R=n("bell",p);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}],["path",{d:"M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662",key:"154egf"}]],$=n("circle-user",g);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"r6nss1"}]],j=n("house",k);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _=[["path",{d:"m16 17 5-5-5-5",key:"1bji2h"}],["path",{d:"M21 12H9",key:"dn1m92"}],["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}]],C=n("log-out",_);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]],T=n("refresh-cw",v);async function l(a,e,t,s){try{await i(d(o,"notifications"),{to:a,title:e,body:t,navTarget:s??null,read:!1,createdAt:Date.now()})}catch(c){console.warn("notify failed",c)}}async function M(a,e,t,s){return l("role:"+a,e,t,s)}async function m(a,e,t,s){try{await i(d(o,"accessLog"),{patientId:a,actorName:e,actorRole:t,action:s,createdAt:Date.now()})}catch(c){console.warn("logAccess failed",c)}}const h=(a,e)=>[a,e].sort().join("_");async function D(a,e){try{await f(r(o,"threads",h(a,e)),{ids:[a,e].sort(),lastAt:Date.now()},{merge:!0})}catch(t){console.warn("ensureThread failed",t)}}async function A(a,e,t,s){const c=h(a.id,e);await f(r(o,"threads",c),{ids:[a.id,e].sort(),lastAt:Date.now()},{merge:!0}),await i(d(o,"threads",c,"m"),{from:a.id,fromRole:a.role,text:t,at:Date.now()});const y=a.role==="doctor"?"Dr. "+a.name:a.name;await l(e,"New message",`${y}: ${t.slice(0,80)}`,"messages")}const b=a=>u(r(o,"notifications",a),{read:!0}),N=a=>w(r(o,"notifications",a)),O=Object.freeze(Object.defineProperty({__proto__:null,clearNotification:N,ensureThread:D,logAccess:m,markNotifRead:b,notify:l,notifyRole:M,sendChatMessage:A,threadId:h},Symbol.toStringTag,{value:"Module"}));export{R as B,$ as C,j as H,C as L,T as R,M as a,N as c,D as e,O as f,m as l,b as m,l as n,A as s};
