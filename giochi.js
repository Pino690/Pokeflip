const memo=new Map();
async function getJson(u,tries=3){
  if(memo.has(u))return memo.get(u);
  let err;
  for(let i=0;i<tries;i++){
    const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),8000);
    try{
      const r=await fetch(u,{signal:ctl.signal});
      if(r.ok){const j=await r.json();memo.set(u,j);return j}
      err=new Error("HTTP "+r.status);
      if(r.status>=400&&r.status<500&&r.status!==429)throw err;
    }catch(e){err=e;if(/^HTTP 4(?!29)/.test(e.message))throw e}
    finally{clearTimeout(to)}
    await new Promise(s=>setTimeout(s,500*(i+1)));
  }
  throw err;
}

const TCGDEX="https://api.tcgdex.net/v2/",SF="https://api.scryfall.com/cards/",YG="https://db.ygoprodeck.com/api/v7/cardinfo.php";
const cmLink=(g,n)=>"https://www.cardmarket.com/en/"+g+"/Products/Search?searchString="+encodeURIComponent(n);
function pkNorm(c,lang){
  const m=c.pricing?.cardmarket||{};let p=null;
  for(const[k,l]of[["trend","trend"],["avg30","media 30 giorni"],["avg7","media 7 giorni"],["avg","media vendite"],["low","prezzo minimo"]])if(m[k]>0){p={v:m[k],l:"Cardmarket "+l,est:k!=="trend"};break}
  return{id:lang+":"+c.id,name:c.name,set:c.set?.name||"",number:c.localId||"",rarity:c.rarity||"",image:c.image?c.image+"/low.webp":"",price:p,low:m.low>0?m.low:null,cur:"EUR",link:cmLink("Pokemon",c.name)};
}
function mgNorm(c){
  const e=parseFloat(c.prices?.eur),f=parseFloat(c.prices?.eur_foil),v=e>0?e:f>0?f:null;
  return{id:c.id,name:c.name,set:c.set_name,number:c.collector_number,rarity:c.rarity,image:(c.image_uris||c.card_faces?.[0]?.image_uris||{}).small||"",price:v?{v,l:e>0?"Cardmarket (EUR)":"Cardmarket foil (EUR)",est:!(e>0)}:null,low:null,cur:"EUR",link:cmLink("Magic",c.name)};
}
function ygNorm(c){
  const v=parseFloat(c.card_prices?.[0]?.cardmarket_price),s=c.card_sets?.[0];
  return{id:String(c.id),name:c.name,set:s?.set_name||c.type||"",number:s?.set_code||"",rarity:s?.set_rarity||"",image:"",price:v>0?{v,l:"Cardmarket (EUR, indicativo)",est:false}:null,low:null,cur:"EUR",link:cmLink("YuGiOh",c.name)};
}
const notFound=e=>{if(/^HTTP 4/.test(e.message))return[];throw e};
const GAMES={
 pokemon:{label:"Pokémon",emoji:"⚡",
  async search(q){
    for(const lang of["en","it"]){
      const list=await getJson(TCGDEX+lang+"/cards?name="+encodeURIComponent(q));
      if(Array.isArray(list)&&list.length){
        const ids=list.slice(0,12),out=[];let failed=0;
        for(let i=0;i<ids.length;i+=4){
          const part=await Promise.all(ids.slice(i,i+4).map(c=>getJson(TCGDEX+lang+"/cards/"+encodeURIComponent(c.id)).catch(()=>{failed++;return null})));
          out.push(...part.filter(Boolean).map(c=>pkNorm(c,lang)));
        }
        out.failed=failed;return out;
      }
    }
    return[];
  },
  async get(id){const[l,cid]=id.split(/:(.+)/);return pkNorm(await getJson(TCGDEX+l+"/cards/"+encodeURIComponent(cid)),l)},
  async news(){
    const sets=await getJson(TCGDEX+"en/sets");
    const det=(await Promise.all(sets.slice(-6).map(s=>getJson(TCGDEX+"en/sets/"+s.id).catch(()=>null)))).filter(Boolean).sort((a,b)=>(b.releaseDate||"").localeCompare(a.releaseDate||""));
    const s=det[0];
    return s?{title:"Ultimo set: "+s.name,cards:(s.cards||[]).slice(-12).reverse().map(c=>({id:"en:"+c.id,name:c.name,set:s.name,number:c.localId,image:c.image?c.image+"/low.webp":""}))}:null;
  }},
 magic:{label:"Magic: The Gathering",emoji:"🔮",
  async search(q){try{return(await getJson(SF+"search?unique=prints&order=released&dir=desc&q="+encodeURIComponent(q))).data.slice(0,12).map(mgNorm)}catch(e){return notFound(e)}},
  async get(id){return mgNorm(await getJson(SF+encodeURIComponent(id)))},
  async news(){const j=await getJson(SF+"search?unique=prints&order=released&dir=desc&q="+encodeURIComponent("game:paper (r:rare OR r:mythic)"));return{title:"Ultime carte rare e mitiche",cards:j.data.slice(0,12).map(mgNorm)}}},
 yugioh:{label:"Yu-Gi-Oh!",emoji:"🃏",
  async search(q){try{return(await getJson(YG+"?num=12&offset=0&fname="+encodeURIComponent(q))).data.map(ygNorm)}catch(e){return notFound(e)}},
  async get(id){return ygNorm((await getJson(YG+"?id="+encodeURIComponent(id))).data[0])}},
 onepiece:{label:"One Piece",emoji:"🏴‍☠️",manual:true},
 dragonball:{label:"Dragon Ball",emoji:"🐉",manual:true},
 naruto:{label:"Naruto",emoji:"🍥",manual:true}
};
