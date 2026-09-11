import{x as y,_ as b,C as T,y as S,E as K,z as be,F as W,A as Y,B as J,D as X,G as Q,H as D,I as Te,J as Ae,L as ve,K as L}from"./firebase-B9jEz2ys.js";const Z="@firebase/installations",F="0.6.24";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ee=1e4,te=`w:${F}`,ne="FIS_v2",Se="https://firebaseinstallations.googleapis.com/v1",ke=3600*1e3,Ee="installations",Ce="Installations";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Re={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"not-registered":"Firebase Installation is not registered.","installation-not-found":"Firebase Installation not found.","request-failed":'{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',"app-offline":"Could not process request. Application offline.","delete-pending-registration":"Can't delete installation while there is a pending registration request."},m=new K(Ee,Ce,Re);function ae(e){return e instanceof W&&e.code.includes("request-failed")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ie({projectId:e}){return`${Se}/projects/${e}/installations`}function re(e){return{token:e.token,requestStatus:2,expiresIn:_e(e.expiresIn),creationTime:Date.now()}}async function se(e,t){const a=(await t.json()).error;return m.create("request-failed",{requestName:e,serverCode:a.code,serverMessage:a.message,serverStatus:a.status})}function oe({apiKey:e}){return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":e})}function Pe(e,{refreshToken:t}){const n=oe(e);return n.append("Authorization",De(t)),n}async function ce(e){const t=await e();return t.status>=500&&t.status<600?e():t}function _e(e){return Number(e.replace("s","000"))}function De(e){return`${ne} ${e}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Fe({appConfig:e,heartbeatServiceProvider:t},{fid:n}){const a=ie(e),i=oe(e),r=t.getImmediate({optional:!0});if(r){const l=await r.getHeartbeatsHeader();l&&i.append("x-firebase-client",l)}const s={fid:n,authVersion:ne,appId:e.appId,sdkVersion:te},o={method:"POST",headers:i,body:JSON.stringify(s)},c=await ce(()=>fetch(a,o));if(c.ok){const l=await c.json();return{fid:l.fid||n,registrationStatus:2,refreshToken:l.refreshToken,authToken:re(l.authToken)}}else throw await se("Create Installation",c)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function le(e){return new Promise(t=>{setTimeout(t,e)})}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Oe(e){return btoa(String.fromCharCode(...e)).replace(/\+/g,"-").replace(/\//g,"_")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Me=/^[cdef][\w-]{21}$/,_="";function $e(){try{const e=new Uint8Array(17);(self.crypto||self.msCrypto).getRandomValues(e),e[0]=112+e[0]%16;const n=Ne(e);return Me.test(n)?n:_}catch{return _}}function Ne(e){return Oe(e).substr(0,22)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function k(e){return`${e.appName}!${e.appId}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ue=new Map;function de(e,t){const n=k(e);fe(n,t),xe(n,t)}function fe(e,t){const n=ue.get(e);if(n)for(const a of n)a(t)}function xe(e,t){const n=Le();n&&n.postMessage({key:e,fid:t}),qe()}let h=null;function Le(){return!h&&"BroadcastChannel"in self&&(h=new BroadcastChannel("[Firebase] FID Change"),h.onmessage=e=>{fe(e.data.key,e.data.fid)}),h}function qe(){ue.size===0&&h&&(h.close(),h=null)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const je="firebase-installations-database",Be=1,w="firebase-installations-store";let C=null;function O(){return C||(C=be(je,Be,{upgrade:(e,t)=>{switch(t){case 0:e.createObjectStore(w)}}})),C}async function A(e,t){const n=k(e),i=(await O()).transaction(w,"readwrite"),r=i.objectStore(w),s=await r.get(n);return await r.put(t,n),await i.done,(!s||s.fid!==t.fid)&&de(e,t.fid),t}async function pe(e){const t=k(e),a=(await O()).transaction(w,"readwrite");await a.objectStore(w).delete(t),await a.done}async function E(e,t){const n=k(e),i=(await O()).transaction(w,"readwrite"),r=i.objectStore(w),s=await r.get(n),o=t(s);return o===void 0?await r.delete(n):await r.put(o,n),await i.done,o&&(!s||s.fid!==o.fid)&&de(e,o.fid),o}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function M(e){let t;const n=await E(e.appConfig,a=>{const i=Ue(a),r=Ve(e,i);return t=r.registrationPromise,r.installationEntry});return n.fid===_?{installationEntry:await t}:{installationEntry:n,registrationPromise:t}}function Ue(e){const t=e||{fid:$e(),registrationStatus:0};return ge(t)}function Ve(e,t){if(t.registrationStatus===0){if(!navigator.onLine){const i=Promise.reject(m.create("app-offline"));return{installationEntry:t,registrationPromise:i}}const n={fid:t.fid,registrationStatus:1,registrationTime:Date.now()},a=ze(e,n);return{installationEntry:n,registrationPromise:a}}else return t.registrationStatus===1?{installationEntry:t,registrationPromise:Ge(e)}:{installationEntry:t}}async function ze(e,t){try{const n=await Fe(e,t);return A(e.appConfig,n)}catch(n){throw ae(n)&&n.customData.serverCode===409?await pe(e.appConfig):await A(e.appConfig,{fid:t.fid,registrationStatus:0}),n}}async function Ge(e){let t=await q(e.appConfig);for(;t.registrationStatus===1;)await le(100),t=await q(e.appConfig);if(t.registrationStatus===0){const{installationEntry:n,registrationPromise:a}=await M(e);return a||n}return t}function q(e){return E(e,t=>{if(!t)throw m.create("installation-not-found");return ge(t)})}function ge(e){return He(e)?{fid:e.fid,registrationStatus:0}:e}function He(e){return e.registrationStatus===1&&e.registrationTime+ee<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Ke({appConfig:e,heartbeatServiceProvider:t},n){const a=We(e,n),i=Pe(e,n),r=t.getImmediate({optional:!0});if(r){const l=await r.getHeartbeatsHeader();l&&i.append("x-firebase-client",l)}const s={installation:{sdkVersion:te,appId:e.appId}},o={method:"POST",headers:i,body:JSON.stringify(s)},c=await ce(()=>fetch(a,o));if(c.ok){const l=await c.json();return re(l)}else throw await se("Generate Auth Token",c)}function We(e,{fid:t}){return`${ie(e)}/${t}/authTokens:generate`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function $(e,t=!1){let n;const a=await E(e.appConfig,r=>{if(!he(r))throw m.create("not-registered");const s=r.authToken;if(!t&&Xe(s))return r;if(s.requestStatus===1)return n=Ye(e,t),r;{if(!navigator.onLine)throw m.create("app-offline");const o=Ze(r);return n=Je(e,o),o}});return n?await n:a.authToken}async function Ye(e,t){let n=await j(e.appConfig);for(;n.authToken.requestStatus===1;)await le(100),n=await j(e.appConfig);const a=n.authToken;return a.requestStatus===0?$(e,t):a}function j(e){return E(e,t=>{if(!he(t))throw m.create("not-registered");const n=t.authToken;return et(n)?{...t,authToken:{requestStatus:0}}:t})}async function Je(e,t){try{const n=await Ke(e,t),a={...t,authToken:n};return await A(e.appConfig,a),n}catch(n){if(ae(n)&&(n.customData.serverCode===401||n.customData.serverCode===404))await pe(e.appConfig);else{const a={...t,authToken:{requestStatus:0}};await A(e.appConfig,a)}throw n}}function he(e){return e!==void 0&&e.registrationStatus===2}function Xe(e){return e.requestStatus===2&&!Qe(e)}function Qe(e){const t=Date.now();return t<e.creationTime||e.creationTime+e.expiresIn<t+ke}function Ze(e){const t={requestStatus:1,requestTime:Date.now()};return{...e,authToken:t}}function et(e){return e.requestStatus===1&&e.requestTime+ee<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function tt(e){const t=e,{installationEntry:n,registrationPromise:a}=await M(t);return a?a.catch(console.error):$(t).catch(console.error),n.fid}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function nt(e,t=!1){const n=e;return await at(n),(await $(n,t)).token}async function at(e){const{registrationPromise:t}=await M(e);t&&await t}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function it(e){if(!e||!e.options)throw R("App Configuration");if(!e.name)throw R("App Name");const t=["projectId","apiKey","appId"];for(const n of t)if(!e.options[n])throw R(n);return{appName:e.name,projectId:e.options.projectId,apiKey:e.options.apiKey,appId:e.options.appId}}function R(e){return m.create("missing-app-config-values",{valueName:e})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const me="installations",rt="installations-internal",st=e=>{const t=e.getProvider("app").getImmediate(),n=it(t),a=S(t,"heartbeat");return{app:t,appConfig:n,heartbeatServiceProvider:a,_delete:()=>Promise.resolve()}},ot=e=>{const t=e.getProvider("app").getImmediate(),n=S(t,me).getImmediate();return{getId:()=>tt(n),getToken:i=>nt(n,i)}};function ct(){b(new T(me,st,"PUBLIC")),b(new T(rt,ot,"PRIVATE"))}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */ct();y(Z,F);y(Z,F,"esm2020");/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const v="analytics",lt="firebase_id",ut="origin",dt=60*1e3,ft="https://firebase.googleapis.com/v1alpha/projects/-/apps/{app-id}/webConfig",N="https://www.googletagmanager.com/gtag/js";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const u=new ve("@firebase/analytics");/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const pt={"already-exists":"A Firebase Analytics instance with the appId {$id}  already exists. Only one Firebase Analytics instance can be created for each appId.","already-initialized":"initializeAnalytics() cannot be called again with different options than those it was initially called with. It can be called again with the same options to return the existing instance, or getAnalytics() can be used to get a reference to the already-initialized instance.","already-initialized-settings":"Firebase Analytics has already been initialized.settings() must be called before initializing any Analytics instanceor it will have no effect.","interop-component-reg-failed":"Firebase Analytics Interop Component failed to instantiate: {$reason}","invalid-analytics-context":"Firebase Analytics is not supported in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","indexeddb-unavailable":"IndexedDB unavailable or restricted in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","fetch-throttle":"The config fetch request timed out while in an exponential backoff state. Unix timestamp in milliseconds when fetch request throttling ends: {$throttleEndTimeMillis}.","config-fetch-failed":"Dynamic config fetch failed: [{$httpStatus}] {$responseMessage}","no-api-key":'The "apiKey" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid API key.',"no-app-id":'The "appId" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid app ID.',"no-client-id":'The "client_id" field is empty.',"invalid-gtag-resource":"Trusted Types detected an invalid gtag resource: {$gtagURL}."},d=new K("analytics","Analytics",pt);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function gt(e){if(!e.startsWith(N)){const t=d.create("invalid-gtag-resource",{gtagURL:e});return u.warn(t.message),""}return e}function we(e){return Promise.all(e.map(t=>t.catch(n=>n)))}function ht(e,t){let n;return window.trustedTypes&&(n=window.trustedTypes.createPolicy(e,t)),n}function mt(e,t){const n=ht("firebase-js-sdk-policy",{createScriptURL:gt}),a=document.createElement("script"),i=`${N}?l=${e}&id=${t}`;a.src=n?n==null?void 0:n.createScriptURL(i):i,a.async=!0,document.head.appendChild(a)}function wt(e){let t=[];return Array.isArray(window[e])?t=window[e]:window[e]=t,t}async function It(e,t,n,a,i,r){const s=a[i];try{if(s)await t[s];else{const c=(await we(n)).find(l=>l.measurementId===i);c&&await t[c.appId]}}catch(o){u.error(o)}e("config",i,r)}async function yt(e,t,n,a,i){try{let r=[];if(i&&i.send_to){let s=i.send_to;Array.isArray(s)||(s=[s]);const o=await we(n);for(const c of s){const l=o.find(p=>p.measurementId===c),f=l&&t[l.appId];if(f)r.push(f);else{r=[];break}}}r.length===0&&(r=Object.values(t)),await Promise.all(r),e("event",a,i||{})}catch(r){u.error(r)}}function bt(e,t,n,a){async function i(r,...s){try{if(r==="event"){const[o,c]=s;await yt(e,t,n,o,c)}else if(r==="config"){const[o,c]=s;await It(e,t,n,a,o,c)}else if(r==="consent"){const[o,c]=s;e("consent",o,c)}else if(r==="get"){const[o,c,l]=s;e("get",o,c,l)}else if(r==="set"){const[o]=s;e("set",o)}else e(r,...s)}catch(o){u.error(o)}}return i}function Tt(e,t,n,a,i){let r=function(...s){window[a].push(arguments)};return window[i]&&typeof window[i]=="function"&&(r=window[i]),window[i]=bt(r,e,t,n),{gtagCore:r,wrappedGtag:window[i]}}function At(e){const t=window.document.getElementsByTagName("script");for(const n of Object.values(t))if(n.src&&n.src.includes(N)&&n.src.includes(e))return n;return null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const vt=30,St=1e3;class kt{constructor(t={},n=St){this.throttleMetadata=t,this.intervalMillis=n}getThrottleMetadata(t){return this.throttleMetadata[t]}setThrottleMetadata(t,n){this.throttleMetadata[t]=n}deleteThrottleMetadata(t){delete this.throttleMetadata[t]}}const Ie=new kt;function Et(e){return new Headers({Accept:"application/json","x-goog-api-key":e})}async function Ct(e){var s;const{appId:t,apiKey:n}=e,a={method:"GET",headers:Et(n)},i=ft.replace("{app-id}",t),r=await fetch(i,a);if(r.status!==200&&r.status!==304){let o="";try{const c=await r.json();(s=c.error)!=null&&s.message&&(o=c.error.message)}catch{}throw d.create("config-fetch-failed",{httpStatus:r.status,responseMessage:o})}return r.json()}async function Rt(e,t=Ie,n){const{appId:a,apiKey:i,measurementId:r}=e.options;if(!a)throw d.create("no-app-id");if(!i){if(r)return{measurementId:r,appId:a};throw d.create("no-api-key")}const s=t.getThrottleMetadata(a)||{backoffCount:0,throttleEndTimeMillis:Date.now()},o=new Dt;return setTimeout(async()=>{o.abort()},dt),ye({appId:a,apiKey:i,measurementId:r},s,o,t)}async function ye(e,{throttleEndTimeMillis:t,backoffCount:n},a,i=Ie){var o;const{appId:r,measurementId:s}=e;try{await Pt(a,t)}catch(c){if(s)return u.warn(`Timed out fetching this Firebase app's measurement ID from the server. Falling back to the measurement ID ${s} provided in the "measurementId" field in the local Firebase config. [${c==null?void 0:c.message}]`),{appId:r,measurementId:s};throw c}try{const c=await Ct(e);return i.deleteThrottleMetadata(r),c}catch(c){const l=c;if(!_t(l)){if(i.deleteThrottleMetadata(r),s)return u.warn(`Failed to fetch this Firebase app's measurement ID from the server. Falling back to the measurement ID ${s} provided in the "measurementId" field in the local Firebase config. [${l==null?void 0:l.message}]`),{appId:r,measurementId:s};throw c}const f=Number((o=l==null?void 0:l.customData)==null?void 0:o.httpStatus)===503?L(n,i.intervalMillis,vt):L(n,i.intervalMillis),p={throttleEndTimeMillis:Date.now()+f,backoffCount:n+1};return i.setThrottleMetadata(r,p),u.debug(`Calling attemptFetch again in ${f} millis`),ye(e,p,a,i)}}function Pt(e,t){return new Promise((n,a)=>{const i=Math.max(t-Date.now(),0),r=setTimeout(n,i);e.addEventListener(()=>{clearTimeout(r),a(d.create("fetch-throttle",{throttleEndTimeMillis:t}))})})}function _t(e){if(!(e instanceof W)||!e.customData)return!1;const t=Number(e.customData.httpStatus);return t===429||t===500||t===503||t===504}class Dt{constructor(){this.listeners=[]}addEventListener(t){this.listeners.push(t)}abort(){this.listeners.forEach(t=>t())}}async function Ft(e,t,n,a,i){if(i&&i.global){e("event",n,a);return}else{const r=await t,s={...a,send_to:r};e("event",n,s)}}async function Ot(e,t,n,a){if(a&&a.global){const i={};for(const r of Object.keys(n))i[`user_properties.${r}`]=n[r];return e("set",i),Promise.resolve()}else{const i=await t;e("config",i,{update:!0,user_properties:n})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Mt(){if(X())try{await Q()}catch(e){return u.warn(d.create("indexeddb-unavailable",{errorInfo:e==null?void 0:e.toString()}).message),!1}else return u.warn(d.create("indexeddb-unavailable",{errorInfo:"IndexedDB is not available in this environment."}).message),!1;return!0}async function $t(e,t,n,a,i,r,s){const o=Rt(e);o.then(g=>{n[g.measurementId]=g.appId,e.options.measurementId&&g.measurementId!==e.options.measurementId&&u.warn(`The measurement ID in the local Firebase config (${e.options.measurementId}) does not match the measurement ID fetched from the server (${g.measurementId}). To ensure analytics events are always sent to the correct Analytics property, update the measurement ID field in the local config or remove it from the local config.`)}).catch(g=>u.error(g)),t.push(o);const c=Mt().then(g=>{if(g)return a.getId()}),[l,f]=await Promise.all([o,c]);At(r)||mt(r,l.measurementId),i("js",new Date);const p=(s==null?void 0:s.config)??{};return p[ut]="firebase",p.update=!0,f!=null&&(p[lt]=f),i("config",l.measurementId,p),l.measurementId}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Nt{constructor(t){this.app=t}_delete(){return delete I[this.app.options.appId],Promise.resolve()}}let I={},B=[];const U={};let P="dataLayer",xt="gtag",V,x,z=!1;function Lt(){const e=[];if(Y()&&e.push("This is a browser extension environment."),J()||e.push("Cookies are not available."),e.length>0){const t=e.map((a,i)=>`(${i+1}) ${a}`).join(" "),n=d.create("invalid-analytics-context",{errorInfo:t});u.warn(n.message)}}function qt(e,t,n){Lt();const a=e.options.appId;if(!a)throw d.create("no-app-id");if(!e.options.apiKey)if(e.options.measurementId)u.warn(`The "apiKey" field is empty in the local Firebase config. This is needed to fetch the latest measurement ID for this Firebase app. Falling back to the measurement ID ${e.options.measurementId} provided in the "measurementId" field in the local Firebase config.`);else throw d.create("no-api-key");if(I[a]!=null)throw d.create("already-exists",{id:a});if(!z){wt(P);const{wrappedGtag:r,gtagCore:s}=Tt(I,B,U,P,xt);x=r,V=s,z=!0}return I[a]=$t(e,B,U,t,V,P,n),new Nt(e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Gt(e=Te()){e=D(e);const t=S(e,v);return t.isInitialized()?t.getImmediate():jt(e)}function jt(e,t={}){const n=S(e,v);if(n.isInitialized()){const i=n.getImmediate();if(Ae(t,n.getOptions()))return i;throw d.create("already-initialized")}return n.initialize({options:t})}async function Ht(){if(Y()||!J()||!X())return!1;try{return await Q()}catch{return!1}}function Bt(e,t,n){e=D(e),Ot(x,I[e.app.options.appId],t,n).catch(a=>u.error(a))}function Ut(e,t,n,a){e=D(e),Ft(x,I[e.app.options.appId],t,n,a).catch(i=>u.error(i))}const G="@firebase/analytics",H="0.10.25";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Vt(){b(new T(v,(t,{options:n})=>{const a=t.getProvider("app").getImmediate(),i=t.getProvider("installations-internal").getImmediate();return qt(a,i,n)},"PUBLIC")),b(new T("analytics-internal",e,"PRIVATE")),y(G,H),y(G,H,"esm2020");function e(t){try{const n=t.getProvider(v).getImmediate();return{logEvent:(a,i,r)=>Ut(n,a,i,r),setUserProperties:(a,i)=>Bt(n,a,i)}}catch(n){throw d.create("interop-component-reg-failed",{reason:n})}}}Vt();export{Gt as getAnalytics,jt as initializeAnalytics,Ht as isSupported,Ut as logEvent,Bt as setUserProperties};
