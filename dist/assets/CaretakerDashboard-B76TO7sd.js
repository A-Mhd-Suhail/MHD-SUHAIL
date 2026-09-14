import{c as X,r as l,a as B,t as G,j as e,H as ee,A as se,L as te,T as ae,U as Y,b as re,d as h,X as de}from"./index-DL4z2lqT.js";import{x as M,k,y as U,z as E,A as L,j as le,B as T,v as ie}from"./firebase-Dy0s63gn.js";import{M as ne,C as oe,R as ce,A as he,m as P,B as me,a as _,n as be,L as xe}from"./fs-DCMy2R2f.js";import pe from"./NotificationsTab-ClrIwtu5.js";import{S as fe}from"./SettingsTab-BjzbIb32.js";import{N as ue,L as ge,P as q,C as K}from"./NotificationBell-BnAOCeP8.js";import{C as J}from"./check-DX3ooeHe.js";import"./react-DfSJUp79.js";import"./history-j1KcE5yn.js";import"./credit-card-DEALeggs.js";/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const je=[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]],Ne=X("clipboard-list",je);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ve=[["circle",{cx:"12",cy:"8",r:"5",key:"1hypcn"}],["path",{d:"M20 21a8 8 0 0 0-16 0",key:"rfgkzh"}]],ke=X("user-round",ve);function Ue({onLogout:i}){const[a,x]=l.useState(null),[p,y]=l.useState([]),[o,w]=l.useState([]),[m,R]=l.useState([]),[f,$]=l.useState(""),[r,b]=l.useState("overview"),[H,j]=l.useState(""),[Q,C]=l.useState(!1);l.useEffect(()=>{const s=t=>{const c=t.detail;c==="appointments"?b("appointments"):c==="patients"?b("patients"):c==="notifs"&&b("notifications")};return window.addEventListener("mhd:navigate",s),()=>window.removeEventListener("mhd:navigate",s)},[]),l.useEffect(()=>{const s=B.currentUser?.uid;if(s)return M(k(h,"users",s),t=>t.exists()&&x({id:t.id,...t.data()}))},[]),l.useEffect(()=>{if(!a?.id)return;const s=U(L(h,"users"),E("caretakerAssignment.caretakerId","==",a.id));return M(s,async t=>{const c=new Map;if(t.docs.forEach(d=>{const g={id:d.id,...d.data()};g.role==="patient"&&["pending","accepted"].includes(g.caretakerAssignment?.status||"")&&c.set(g.id,g)}),a.caretakerPatientId&&!c.has(a.caretakerPatientId)){const d=await le(k(h,"users",a.caretakerPatientId));d.exists()&&d.data().role==="patient"&&c.set(d.id,{id:d.id,...d.data()})}const v=[...c.values()];y(v),$(d=>v.some(g=>g.id===d)?d:v[0]?.id||"")},()=>j("Could not load assigned patients."))},[a?.id,a?.caretakerPatientId]);const u=p.map(s=>s.id);l.useEffect(()=>{if(!u.length){w([]);return}return M(U(L(h,"medicines"),E("patientId","in",u.slice(0,30))),s=>w(s.docs.map(t=>({id:t.id,...t.data()}))),()=>j("Could not load medicine instructions."))},[u.join(",")]),l.useEffect(()=>{if(!u.length){R([]);return}return M(U(L(h,"appointments"),E("patientId","in",u.slice(0,30))),s=>R(s.docs.map(t=>({id:t.id,...t.data()}))),()=>j("Could not load appointments."))},[u.join(",")]);const n=p.find(s=>s.id===f),D=G(),N=l.useMemo(()=>o.filter(s=>s.patientId===f&&s.active!==!1),[o,f]),A=l.useMemo(()=>m.filter(s=>s.patientId===f).sort((s,t)=>`${s.date} ${s.time}`.localeCompare(`${t.date} ${t.time}`)),[m,f]),S=p,O=async(s,t)=>{try{await T(k(h,"medicines",s.id),{[`takenDates.${D}`]:t,lastUpdatedBy:a?.name||"Nurse",lastUpdatedAt:Date.now()})}catch{j("Could not save this care update.")}},z=async s=>{if(!(!n?.caretakerAssignment||n.caretakerAssignment.caretakerId!==a.id))try{await T(k(h,"users",n.id),{"caretakerAssignment.status":s?"accepted":"rejected","caretakerAssignment.updatedAt":Date.now(),...s?{caretakerPatientId:n.id,caretakerPatientName:n.name}:{}}),await T(k(h,"users",a.id),{...s?{caretakerPatientId:n.id,caretakerPatientName:n.name}:{}}),await be(n.id,s?"Your caretaker is now connected":"Caretaker assignment declined",s?`${a.name} accepted the doctor’s assignment. You can now call or message your caretaker from My Caretaker.`:`${a.name} declined the caretaker assignment.`,"caretaker")}catch{j("Could not save the assignment response.")}},Z=async()=>{await ie(B).catch(()=>{}),i()},F=[["overview","Overview",ge],["patients","All Patients",Y],["medicines","Medicine Monitor",q],["appointments","Appointments",K],["activity","Care Activities",re],["notifications","Notifications",me],["myinfo","My Info",_]];if(!a)return e.jsx("div",{className:"min-h-screen flex items-center justify-center bg-app text-muted",children:"Loading Caretaker Portal…"});const W=()=>e.jsxs("aside",{className:"portal-dark-sidebar w-[270px] bg-white text-[#1e3a8a] p-5 flex flex-col h-full shrink-0 border-r border-slate-200",children:[e.jsxs("div",{className:"flex items-center justify-between mb-8",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"p-2 rounded-xl bg-primary/10 border border-primary/20 text-[#2a8eff]",children:e.jsx(Ne,{className:"w-6 h-6"})}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-[15px] font-bold tracking-tight text-[#1e3a8a] leading-none",children:"UNITED MEDICATION"}),e.jsx("p",{className:"text-[10px] text-[#2a8eff] uppercase tracking-wider font-semibold mt-1",children:"Caretaker Portal"})]})]}),e.jsx("button",{onClick:()=>C(!1),className:"lg:hidden p-1 text-slate-500 hover:text-[#1e3a8a]",children:e.jsx(de,{className:"w-5 h-5"})})]}),e.jsx("nav",{className:"flex-1 overflow-y-auto px-1 space-y-1 custom-scrollbar",children:F.map(([s,t,c],v)=>{const d=r===s;return e.jsxs("button",{onClick:()=>{b(s),C(!1)},className:`relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${d?"bg-[#2a8eff] text-white font-semibold shadow-md shadow-[#2a8eff]/30":"text-[#2a8eff] hover:bg-slate-100 bg-white"}`,children:[e.jsx(c,{className:`w-4 h-4 shrink-0 relative z-10 ${d?"text-white":"text-[#2a8eff]"}`,strokeWidth:1.5}),e.jsx("span",{className:`truncate relative z-10 ${d?"text-white":"text-[#2a8eff]"}`,children:t})]},`${s}-${v}`)})}),e.jsxs("div",{className:"pt-4 border-t border-slate-200 space-y-2 shrink-0",children:[e.jsxs("div",{className:"flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-200",children:[e.jsx("div",{className:"w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center",children:e.jsx(_,{className:"w-5 h-5 text-[#2a8eff]",strokeWidth:1.5})}),e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("p",{className:"text-[13px] font-semibold text-[#1e3a8a] truncate",children:a.name}),e.jsx("p",{className:"text-[11px] text-slate-500 truncate",children:a.email})]})]}),e.jsxs("button",{onClick:Z,className:"w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors border border-red-500 shadow-sm",children:[e.jsx(xe,{className:"w-3.5 h-3.5 text-white",style:{color:"#ffffff"},strokeWidth:1.5}),e.jsx("span",{className:"text-white font-bold",style:{color:"#ffffff"},children:"Logout"})]})]})]});return e.jsxs("div",{className:"dashboard-shell flex h-screen bg-white text-[#1e3a8a] overflow-hidden",children:[e.jsx("style",{children:`
        .dashboard-shell { background: #ffffff !important; color: #1e3a8a !important; }
        .dashboard-shell .bg-app,
        .dashboard-shell .bg-surface,
        .dashboard-shell .bg-white,
        .dashboard-shell main,
        .dashboard-shell header { background-color: #ffffff !important; }

        .dashboard-shell header button[title="Home"],
        .dashboard-shell header button[title="Back"],
        .dashboard-shell header button[title="Refresh portal"] {
          background-color: #ffffff !important;
          color: #1e3a8a !important;
          border: 1px solid #e2e8f0 !important;
        }
        .dashboard-shell header button[title="Home"] *,
        .dashboard-shell header button[title="Back"] *,
        .dashboard-shell header button[title="Refresh portal"] * {
          color: #1e3a8a !important;
        }

        .dashboard-shell .text-ink,
        .dashboard-shell .text-muted,
        .dashboard-shell .text-heading,
        .dashboard-shell p,
        .dashboard-shell h1,
        .dashboard-shell h2,
        .dashboard-shell h3,
        .dashboard-shell h4,
        .dashboard-shell span,
        .dashboard-shell div,
        .dashboard-shell td,
        .dashboard-shell label { color: #1e3a8a !important; }

        /* COMPULSORY RULE: IF BACKGROUND IS BLUE OR DARK NAVY (#1c364f, #102B47, #071A2D, bg-navy), TEXT MUST BE WHITE */
        .dashboard-shell .bg-primary,
        .dashboard-shell .bg-[#2a8eff],
        .dashboard-shell .bg-[#1e74ff],
        .dashboard-shell .bg-blue-600,
        .dashboard-shell .bg-blue-500,
        .dashboard-shell [class*="bg-green-"],
        .dashboard-shell [class*="bg-emerald-"],
        .dashboard-shell .bg-ok,
        .dashboard-shell .bg-ok-bg,
        .dashboard-shell .bg-success,
        .dashboard-shell [class*="bg-[#1c364f]"],
        .dashboard-shell [class*="bg-[#102B47]"],
        .dashboard-shell [class*="bg-[#071A2D]"],
        .dashboard-shell [class*="bg-[#0f172a]"],
        .dashboard-shell [class*="bg-[#1e293b]"],
        .dashboard-shell [style*="#1c364f"],
        .dashboard-shell [style*="#1C364F"] {
          color: #ffffff !important;
        }

        .dashboard-shell .bg-primary *,
        .dashboard-shell .bg-[#2a8eff] *,
        .dashboard-shell .bg-[#1e74ff] *,
        .dashboard-shell .bg-blue-600 *,
        .dashboard-shell .bg-blue-500 *,
        .dashboard-shell [class*="bg-green-"] *,
        .dashboard-shell [class*="bg-emerald-"] *,
        .dashboard-shell .bg-ok *,
        .dashboard-shell .bg-ok-bg *,
        .dashboard-shell .bg-success *,
        .dashboard-shell [class*="bg-[#1c364f]"] *,
        .dashboard-shell [class*="bg-[#102B47]"] *,
        .dashboard-shell [class*="bg-[#071A2D]"] *,
        .dashboard-shell [class*="bg-[#0f172a]"] *,
        .dashboard-shell [class*="bg-[#1e293b]"] *,
        .dashboard-shell [style*="#1c364f"] *,
        .dashboard-shell [style*="#1C364F"] *,
        .dashboard-shell th,
        .dashboard-shell thead th,
        .dashboard-shell table thead th,
        .dashboard-shell tr[class*="bg-blue"],
        .dashboard-shell td[class*="bg-blue"],
        .dashboard-shell th *,
        .dashboard-shell thead th *,
        .dashboard-shell table thead th *,
        .dashboard-shell tr[class*="bg-blue"] *,
        .dashboard-shell td[class*="bg-blue"] * {
          color: #ffffff !important;
        }

        .dashboard-shell button.bg-red-500,
        .dashboard-shell button.bg-red-500 *,
        .dashboard-shell button[class*="bg-red-"],
        .dashboard-shell button[class*="bg-red-"] *,
        .dashboard-shell .bg-red-500,
        .dashboard-shell .bg-red-500 * {
          color: #ffffff !important;
        }

        .dashboard-shell .border-line,
        .dashboard-shell .border-gray-200,
        .dashboard-shell .border-white/10,
        .dashboard-shell .border-white/5 { border-color: rgba(42, 142, 255, 0.25) !important; }
      `}),e.jsx("div",{className:"hidden lg:block h-screen",children:W()}),Q&&e.jsxs("div",{className:"fixed inset-0 z-[80] flex lg:hidden bg-slate-950/50 backdrop-blur-sm animate-in fade-in",children:[W(),e.jsx("div",{className:"flex-1",onClick:()=>C(!1)})]}),e.jsxs("div",{className:"flex-1 flex flex-col h-screen overflow-hidden min-w-0",children:[e.jsxs("header",{className:"h-[64px] bg-white border-b border-line flex items-center justify-between px-4 sm:px-8 shrink-0",children:[e.jsxs("div",{className:"flex items-center gap-3 min-w-0",children:[e.jsx("button",{onClick:()=>C(!0),className:"lg:hidden p-2 rounded-lg text-muted hover:bg-app",children:e.jsx(ne,{className:"w-5 h-5"})}),e.jsxs("div",{className:"hidden sm:flex items-center gap-2 text-xs text-muted font-medium truncate",children:[e.jsx("span",{children:"Caretaker Portal"}),e.jsx(oe,{className:"w-3.5 h-3.5 text-muted/60"}),e.jsx("span",{className:"text-ink font-semibold capitalize",children:r})]})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("button",{onClick:()=>b("overview"),title:"Home",className:"p-2 rounded-lg bg-white border border-line text-[#1e3a8a] hover:bg-slate-100",children:e.jsx(ee,{className:"w-4 h-4 text-[#1e3a8a]"})}),e.jsx("button",{onClick:()=>window.history.back(),title:"Back",className:"p-2 rounded-lg bg-white border border-line text-[#1e3a8a] hover:bg-slate-100",children:e.jsx(se,{className:"w-4 h-4 text-[#1e3a8a]"})}),e.jsx("button",{onClick:()=>window.location.reload(),title:"Refresh portal",className:"p-2 rounded-lg bg-white border border-line text-[#1e3a8a] hover:bg-slate-100",children:e.jsx(ce,{className:"w-4 h-4 text-[#1e3a8a]"})}),e.jsx(te,{}),e.jsx(ae,{insidePortal:!0}),e.jsx(ue,{onOpen:()=>b("notifications")})]})]}),e.jsx("main",{className:"flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar relative",children:e.jsx(he,{mode:"wait",children:e.jsxs(P.div,{initial:{opacity:0,y:10},animate:{opacity:1,y:0},exit:{opacity:0,y:-10},transition:{duration:.2},className:"max-w-[1250px] mx-auto space-y-6",children:[e.jsxs("div",{children:[e.jsx("h1",{className:"text-2xl font-bold text-ink tracking-tight",children:r==="overview"?"Care Monitoring Dashboard":F.find(s=>s[0]===r)?.[1]}),e.jsx("p",{className:"text-muted text-sm mt-1",children:r==="myinfo"?"Manage your personal profile, photo and care preferences.":"Monitor assigned patient medicines, appointments, and daily care activities."})]}),H&&e.jsx("div",{className:"bg-danger-bg border border-danger-bd text-danger rounded-2xl p-4 text-sm font-medium",children:H}),r==="notifications"&&e.jsx(pe,{}),r==="myinfo"&&e.jsx(fe,{me:a,onSaved:x}),r!=="myinfo"&&r!=="notifications"&&e.jsxs("div",{className:"bg-surface border border-line rounded-2xl p-4 flex flex-wrap items-center gap-4 shadow-xs",children:[e.jsx("label",{className:"text-xs font-bold text-muted uppercase tracking-wider",children:"Select Active Patient:"}),e.jsxs("select",{value:f,onChange:s=>$(s.target.value),className:"h-10 px-3.5 border border-line rounded-xl bg-app text-sm text-ink focus:outline-none focus:border-primary min-w-[260px] font-medium",children:[e.jsx("option",{value:"",children:"Select assigned patient"}),S.map((s,t)=>e.jsxs("option",{value:s.id,children:[s.name," · ",s.healthId||s.id.slice(0,8)]},`${s.id}-${t}`))]})]}),r==="overview"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"grid sm:grid-cols-2 lg:grid-cols-4 gap-4",children:[e.jsx(I,{icon:e.jsx(Y,{className:"w-5 h-5"}),n:p.length,label:"Assigned Patients"}),e.jsx(I,{icon:e.jsx(q,{className:"w-5 h-5"}),n:o.filter(s=>s.active!==!1).length,label:"Active Instructions"}),e.jsx(I,{icon:e.jsx(K,{className:"w-5 h-5"}),n:m.filter(s=>s.status==="upcoming").length,label:"Upcoming Consultations"}),e.jsx(I,{icon:e.jsx(J,{className:"w-5 h-5"}),n:N.filter(s=>s.takenDates?.[D]).length,label:"Taken Today"})]}),e.jsx(V,{selected:n,meds:N,appointments:A,mark:O,respond:z})]}),r==="patients"&&e.jsxs("section",{className:"bg-surface border border-line rounded-2xl overflow-hidden shadow-xs",children:[e.jsxs("div",{className:"p-4 sm:p-5 border-b border-line font-bold text-ink text-base bg-stripe",children:["Assigned Patients (",S.length,")"]}),e.jsx("div",{className:"overflow-x-auto custom-scrollbar",children:e.jsxs("table",{className:"w-full text-sm",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-app border-b border-line text-left text-muted font-semibold",children:[e.jsx("th",{className:"p-3.5",children:"Patient"}),e.jsx("th",{className:"p-3.5",children:"Health ID"}),e.jsx("th",{className:"p-3.5",children:"State"}),e.jsx("th",{className:"p-3.5",children:"District"}),e.jsx("th",{className:"p-3.5",children:"Phone"}),e.jsx("th",{className:"p-3.5",children:"Action"})]})}),e.jsx("tbody",{className:"divide-y divide-line",children:S.map((s,t)=>e.jsxs("tr",{className:"hover:bg-active/50 transition-colors",children:[e.jsx("td",{className:"p-3.5 font-semibold text-ink",children:s.name}),e.jsx("td",{className:"p-3.5 font-mono text-muted",children:s.healthId||"-"}),e.jsx("td",{className:"p-3.5 text-muted",children:s.state||"-"}),e.jsx("td",{className:"p-3.5 text-muted",children:s.district||"-"}),e.jsx("td",{className:"p-3.5 text-muted",children:s.phone||"-"}),e.jsx("td",{className:"p-3.5",children:e.jsx("button",{onClick:()=>{$(s.id),b("overview")},className:"text-primary font-bold hover:underline",children:"Monitor Care"})})]},`${s.id}-${t}`))})]})})]}),r==="medicines"&&e.jsx(V,{selected:n,meds:N,appointments:A,mark:O,respond:z}),r==="appointments"&&e.jsxs("section",{className:"bg-surface border border-line rounded-2xl p-6 shadow-xs",children:[e.jsxs("h2",{className:"font-bold text-ink text-lg mb-4",children:["Upcoming Appointments ",n?`for ${n.name}`:""]}),A.length?e.jsx("div",{className:"divide-y divide-line",children:A.map((s,t)=>e.jsxs("div",{className:"py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3",children:[e.jsxs("div",{children:[e.jsxs("b",{className:"text-ink font-bold",children:[s.date," · ",s.time]}),e.jsxs("p",{className:"text-sm text-muted mt-1",children:[s.doctorName," · ",s.hospital||"Hospital"," · ",s.type]})]}),e.jsx("span",{className:"self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 capitalize",children:s.status})]},`${s.id}-${t}`))}):e.jsx("p",{className:"text-muted text-sm py-4",children:"No appointments recorded for this patient."})]}),r==="activity"&&e.jsxs("section",{className:"bg-surface border border-line rounded-2xl p-6 shadow-xs",children:[e.jsx("h2",{className:"font-bold text-ink text-lg mb-4",children:"Care Activity Log"}),N.filter(s=>s.lastUpdatedAt).length?e.jsx("div",{className:"divide-y divide-line",children:N.filter(s=>s.lastUpdatedAt).map((s,t)=>e.jsxs("div",{className:"py-3.5 text-sm",children:[e.jsx("b",{className:"text-ink font-semibold",children:s.name}),e.jsxs("p",{className:"text-muted mt-0.5",children:[s.takenDates?.[D]?"Marked taken today":"Marked not taken today"," · Updated by ",String(s.lastUpdatedBy||"-")]})]},`${s.id}-${t}`))}):e.jsx("p",{className:"text-muted text-sm py-4",children:"No care activity recorded for the selected patient yet."})]})]},r)})})]})]})}function I({icon:i,n:a,label:x}){return e.jsxs(P.div,{whileHover:{y:-3,scale:1.01},className:"bg-surface border border-line rounded-2xl p-5 shadow-sm hover:shadow-md transition-all",children:[e.jsxs("div",{className:"flex items-center justify-between mb-2",children:[e.jsx("span",{className:"text-3xl font-bold text-ink tracking-tight",children:a}),e.jsx("div",{className:"p-2.5 rounded-xl bg-app text-primary",children:i})]}),e.jsx("p",{className:"text-xs font-bold text-muted uppercase tracking-wider",children:x})]})}function V({selected:i,meds:a,appointments:x,mark:p,respond:y}){return e.jsxs("section",{className:"bg-surface border border-line rounded-2xl p-6 shadow-xs",children:[i?.caretakerAssignment?.status==="pending"&&i.caretakerAssignment.caretakerId===B.currentUser?.uid&&e.jsxs("div",{className:"mb-6 bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 rounded-2xl p-4 text-sm",children:[e.jsx("b",{children:"Caretaker assignment request"}),e.jsxs("p",{className:"mt-1",children:["Dr. ",i.caretakerAssignment.doctorName.replace(/^Dr. /,"")," assigned you to care for this patient."]}),e.jsxs("div",{className:"flex gap-3 mt-3",children:[e.jsx("button",{onClick:()=>y(!0),className:"px-4 py-1.5 bg-ok text-white font-semibold rounded-xl text-xs shadow-sm",children:"Accept Assignment"}),e.jsx("button",{onClick:()=>y(!1),className:"px-4 py-1.5 border border-danger-bd text-danger font-semibold rounded-xl text-xs hover:bg-danger-bg",children:"Decline"})]})]}),e.jsxs("div",{className:"flex items-center gap-4 mb-6 pb-4 border-b border-line",children:[e.jsx("div",{className:"w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0",children:e.jsx(ke,{className:"w-6 h-6"})}),e.jsxs("div",{children:[e.jsx("h2",{className:"text-lg font-bold text-ink",children:i?i.name:"Select a Patient"}),e.jsx("p",{className:"text-xs text-muted mt-0.5",children:i?`${i.healthId||""} · ${i.state||""}, ${i.district||""}`:"Choose an assigned patient above to view medicine schedule."})]})]}),i&&e.jsxs(e.Fragment,{children:[e.jsx("h3",{className:"font-bold text-ink text-base mb-3",children:"Daily Medication Checklist"}),a.length?e.jsx("div",{className:"space-y-3",children:a.map((o,w)=>{const m=!!o.takenDates?.[G()];return e.jsxs(P.div,{whileHover:{scale:1.005},className:"border border-line rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-app hover:bg-surface transition-all shadow-xs",children:[e.jsxs("div",{children:[e.jsx("b",{className:"text-ink font-semibold text-base",children:o.name}),e.jsxs("p",{className:"text-xs text-muted mt-0.5",children:[o.dosage||"Follow doctor instructions"," · Prescribed by ",o.prescribedBy||"Doctor"]})]}),e.jsxs(P.button,{whileTap:{scale:.95},onClick:()=>p(o,!m),className:`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${m?"bg-ok-bg text-ok border border-ok-bd/40":"bg-primary text-white shadow-sm hover:bg-primary-d"}`,children:[e.jsx(J,{className:"w-4 h-4"}),m?"Taken Today":"Mark as Taken"]})]},`${o.id}-${w}`)})}):e.jsx("p",{className:"text-sm text-muted py-4",children:"No active medicine instructions recorded."}),e.jsxs("p",{className:"text-xs font-medium text-muted mt-4",children:[x.length," appointment(s) recorded for this patient."]})]})]})}export{Ue as default};
