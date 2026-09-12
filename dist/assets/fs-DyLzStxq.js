import{c as o,d as s}from"./index-pBQOMmUV.js";import{j as y,d as i,r,n as d,u,t as p}from"./firebase-BgZpbYau.js";/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w=[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]],C=o("activity",w);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=[["path",{d:"M10.268 21a2 2 0 0 0 3.464 0",key:"vwvbt9"}],["path",{d:"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",key:"11g9vi"}]],T=o("bell",k);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _=[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]],q=o("chevron-right",_);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}],["path",{d:"M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662",key:"154egf"}]],z=o("circle-user",g);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"r6nss1"}]],O=o("house",v);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M=[["path",{d:"m16 17 5-5-5-5",key:"1bji2h"}],["path",{d:"M21 12H9",key:"dn1m92"}],["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}]],x=o("log-out",M);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=[["path",{d:"M4 5h16",key:"1tepv9"}],["path",{d:"M4 12h16",key:"1lakjw"}],["path",{d:"M4 19h16",key:"1djgab"}]],B=o("menu",m);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A=[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]],S=o("refresh-cw",A);async function l(a,e,t,c){try{await r(d(s,"notifications"),{to:a,title:e,body:t,navTarget:c??null,read:!1,createdAt:Date.now()})}catch(n){console.warn("notify failed",n)}}async function N(a,e,t,c){return l("role:"+a,e,t,c)}async function b(a,e,t,c){try{await r(d(s,"accessLog"),{patientId:a,actorName:e,actorRole:t,action:c,createdAt:Date.now()})}catch(n){console.warn("logAccess failed",n)}}const h=(a,e)=>[a,e].sort().join("_");async function D(a,e){try{await y(i(s,"threads",h(a,e)),{ids:[a,e].sort(),lastAt:Date.now()},{merge:!0})}catch(t){console.warn("ensureThread failed",t)}}async function $(a,e,t,c){const n=h(a.id,e);await y(i(s,"threads",n),{ids:[a.id,e].sort(),lastAt:Date.now()},{merge:!0}),await r(d(s,"threads",n,"m"),{from:a.id,fromRole:a.role,text:t,at:Date.now()});const f=a.role==="doctor"?"Dr. "+a.name:a.name;await l(e,"New message",`${f}: ${t.slice(0,80)}`,"messages")}const j=a=>u(i(s,"notifications",a),{read:!0}),H=a=>p(i(s,"notifications",a)),V=Object.freeze(Object.defineProperty({__proto__:null,clearNotification:H,ensureThread:D,logAccess:b,markNotifRead:j,notify:l,notifyRole:N,sendChatMessage:$,threadId:h},Symbol.toStringTag,{value:"Module"}));export{C as A,T as B,q as C,O as H,x as L,B as M,S as R,z as a,N as b,H as c,D as e,V as f,b as l,j as m,l as n,$ as s,h as t};
