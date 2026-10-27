/* Pure domain functions: no DOM or storage dependencies, shared with the test suite. */
(function(root){
  'use strict';
  const {foods,recipes}=root.FridgeData;
  const byId=id=>foods.find(f=>f.id===id);
  const normalize=s=>s.trim().toLowerCase().replace(/\s+/g,' ');
  const identify=name=>foods.find(f=>[f.name,...f.aliases].some(n=>normalize(n)===normalize(name)));
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const day=s=>Date.parse(s+'T00:00:00Z')/86400000;
  const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(day(s))&&new Date(day(s)*86400000).toISOString().slice(0,10)===s;
  const addDays=(s,n)=>new Date((day(s)+n)*86400000).toISOString().slice(0,10);
  const freshness=(item,date=today())=>{const days=day(item.expiry)-day(date);return {days,status:days<0?'expired':days<=2?'soon':'fresh',label:days<0?'Past Estimated Date':days<=2?'Use Soon':'Fresh'};};
  const estimate=(food,storage,added)=>food?.shelf[storage]!==undefined?addDays(added,food.shelf[storage]):'';
  const sumNutrition=(a,b,m=1)=>a.map((v,i)=>v+b[i]*m);
  const emptyNutrition=()=>[0,0,0,0];
  const rounded=n=>Math.round((n+Number.EPSILON)*10000)/10000;
  function validateItem(item){
    if(!item.name?.trim()||!item.unit?.trim())throw Error('Enter an ingredient name and a clear unit description.');
    if(!Number.isFinite(item.quantity)||item.quantity<=0||item.quantity>10000)throw Error('Enter a quantity between 0.01 and 10,000.');
    if(!Number.isFinite(item.grams)||item.grams<.1||item.grams>10000)throw Error('Enter a valid edible weight per unit.');
    if(!validDate(item.added)||!validDate(item.expiry))throw Error('Enter valid dates.');
    if(item.added>today())throw Error('The date added cannot be in the future.');
    if(item.expiry<item.added)throw Error('Use-by date must be on or after the date added.');
    if(!['fridge','freezer','pantry'].includes(item.storage))throw Error('Choose a storage condition.');
    if(!Array.isArray(item.n)||item.n.length!==4||item.n.some((v,i)=>!Number.isFinite(v)||v<0||v>(i===0?1000:100)))throw Error('Enter nutrition per 100 g: 0–1,000 kcal and 0–100 g for each macro.');
    if(item.n[1]+item.n[2]+item.n[3]>100.1)throw Error('Protein, carbohydrate and fat cannot total more than 100 g per 100 g.');
    return item;
  }
  // Match in grams so changing a user's portion never changes recipe requirements.
  // Multiple batches are allocated by earliest date; past-date batches never contribute.
  function match(recipe,inventory,date=today()){
    let nutrition=emptyNutrition(),soon=0;
    const lines=recipe.ingredients.map(req=>{
      const ref=byId(req.food),required=req.units*ref.grams;
      const eligible=inventory.filter(i=>i.food===req.food&&freshness(i,date).status!=='expired').slice().sort((a,b)=>a.expiry.localeCompare(b.expiry)||a.id.localeCompare(b.id));
      const available=eligible.reduce((s,i)=>s+i.quantity*i.grams,0);
      let remaining=required;const allocations=[];
      eligible.forEach(i=>{const grams=Math.min(remaining,i.quantity*i.grams);if(grams<=.00001)return;allocations.push({id:i.id,grams,units:grams/i.grams,unit:i.unit});nutrition=sumNutrition(nutrition,i.n,grams/100);if(freshness(i,date).status==='soon')soon+=grams/required;remaining-=grams;});
      if(remaining>0)nutrition=sumNutrition(nutrition,ref.n,remaining/100);
      return {ref,units:req.units,required,available,missing:Math.max(0,required-available),allocations};
    });
    const coverage=lines.reduce((s,l)=>s+Math.min(1,l.available/l.required),0)/lines.length;
    const ready=lines.every(l=>l.missing<.00001);
    const perServing=nutrition.map(v=>v/recipe.servings);
    // Availability dominates; urgency, speed and a simple macro heuristic break ties.
    const energy=perServing[0];const proteinShare=energy?perServing[1]*4/energy:0;const fatShare=energy?perServing[3]*9/energy:0;
    const balance=(proteinShare>=.15&&fatShare<=.4&&lines.some(l=>l.ref.category==='Vegetables'||l.ref.category==='Fruit'))?5:0;
    const score=coverage*65+(ready?15:0)+Math.min(soon/lines.length,1)*10+Math.max(0,1-recipe.time/30)*5+balance;
    return {recipe,lines,nutrition:perServing,coverage,ready,soon,score};
  }
  function rank(inventory,prefs={},date=today()){
    return recipes.map(r=>match(r,inventory,date)).filter(m=>m.recipe.time<=(prefs.time||60)&&m.nutrition[0]>=(prefs.minCal||0)&&m.nutrition[0]<=(prefs.maxCal??1000)&&(!prefs.diet||prefs.diet==='all'||m.recipe.diet===prefs.diet||(prefs.diet==='vegetarian'&&m.recipe.diet==='vegan'))).sort((a,b)=>b.score-a.score||a.recipe.time-b.recipe.time||a.recipe.id.localeCompare(b.recipe.id));
  }
  // Public recommendation entry point: only complete, quantity-sufficient matches.
  function recommend(inventory,prefs={},date=today()){
    return rank(inventory,prefs,date).filter(result=>result.ready);
  }
  function deduct(recipe,inventory,date=today()){
    const result=match(recipe,inventory,date);
    if(!result.ready)throw Error('Not enough eligible ingredients. Add the missing quantities or review past-date items.');
    const next=inventory.map(i=>({...i,n:[...i.n]}));
    result.lines.forEach(l=>l.allocations.forEach(a=>{const i=next.find(i=>i.id===a.id);i.quantity=rounded(i.quantity-a.units);}));
    return next.filter(i=>i.quantity>.00001);
  }
  function demo(date=today()){
    return [['eggs',6,14],['spinach',4,1],['tomato',4,2],['avocado',2,2],['bread',6,2],['oil',20,70],['chickpeas',3,2],['cucumber',1,3],['feta',4,5],['rice',3,2],['broccoli',2,2]].map(([id,quantity,left],index)=>{
      const f=byId(id);const storage=f.shelf.fridge!==undefined?'fridge':'pantry';const shelf=f.shelf[storage];return {id:'demo-'+index,food:id,name:f.name,quantity,unit:f.unit,grams:f.grams,n:[...f.n],category:f.category,storage,added:addDays(date,-Math.max(0,shelf-left)),expiry:addDays(date,left),manualDate:false};
    });
  }
  root.FridgeEngine={byId,identify,today,day,validDate,addDays,freshness,estimate,validateItem,match,rank,recommend,deduct,demo,rounded};
  if(typeof module!=='undefined')module.exports=root.FridgeEngine;
})(typeof globalThis!=='undefined'?globalThis:window);
