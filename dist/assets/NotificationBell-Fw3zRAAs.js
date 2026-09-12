import{c as s,r as c,j as a,d,a as f}from"./index-pBQOMmUV.js";import{o as g,b as k,d as b,m as w,q as v,w as N,n as j}from"./firebase-BgZpbYau.js";import{B as _}from"./fs-DyLzStxq.js";/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B=[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]],$=s("calendar",B);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]],q=s("layout-dashboard",C);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E=[["path",{d:"m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z",key:"wa1lgi"}],["path",{d:"m8.5 8.5 7 7",key:"rvfmvr"}]],A=s("pill",E);function D({onOpen:l}){const[o,t]=c.useState(0);return c.useEffect(()=>{let e,i=!1;const h=g(f,r=>{e?.(),e=void 0,t(0),r&&k(b(d,"users",r.uid)).then(u=>{if(i)return;const n=u.data()?.role,y=[r.uid,n?`role:${n}`:""].filter(Boolean);e=w(v(j(d,"notifications"),N("to","in",y)),x=>t(x.docs.reduce((m,p)=>m+(p.data().read?0:1),0)),()=>t(0))}).catch(()=>t(0))});return()=>{i=!0,e?.(),h()}},[]),a.jsxs("button",{onClick:l,title:"Notifications",className:"relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-surface text-muted hover:text-primary hover:border-primary transition-colors",children:[a.jsx(_,{className:"w-5 h-5",strokeWidth:1.5}),o>0&&a.jsx("span",{className:"absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center",children:o>99?"99+":o})]})}export{$ as C,q as L,D as N,A as P};
