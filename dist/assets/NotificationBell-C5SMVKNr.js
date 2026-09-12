import{c as o,r as c,j as s,d,a as f}from"./index-MNC2LUgz.js";import{o as k,b as g,d as b,m as w,q as N,w as j,n as v}from"./firebase-tnuaLdwr.js";import{B as _}from"./fs-BA1Lr6kP.js";/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S=[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]],q=o("calendar",S);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B=[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]],A=o("layout-dashboard",B);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=[["path",{d:"m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z",key:"wa1lgi"}],["path",{d:"m8.5 8.5 7 7",key:"rvfmvr"}]],D=o("pill",C);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $=[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]],P=o("search",$);function I({onOpen:h}){const[r,t]=c.useState(0);return c.useEffect(()=>{let e,i=!1;const l=k(f,a=>{e?.(),e=void 0,t(0),a&&g(b(d,"users",a.uid)).then(u=>{if(i)return;const n=u.data()?.role,y=[a.uid,n?`role:${n}`:""].filter(Boolean);e=w(N(v(d,"notifications"),j("to","in",y)),x=>t(x.docs.reduce((m,p)=>m+(p.data().read?0:1),0)),()=>t(0))}).catch(()=>t(0))});return()=>{i=!0,e?.(),l()}},[]),s.jsxs("button",{onClick:h,title:"Notifications",className:"relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-surface text-muted hover:text-primary hover:border-primary transition-colors",children:[s.jsx(_,{className:"w-5 h-5",strokeWidth:1.5}),r>0&&s.jsx("span",{className:"absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center",children:r>99?"99+":r})]})}export{q as C,A as L,I as N,D as P,P as S};
