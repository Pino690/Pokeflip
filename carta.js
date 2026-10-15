function calc(){
  const b=num("buy"),s=num("sell"),c=num("costs"),f=num("fee"),m=num("margin");
  if([b,s,c,f,m].some(x=>x<0)||f>100){$("estimate").textContent="Controlla i valori";return null}
  const net=s*(1-f/100)-c,p=net-b;
  $("estimate").textContent=eur(p);$("estimate").className=p>=0?"green":"red";
  $("maxPrice").textContent="Prezzo massimo per il margine: "+eur(Math.max(0,net/(1+m/100)));
  return{b,s,c,f,p};
}
const purchase=c=>state.history.push({id:uid(),type:"purchase",description:"Acquisto: "+c.name,date:today(),amount:c.buy});
function add(st){
  const name=$("name").value.trim(),c=calc();
  if(!name||!c||c.b<=0||c.s<=0)return alert("Inserisci il nome e prezzi maggiori di zero.");
  if(st==="owned"&&c.b>budget()&&!confirm("Supera il budget dopo la riserva. Registrare comunque l'acquisto?"))return;
  const card={id:uid(),game:GAME,name,buy:c.b,sell:c.s,costs:c.c,fee:c.f,estimate:c.p,status:st};
  state.cards.push(card);if(st==="owned")purchase(card);
  save();alert(st==="owned"?"Acquisto registrato nel tuo conto.":"Carta salvata come da valutare.");
}
$("addWatch").onclick=()=>add("watch");
$("addOwned").onclick=()=>add("owned");
["buy","sell","costs","fee","margin"].forEach(id=>$(id).addEventListener("input",calc));
