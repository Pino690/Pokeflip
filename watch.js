async function loadWatch(){
  const{data,error}=await sb.from("watchlist").select("*").order("created_at",{ascending:false});
  if(error)throw error;
  return data||[];
}
const below=w=>w.last_price!=null&&Number(w.last_price)<=Number(w.target);
async function refreshWatch(rows,onStep){
  for(let i=0;i<rows.length;i+=4){
    await Promise.all(rows.slice(i,i+4).map(async w=>{
      const G=GAMES[w.game];if(!G||!G.get)return;
      try{
        const v=(await G.get(w.card_id)).price?.v;
        if(v>0){w.last_price=v;w.last_checked=new Date().toISOString();await sb.from("watchlist").update({last_price:v,last_checked:w.last_checked}).eq("id",w.id)}
      }catch{}
    }));
    if(onStep)onStep(rows);
  }
  return rows;
}
