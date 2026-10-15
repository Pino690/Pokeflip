(function(){
const here=location.pathname.split("/").pop()||"index.html";
const nav=[["index.html","🏠 Giochi",["index.html","gioco.html","carta.html"]],["conto.html","📊 Conto",["conto.html"]],["watchlist.html","👁 Watchlist",["watchlist.html"]],["community.html","💬 Community",["community.html"]]];
document.body.insertAdjacentHTML("afterbegin",`<header><h1><a href="index.html" style="color:inherit;text-decoration:none">Rivendex</a></h1><div class="muted">Cerca carte, calcola il margine, tieni il conto</div></header>
<nav class="tabs3">${nav.map(n=>`<a href="${n[0]}" class="${n[2].includes(here)?"on":""}">${n[1]}</a>`).join("")}</nav>
<div class="wrap"><details class="panel" style="margin-top:14px"><summary><strong>☁️ Account</strong> <span id="cloudStatus" class="small muted">Connessione non ancora verificata.</span></summary>
<div id="authForm"><label for="authEmail">Email</label><input id="authEmail" type="email" autocomplete="email">
<label for="authPassword">Password</label><input id="authPassword" type="password" autocomplete="current-password" placeholder="Almeno 6 caratteri">
<div class="row"><button class="primary" id="signInBtn" type="button">Accedi</button><button class="secondary" id="signUpBtn" type="button" style="margin-top:12px">Registrati</button></div></div>
<div id="authUser" hidden><p>Account: <strong id="authUserEmail"></strong></p><button class="secondary" id="signOutBtn" type="button">Esci</button></div></details></div>`);
document.body.insertAdjacentHTML("beforeend",`<footer class="wrap small muted" style="padding-bottom:30px;margin-top:20px">Rivendex è uno strumento indipendente, non affiliato a Nintendo, The Pokémon Company, Wizards of the Coast, Konami, Bandai o Cardmarket. Nomi e immagini appartengono ai rispettivi proprietari. I prezzi sono indicativi e non sono un consiglio finanziario. Dati carte da TCGdex, Scryfall e YGOPRODeck. <a class="lnk" href="privacy.html">Privacy e termini</a></footer>`);
})();
'use strict';
const KEY="pokeflip_data_v1",$=id=>document.getElementById(id);
const sb=window.supabase.createClient("https://ukjgcayqjdokagekplws.supabase.co","sb_publishable_0e08WjrKUppbHiRvHjD7pA_FaN5X7W7");
const init={capital:100,reservePct:40,cards:[],history:[]};
const norm=s=>({...init,...s,cards:Array.isArray(s?.cards)?s.cards:[],history:Array.isArray(s?.history)?s.history:[]});
const load=()=>{try{return norm(JSON.parse(localStorage.getItem(KEY)))}catch{return norm()}};
let user=null,ready=false,timer=null,results=[],state=load();
const eur=v=>new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(Number(v)||0);
const num=id=>Number($(id).value)||0;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const today=()=>new Date().toISOString().slice(0,10);
const status=m=>$("cloudStatus").textContent=m;
const sum=t=>state.history.filter(x=>t.includes(x.type)).reduce((a,x)=>a+x.amount,0);
const cash=()=>state.capital+sum(["sale","deposit"])-sum(["purchase","cost"]);
const budget=()=>Math.max(0,cash()-state.capital*state.reservePct/100);
const uid=()=>crypto.randomUUID();

async function push(){
  const{error}=await sb.from("pokeflip_state").upsert({user_id:user.id,payload:state,updated_at:new Date().toISOString()},{onConflict:"user_id"});
  if(error)throw error;
}
function save(){
  localStorage.setItem(KEY,JSON.stringify(state));if(typeof render==="function")render();
  if(!user||!ready)return;
  clearTimeout(timer);
  timer=setTimeout(async()=>{
    try{await push();status("☁️ Sincronizzato.")}
    catch(e){status("Errore di sincronizzazione: "+e.message+". Esporta un backup JSON.")}
  },700);
}
function authUI(){$("authForm").hidden=!!user;$("authUser").hidden=!user;$("authUserEmail").textContent=user?user.email:"";if(typeof onAuth==="function")onAuth()}
async function connect(u){
  user=u;ready=false;authUI();status("Caricamento dati...");
  try{
    const{data,error}=await sb.from("pokeflip_state").select("payload").eq("user_id",u.id).maybeSingle();
    if(error)throw error;
    if(data?.payload)state=norm(data.payload);
    else{
      if(localStorage.getItem(KEY)&&!confirm("Nessun salvataggio cloud per questo account. Trasferire i dati di questo browser nel cloud? Annulla = dati vuoti."))state=norm();
      await push();
    }
    localStorage.setItem(KEY,JSON.stringify(state));if(typeof render==="function")render();ready=true;status("☁️ Account collegato.");
  }catch(e){status("Impossibile caricare i dati: "+e.message)}
}
const cred=()=>{const email=$("authEmail").value.trim(),password=$("authPassword").value;if(!email||!password){alert("Inserisci email e password.");return null}return{email,password}};
$("signInBtn").onclick=async()=>{
  const c=cred();if(!c)return;status("Accesso...");
  const{data,error}=await sb.auth.signInWithPassword(c);
  if(error)return status("Errore accesso: "+error.message);
  connect(data.user);
};
$("signUpBtn").onclick=async()=>{
  const c=cred();if(!c)return;status("Registrazione...");
  const{data,error}=await sb.auth.signUp({...c,options:{emailRedirectTo:"https://pino690.github.io/Pokeflip/"}});
  if(error)return status("Errore registrazione: "+error.message);
  data.session?connect(data.user):status("Controlla l'email, conferma l'account e poi accedi.");
};
$("signOutBtn").onclick=async()=>{clearTimeout(timer);await sb.auth.signOut();user=null;ready=false;authUI();status("Disconnesso.")};


window.addEventListener("load",()=>{
  authUI();
  if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js");
  sb.auth.getSession().then(({data})=>data.session?connect(data.session.user):status("Accedi o registrati per sincronizzare."));
});
