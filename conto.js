function render(){
  $("capital").value=state.capital;$("reservePct").value=state.reservePct;
  $("cash").textContent=eur(cash());$("reserve").textContent=eur(state.capital*state.reservePct/100);
  $("budget").textContent=eur(budget());
  $("count").textContent=state.cards.filter(c=>c.status==="owned").length;
  $("profit").textContent=eur(state.history.filter(x=>x.type==="sale").reduce((a,x)=>a+(x.profit||0),0));
  const L={owned:"In inventario",sold:"Venduta",watch:"Da valutare"};
  $("cards").innerHTML=state.cards.length?state.cards.map(c=>`<article class="item"><h3>${esc(c.name)} <span class="small muted">${esc(c.game||"pokemon")}</span></h3>
    <p>Acquisto ${eur(c.buy)} · Rivendita stimata ${eur(c.sell)} · Profitto stimato ${eur(c.estimate)}</p>
    <p>Stato: <strong>${L[c.status]||"Da valutare"}</strong></p><div class="acts">
    ${c.status==="watch"?`<button class="secondary" data-buy="${esc(c.id)}">Segna come comprata</button>`:""}
    ${c.status==="owned"?`<button class="secondary" data-sell="${esc(c.id)}">Registra vendita</button>`:""}
    <button class="danger" data-del="${esc(c.id)}">Elimina</button></div></article>`).join(""):'<p class="muted">Nessuna carta inserita. Cercane una qui sopra.</p>';
  $("history").innerHTML=state.history.length?[...state.history].reverse().map(x=>`<article class="item"><strong>${esc(x.description)}</strong>
    <p>${esc(x.date)} · ${esc(x.type)} · ${eur(x.amount)}${x.type==="sale"?" · Profitto "+eur(x.profit):""}</p></article>`).join(""):'<p class="muted">Nessun movimento.</p>';
}
$("saveSettings").onclick=()=>{
  const c=num("capital"),p=num("reservePct");
  if(c<0||p<0||p>100)return alert("Valori non validi.");
  state.capital=c;state.reservePct=p;save();
};
$("cards").onclick=e=>{
  const g=a=>e.target.closest("["+a+"]")?.getAttribute(a);
  const bu=g("data-buy"),se=g("data-sell"),de=g("data-del");
  if(bu){
    const c=state.cards.find(x=>x.id===bu);if(!c)return;
    if(c.buy>budget()&&!confirm("Supera il budget dopo la riserva. Continuare?"))return;
    c.status="owned";purchase(c);save();
  }
  if(se){
    const c=state.cards.find(x=>x.id===se),t=prompt("A che prezzo hai venduto? (€)");
    if(!c||t===null)return;
    const a=Number(t.replace(",","."));if(!(a>0))return alert("Importo non valido.");
    const net=a*(1-(c.fee??5)/100)-(c.costs||0);
    c.status="sold";
    state.history.push({id:uid(),type:"sale",description:"Vendita: "+c.name,date:today(),amount:net,profit:net-c.buy});
    save();
  }
  if(de&&confirm("Eliminare questa carta?")){state.cards=state.cards.filter(x=>x.id!==de);save()}
};
$("export").onclick=()=>{
  const l=document.createElement("a");
  l.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}));
  l.download="pokeflip-backup.json";l.click();URL.revokeObjectURL(l.href);
};


render();
