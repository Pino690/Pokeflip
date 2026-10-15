let profile=null,ideas=[];
const noContact=t=>/(https?:|www\.|@)/i.test(t);
async function loadCom(){
  const gate=$("comGate");
  if(!user){gate.innerHTML='<p class="muted">Accedi per leggere e partecipare.</p>';$("ideaForm").hidden=true;$("feed").innerHTML="";return}
  const{data}=await sb.from("profiles").select("nickname").eq("user_id",user.id).maybeSingle();
  profile=data||null;
  if(!profile){
    gate.innerHTML='<label for="nick">Scegli un nickname pubblico (3-20 caratteri, mai la tua email)</label><input id="nick" maxlength="20"><button class="primary" id="nickBtn" type="button">Salva nickname</button>';
    $("ideaForm").hidden=true;$("nickBtn").onclick=saveNick;
  }else{gate.innerHTML="";$("ideaForm").hidden=false}
  loadFeed();
}
async function saveNick(){
  const n=$("nick").value.trim();
  if(!/^[\p{L}\p{N}_-]{3,20}$/u.test(n))return alert("Usa 3-20 caratteri: lettere, numeri, _ o -.");
  const{error}=await sb.from("profiles").insert({user_id:user.id,nickname:n});
  if(error)return alert(error.code==="23505"?"Nickname già preso.":"Errore: "+error.message);
  loadCom();
}
async function loadFeed(){
  $("feed").innerHTML='<p class="muted">Caricamento...</p>';
  const{data,error}=await (()=>{const q=sb.from("ideas").select("*,profiles(nickname),comments(count)").order("created_at",{ascending:false}).limit(30);const g=$("gameFilter").value;return g?q.eq("game",g):q})();
  if(error){$("feed").innerHTML='<p class="red">Errore: '+esc(error.message)+'</p>';return}
  ideas=data||[];
  let rx=[];
  if(ideas.length){const r=await sb.from("reactions").select("idea_id,kind,user_id").in("idea_id",ideas.map(i=>i.id));rx=r.data||[]}
  $("feed").innerHTML=ideas.length?ideas.map(i=>{
    const p=i.sell*(1-i.fee/100)-i.costs-i.buy,pct=i.buy>0?p/i.buy*100:0;
    const n=k=>rx.filter(x=>x.idea_id===i.id&&x.kind===k).length;
    const mine=rx.find(x=>x.idea_id===i.id&&x.user_id===user.id)?.kind;
    return `<article class="item" data-id="${esc(i.id)}"><h3>${esc(i.card_name)} <span class="small muted">${esc(i.game||"pokemon")}</span></h3>
    <p>di <strong>${esc(i.profiles?.nickname||"?")}</strong> · ${esc(i.created_at.slice(0,10))}${i.owns?' · <span class="red">possiede la carta</span>':""}</p>
    <p>Acquisto ${eur(i.buy)} → rivendita ${eur(i.sell)} · costi ${eur(i.costs)} · commissioni ${esc(i.fee)}%</p>
    <p>Profitto stimato: <strong class="${p>=0?"green":"red"}">${eur(p)} (${pct.toFixed(0)}%)</strong></p>
    ${i.note?`<p>${esc(i.note)}</p>`:""}
    <div class="acts"><button class="secondary" data-rx="good">👍 Buona idea (${n("good")})${mine==="good"?" ✓":""}</button><button class="secondary" data-rx="risky">⚠️ Rischioso (${n("risky")})${mine==="risky"?" ✓":""}</button></div>
    <div class="acts"><button class="secondary" data-cm>💬 Commenti (${i.comments?.[0]?.count||0})</button><button class="secondary" data-rep>🚩 Segnala</button>${i.user_id===user.id?'<button class="danger" data-delidea style="grid-column:1/-1">Elimina la mia idea</button>':""}</div>
    <div class="cmbox" hidden></div></article>`;
  }).join(""):'<p class="muted">Nessuna idea ancora. Pubblica la prima!</p>';
}
async function loadComments(id,box){
  box.innerHTML='<p class="muted small">Caricamento...</p>';
  const{data,error}=await sb.from("comments").select("id,user_id,body,profiles(nickname)").eq("idea_id",id).order("created_at");
  if(error){box.innerHTML='<p class="red small">'+esc(error.message)+'</p>';return}
  box.innerHTML=(data||[]).map(c=>`<p class="small"><strong>${esc(c.profiles?.nickname||"?")}</strong>: ${esc(c.body)} ${c.user_id===user.id?`<a class="lnk" href="#" data-delc="${esc(c.id)}">elimina</a>`:""} <a class="lnk" href="#" data-repc="${esc(c.id)}">segnala</a></p>`).join("")+'<input class="cin" maxlength="500" placeholder="Scrivi un commento (niente link o contatti)"><button class="secondary cbtn" type="button">Invia</button>';
}
$("feed").onclick=async e=>{
  const art=e.target.closest("article");if(!art)return;
  const id=art.dataset.id,box=art.querySelector(".cmbox");
  const rxb=e.target.closest("[data-rx]");
  if(rxb){
    const had=rxb.textContent.includes("✓");
    await sb.from("reactions").delete().eq("idea_id",id).eq("user_id",user.id);
    if(!had)await sb.from("reactions").insert({idea_id:id,user_id:user.id,kind:rxb.dataset.rx});
    return loadFeed();
  }
  if(e.target.closest(".cbtn")){
    const t=box.querySelector(".cin").value.trim();if(!t)return;
    if(noContact(t))return alert("Niente link, email o contatti nei commenti.");
    const{error}=await sb.from("comments").insert({idea_id:id,user_id:user.id,body:t});
    if(error)return alert("Errore: "+error.message);
    return loadComments(id,box);
  }
  const dc=e.target.closest("[data-delc]");
  if(dc){e.preventDefault();if(confirm("Eliminare il commento?")){await sb.from("comments").delete().eq("id",dc.dataset.delc);loadComments(id,box)}return}
  const rc=e.target.closest("[data-repc]");
  if(rc){e.preventDefault();const r=prompt("Motivo della segnalazione?");if(r){const{error}=await sb.from("reports").insert({comment_id:rc.dataset.repc,user_id:user.id,reason:r.slice(0,300)});alert(error?"Errore: "+error.message:"Segnalazione inviata, grazie.")}return}
  if(e.target.closest("[data-rep]")){
    const r=prompt("Perché segnali questa idea? (max 300 caratteri)");if(!r)return;
    const{error}=await sb.from("reports").insert({idea_id:id,user_id:user.id,reason:r.slice(0,300)});
    return alert(error?"Errore: "+error.message:"Segnalazione inviata, grazie.");
  }
  if(e.target.closest("[data-delidea]")&&confirm("Eliminare questa idea?")){await sb.from("ideas").delete().eq("id",id);return loadFeed()}
  if(e.target.closest("[data-cm]")){box.hidden=!box.hidden;if(!box.hidden)loadComments(id,box)}
};
$("ideaPublish").onclick=async()=>{
  const card=$("ideaCard").value.trim(),buy=+$("ideaBuy").value,sell=+$("ideaSell").value,costs=+$("ideaCosts").value||0,fee=+$("ideaFee").value||0,note=$("ideaNote").value.trim();
  if(card.length<2||!(buy>0)||!(sell>0)||costs<0||fee<0||fee>100)return alert("Controlla nome della carta e prezzi.");
  if(noContact(card+" "+note))return alert("Niente link, email o contatti.");
  const{error}=await sb.from("ideas").insert({user_id:user.id,card_name:card,game:$("ideaGame").value,buy,sell,costs,fee,owns:$("ideaOwns").checked,note:note||null});
  if(error)return alert("Errore: "+error.message);
  $("ideaCard").value="";$("ideaNote").value="";$("ideaOwns").checked=false;loadFeed();
};


window.onAuth=loadCom;
