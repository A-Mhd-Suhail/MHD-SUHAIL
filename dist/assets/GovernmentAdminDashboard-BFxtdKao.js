import{r as l,a as b,j as e,L as Z,T as _,H as ee,A as se,B as T,S as L,U as P,d as S,v as te,X as ae,b as le}from"./index-TkiD7Xtl.js";import{x as $,k as re,A as I,v as oe}from"./firebase-Dy0s63gn.js";import ie from"./NotificationsTab-B5OROQk2.js";import{S as de}from"./SettingsTab-B8kSR7Uf.js";import{M as ne,C as he,R as ce,A as me,m as z,B as be,a as xe,L as pe}from"./fs-lFpXGxuF.js";import{S as fe}from"./search-Bv4cZmHZ.js";import{C as O}from"./calendar-days-C3NKenM1.js";import"./react-DfSJUp79.js";import"./history-CKDE3k88.js";import"./credit-card-PxmBuGLk.js";function Ae({onLogout:c}){const[m,o]=l.useState(null),[a,d]=l.useState([]),[x,N]=l.useState([]),[r,n]=l.useState("overview"),[A,F]=l.useState(""),[h,G]=l.useState("All states"),[v,C]=l.useState("All districts"),[w,V]=l.useState("All hospitals"),[K,p]=l.useState(!1);l.useEffect(()=>{const s=b.currentUser?.uid;if(s)return $(re(S,"users",s),t=>t.exists()&&o({id:t.id,...t.data()}))},[]),l.useEffect(()=>{const s=[$(I(S,"users"),t=>d(t.docs.map(i=>({id:i.id,...i.data()})))),$(I(S,"appointments"),t=>N(t.docs.map(i=>({id:i.id,...i.data()}))))];return()=>s.forEach(t=>t())},[]);const f=a.filter(s=>s.role==="hospital"),D=a.filter(s=>s.role==="doctor"),H=a.filter(s=>s.role==="patient"),X=l.useMemo(()=>["All states",...Array.from(new Set(a.map(s=>s.state).filter(Boolean)))],[a]),Y=l.useMemo(()=>["All districts",...Array.from(new Set(a.filter(s=>h==="All states"||s.state===h).map(s=>s.district).filter(Boolean)))],[a,h]),Q=l.useMemo(()=>["All hospitals",...Array.from(new Set(f.map(s=>s.name).filter(Boolean)))],[f]),g=s=>String(s||"").toLowerCase().includes(A.toLowerCase()),y=s=>(h==="All states"||s.state===h)&&(v==="All districts"||s.district===v),B=D.filter(s=>y(s)&&(w==="All hospitals"||s.hospital===w)&&g(`${s.name} ${s.email} ${s.regNo} ${s.hospital}`)),E=H.filter(s=>y(s)&&g(`${s.name} ${s.email} ${s.healthId} ${s.phone}`)),R=f.filter(s=>y(s)&&g(`${s.name} ${s.email} ${s.licenseNo}`)),M=x.filter(s=>g(`${s.patientName} ${s.doctorName} ${s.hospital} ${s.status}`)),W=async()=>{await oe(b).catch(()=>{}),c()},q=[["overview","Overview",le],["hospitals","Hospitals",T],["doctors","Doctors",L],["patients","Patients",P],["appointments","Appointments",O],["notifications","Notifications",be],["myinfo","My Info",xe]],U=()=>e.jsxs("aside",{className:"portal-dark-sidebar w-[270px] bg-white text-[#1e3a8a] p-5 flex flex-col shrink-0 border-r border-slate-200 h-full",children:[e.jsxs("div",{className:"flex items-center justify-between mb-8",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"p-2 rounded-xl bg-primary/10 border border-primary/20 text-[#2a8eff]",children:e.jsx(te,{className:"w-6 h-6"})}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-[15px] font-bold tracking-tight text-[#1e3a8a] leading-none",children:"UNITED MEDICATION"}),e.jsx("p",{className:"text-[10px] text-[#2a8eff] uppercase tracking-wider font-semibold mt-1",children:"Govt Admin Portal"})]})]}),e.jsx("button",{onClick:()=>p(!1),className:"lg:hidden p-1 text-slate-500 hover:text-[#1e3a8a]",children:e.jsx(ae,{className:"w-5 h-5"})})]}),e.jsx("nav",{className:"space-y-1 flex-1 overflow-y-auto custom-scrollbar",children:q.map(([s,t,i],J)=>{const k=r===s;return e.jsxs("button",{onClick:()=>{n(s),p(!1)},className:`relative w-full text-left p-3 rounded-xl flex gap-3 items-center text-sm font-medium transition-all ${k?"bg-[#2a8eff] text-white font-semibold shadow-md shadow-[#2a8eff]/30":"text-[#2a8eff] hover:bg-slate-100 bg-white"}`,children:[e.jsx(i,{className:`w-4 h-4 shrink-0 relative z-10 ${k?"text-white":"text-[#2a8eff]"}`}),e.jsx("span",{className:`relative z-10 ${k?"text-white":"text-[#2a8eff]"}`,children:t})]},`${s}-${J}`)})}),e.jsx("div",{className:"pt-4 border-t border-slate-200 shrink-0",children:e.jsxs("button",{onClick:W,className:"w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors border border-red-500 shadow-sm",children:[e.jsx(pe,{className:"w-4 h-4 text-white",style:{color:"#ffffff"}}),e.jsx("span",{className:"text-white font-bold",style:{color:"#ffffff"},children:"Logout"})]})})]});return e.jsxs("div",{className:"dashboard-shell min-h-screen bg-white text-[#1e3a8a] flex overflow-hidden",children:[e.jsx("style",{children:`
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
      `}),e.jsx("div",{className:"hidden lg:block h-screen",children:U()}),K&&e.jsxs("div",{className:"fixed inset-0 z-[80] flex lg:hidden bg-slate-950/50 backdrop-blur-sm animate-in fade-in",children:[U(),e.jsx("div",{className:"flex-1",onClick:()=>p(!1)})]}),e.jsxs("main",{className:"flex-1 flex flex-col h-screen overflow-hidden min-w-0",children:[e.jsxs("div",{className:"h-[64px] bg-white border-b border-line px-4 sm:px-6 flex items-center justify-between shrink-0",children:[e.jsxs("div",{className:"flex items-center gap-3 min-w-0",children:[e.jsx("button",{onClick:()=>p(!0),className:"lg:hidden p-2 rounded-lg text-muted hover:bg-app",children:e.jsx(ne,{className:"w-5 h-5"})}),e.jsxs("div",{className:"hidden sm:flex items-center gap-2 text-xs text-muted font-medium truncate",children:[e.jsx("span",{children:"National Health Authority"}),e.jsx(he,{className:"w-3.5 h-3.5 text-muted/60"}),e.jsx("span",{className:"text-ink font-semibold capitalize",children:r})]})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(Z,{}),e.jsx(_,{insidePortal:!0}),e.jsx("button",{onClick:()=>n("overview"),title:"Home",className:"p-2 rounded-lg bg-white border border-line text-[#1e3a8a] hover:bg-slate-100",children:e.jsx(ee,{className:"w-4 h-4 text-[#1e3a8a]"})}),e.jsx("button",{onClick:()=>window.history.back(),title:"Back",className:"p-2 rounded-lg bg-white border border-line text-[#1e3a8a] hover:bg-slate-100",children:e.jsx(se,{className:"w-4 h-4 text-[#1e3a8a]"})}),e.jsx("button",{onClick:()=>window.location.reload(),title:"Refresh portal",className:"p-2 rounded-lg bg-white border border-line text-[#1e3a8a] hover:bg-slate-100",children:e.jsx(ce,{className:"w-4 h-4 text-[#1e3a8a]"})})]})]}),e.jsx("div",{className:"flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar relative",children:e.jsx(me,{mode:"wait",children:e.jsx(z.div,{initial:{opacity:0,y:10},animate:{opacity:1,y:0},exit:{opacity:0,y:-10},transition:{duration:.2},className:"max-w-[1400px] mx-auto",children:r==="notifications"?e.jsx(ie,{}):r==="myinfo"?e.jsxs("div",{children:[e.jsxs("div",{className:"mb-6",children:[e.jsx("h1",{className:"text-2xl font-bold text-ink",children:"My Administrator Profile"}),e.jsx("p",{className:"text-muted text-sm mt-1",children:"Manage government authority credentials and portal settings."})]}),e.jsx(de,{me:m||{id:b.currentUser?.uid||"gov-admin",name:b.currentUser?.displayName||"Government Admin",role:"admin",email:b.currentUser?.email||"admin@gov.in"},onSaved:o})]}):e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4",children:e.jsxs("div",{children:[e.jsx("h1",{className:"text-2xl font-bold text-ink tracking-tight",children:r==="overview"?"National Healthcare Dashboard":r[0].toUpperCase()+r.slice(1)}),e.jsx("p",{className:"text-muted text-sm mt-1",children:"System-wide healthcare oversight, hospital registrations, and patient metrics."})]})}),e.jsxs("div",{className:"bg-surface border border-line rounded-2xl p-4 mb-6 shadow-xs",children:[e.jsx("p",{className:"text-xs font-bold text-muted uppercase tracking-wider mb-3",children:"Geographic & Record Filters"}),e.jsxs("div",{className:"grid sm:grid-cols-2 lg:grid-cols-4 gap-3",children:[e.jsxs("label",{className:"text-xs font-medium text-muted",children:["Search Query",e.jsxs("div",{className:"relative mt-1",children:[e.jsx(fe,{className:"w-4 h-4 text-muted absolute left-3 top-3"}),e.jsx("input",{value:A,onChange:s=>F(s.target.value),placeholder:"Search records…",className:"w-full h-10 pl-9 pr-3 border border-line rounded-xl bg-app text-sm text-ink focus:outline-none focus:border-primary"})]})]}),e.jsxs("label",{className:"text-xs font-medium text-muted",children:["State",e.jsx("select",{value:h,onChange:s=>{G(s.target.value),C("All districts")},className:"mt-1 w-full h-10 px-3 border border-line rounded-xl bg-app text-sm text-ink focus:outline-none focus:border-primary",children:X.map((s,t)=>e.jsx("option",{children:s},`st-${s}-${t}`))})]}),e.jsxs("label",{className:"text-xs font-medium text-muted",children:["District",e.jsx("select",{value:v,onChange:s=>C(s.target.value),className:"mt-1 w-full h-10 px-3 border border-line rounded-xl bg-app text-sm text-ink focus:outline-none focus:border-primary",children:Y.map((s,t)=>e.jsx("option",{children:s},`dst-${s}-${t}`))})]}),e.jsxs("label",{className:"text-xs font-medium text-muted",children:["Hospital",e.jsx("select",{value:w,onChange:s=>V(s.target.value),className:"mt-1 w-full h-10 px-3 border border-line rounded-xl bg-app text-sm text-ink focus:outline-none focus:border-primary",children:Q.map((s,t)=>e.jsx("option",{children:s},`hosp-${s}-${t}`))})]})]})]}),r==="overview"&&e.jsxs("div",{className:"grid sm:grid-cols-2 lg:grid-cols-4 gap-4",children:[e.jsx(u,{n:f.length,t:"Registered Hospitals",icon:T,go:()=>n("hospitals")}),e.jsx(u,{n:D.length,t:"Verified Doctors",icon:L,go:()=>n("doctors")}),e.jsx(u,{n:H.length,t:"Enrolled Patients",icon:P,go:()=>n("patients")}),e.jsx(u,{n:x.length,t:"Total Appointments",icon:O,go:()=>n("appointments")})]}),r==="hospitals"&&e.jsx(j,{title:`Registered Hospitals (${R.length})`,headers:["Hospital Name","State","District","License No","Administrator","Email"],rows:R.map(s=>[s.name,s.state,s.district,s.licenseNo||"Pending",s.adminName,s.email])}),r==="doctors"&&e.jsx(j,{title:`Verified Doctors (${B.length})`,headers:["Doctor Name","State","District","Specialization","Hospital","Reg No"],rows:B.map(s=>[s.name&&`Dr. ${s.name}`,s.state,s.district,s.specialization,s.hospital,s.regNo])}),r==="patients"&&e.jsx(j,{title:`Enrolled Patients (${E.length})`,headers:["Patient Name","State","District","Health ID","Phone","Email"],rows:E.map(s=>[s.name,s.state,s.district,s.healthId,s.phone,s.email])}),r==="appointments"&&e.jsx(j,{title:`System Appointments (${M.length})`,headers:["Patient","Doctor","Hospital","Date & Time","Status"],rows:M.map(s=>[s.patientName,s.doctorName,s.hospital,`${s.date} ${s.time}`,s.status])})]})},r)})})]})]})}function u({n:c,t:m,icon:o,go:a}){return e.jsxs(z.button,{whileHover:{y:-3,scale:1.01},whileTap:{scale:.98},onClick:a,className:"bg-surface border border-line rounded-2xl p-5 text-left shadow-sm hover:shadow-md transition-all group",children:[e.jsxs("div",{className:"flex items-center justify-between mb-3",children:[e.jsx("span",{className:"text-3xl font-bold text-ink tracking-tight",children:c}),e.jsx("div",{className:"p-2.5 rounded-xl bg-app text-primary group-hover:bg-primary group-hover:text-white transition-colors",children:e.jsx(o,{className:"w-5 h-5"})})]}),e.jsx("div",{className:"text-sm font-semibold text-muted",children:m})]})}function j({title:c,headers:m,rows:o}){return e.jsxs("section",{className:"bg-surface border border-line rounded-2xl overflow-hidden shadow-xs",children:[e.jsx("div",{className:"p-4 sm:p-5 border-b border-line font-bold text-ink text-base bg-stripe",children:c}),o.length===0?e.jsx("p",{className:"p-8 text-center text-muted text-sm",children:"No matching records found."}):e.jsx("div",{className:"overflow-x-auto custom-scrollbar",children:e.jsxs("table",{className:"w-full text-sm",children:[e.jsx("thead",{children:e.jsx("tr",{className:"bg-app border-b border-line text-left text-muted font-semibold",children:m.map((a,d)=>e.jsx("th",{className:"px-4 py-3.5 whitespace-nowrap text-xs uppercase tracking-wider",children:a},`th-${a}-${d}`))})}),e.jsx("tbody",{className:"divide-y divide-line",children:o.map((a,d)=>e.jsx("tr",{className:"hover:bg-active/50 transition-colors",children:a.map((x,N)=>e.jsx("td",{className:"px-4 py-3.5 whitespace-nowrap text-ink",children:String(x??"—")},`cell-${d}-${N}`))},`row-${d}`))})]})})]})}export{Ae as default};
