const CROCHET_API='https://ghsdmgffrcbrrxkylpuq.supabase.co/functions/v1/crochet-api';
const signInBtn=document.getElementById('signInBtn'),signUpBtn=document.getElementById('signUpBtn'),signOutBtn=document.getElementById('signOutBtn'),userBadge=document.getElementById('userBadge'),reportIssueBtn=document.getElementById('reportIssueBtn');
const authModal=document.getElementById('authModal'),authTitle=document.getElementById('authTitle'),authForm=document.getElementById('authForm'),authEmail=document.getElementById('authEmail'),authPassword=document.getElementById('authPassword'),authSubmitBtn=document.getElementById('authSubmitBtn'),authMessage=document.getElementById('authMessage');
const reportModal=document.getElementById('reportModal'),reportForm=document.getElementById('reportForm'),reportDescription=document.getElementById('reportDescription'),reportSubmitBtn=document.getElementById('reportSubmitBtn'),reportMessage=document.getElementById('reportMessage');
let authMode='signin';
let authState=loadAuth();

function loadAuth(){try{return JSON.parse(localStorage.getItem('crochet_auth')||'null')}catch{return null}}
function saveAuth(state){authState=state||null;if(state)localStorage.setItem('crochet_auth',JSON.stringify(state));else localStorage.removeItem('crochet_auth');updateAuthUI()}
function openModal(el){el.hidden=false;document.body.style.overflow='hidden'}
function closeModal(el){el.hidden=true;document.body.style.overflow=''}
function setMessage(el,text,type=''){el.textContent=text;el.className='form-message'+(type?' '+type:'')}
function updateAuthUI(){const user=authState?.user||null,logged=!!user;signInBtn.hidden=logged;signUpBtn.hidden=logged;signOutBtn.hidden=!logged;userBadge.hidden=!logged;userBadge.textContent=logged?(user.email||'Signed in'):''}
function openAuth(mode){authMode=mode;authTitle.textContent=mode==='signup'?'Create Account':'Sign In';authSubmitBtn.textContent=mode==='signup'?'Sign Up':'Sign In';authPassword.autocomplete=mode==='signup'?'new-password':'current-password';setMessage(authMessage,'');authForm.reset();openModal(authModal)}
async function api(body){const res=await fetch(CROCHET_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await res.json().catch(()=>({}));if(!res.ok||data.error)throw new Error(data.error||'Request failed');return data}
async function refreshIfNeeded(){if(!authState?.session?.refresh_token)return;const expires=(authState.session.expires_at||0)*1000;if(expires-Date.now()>60000)return;try{const data=await api({action:'refresh',refresh_token:authState.session.refresh_token});if(data.user&&data.session)saveAuth(data)}catch{saveAuth(null)}}

signInBtn.addEventListener('click',()=>openAuth('signin'));
signUpBtn.addEventListener('click',()=>openAuth('signup'));
signOutBtn.addEventListener('click',()=>saveAuth(null));
reportIssueBtn.addEventListener('click',()=>{setMessage(reportMessage,'');reportForm.reset();openModal(reportModal)});
document.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',()=>closeModal(document.getElementById(btn.dataset.close))));
[authModal,reportModal].forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m)}));

authForm.addEventListener('submit',async e=>{e.preventDefault();authSubmitBtn.disabled=true;setMessage(authMessage,'Working...');try{const data=await api({action:authMode,email:authEmail.value.trim(),password:authPassword.value});if(authMode==='signup'&&!data.session){saveAuth(null);setMessage(authMessage,'Account created. Check your email to confirm it, then sign in.','success')}else{saveAuth(data);setMessage(authMessage,authMode==='signup'?'Account created and signed in.':'Signed in successfully.','success');setTimeout(()=>closeModal(authModal),500)}}catch(err){setMessage(authMessage,err.message||'Could not complete authentication.','error')}finally{authSubmitBtn.disabled=false}});

reportForm.addEventListener('submit',async e=>{e.preventDefault();const description=reportDescription.value.trim();if(description.length<3)return setMessage(reportMessage,'Please describe the issue.','error');reportSubmitBtn.disabled=true;setMessage(reportMessage,'Sending report...');try{await refreshIfNeeded();const context={app:'crochet-pattern-designer',url:location.href,user_agent:navigator.userAgent,stitch:stitchSelect.value,flow:directionSelect.value,zoom_percent:Math.round(zoom*100),row:currentRow+1,column:currentCol,rotation:placementRotation,items_count:items.length,viewport:{width:innerWidth,height:innerHeight}};await api({action:'report',access_token:authState?.session?.access_token||null,description,context,pattern_record:{pattern_items:items.slice(-120)}});setMessage(reportMessage,'Report sent successfully. Thank you.','success');setTimeout(()=>closeModal(reportModal),700)}catch(err){setMessage(reportMessage,err.message||'Could not send report.','error')}finally{reportSubmitBtn.disabled=false}});

updateAuthUI();refreshIfNeeded();
