/* UI controller: state lives in one versioned localStorage record; DOM is a view. */
(function(){
  'use strict';
  const E=FridgeEngine,D=FridgeData,$=id=>document.getElementById(id),KEY='fridgekind.beta.v1';
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>Number(n.toFixed(2)).toLocaleString();
  let state,view='fridge',inventoryFilter='all',recipeFilter='all',currentRecipe=null,currentFood=null,dateOverridden=false,previous=null,toastTimer;
  const defaults=()=>({version:1,inventory:E.demo(),preferences:{time:60,diet:'all',minCal:0,maxCal:1000},saved:[]});
  function load(){
    try{
      const raw=localStorage.getItem(KEY);
      if(raw===null)return defaults();
      const s=JSON.parse(raw);
      if(s.version!==1||!Array.isArray(s.inventory)||!Array.isArray(s.saved)||!s.preferences)throw Error('Unrecognized saved data.');
      const ids=new Set();s.inventory.forEach(i=>{E.validateItem(i);if(!i.id||ids.has(i.id)||i.food&&!E.byId(i.food))throw Error('Invalid inventory record.');ids.add(i.id);});
      const p=s.preferences;if(!['all','vegetarian','vegan'].includes(p.diet)||![p.time,p.minCal,p.maxCal].every(Number.isFinite)||p.minCal<0||p.maxCal<p.minCal)throw Error('Invalid saved preferences.');
      return s;
    }catch(error){$('storage-warning').textContent='Saved data could not be loaded. Your original browser record has been preserved. This session can be used temporarily; reload after correcting browser storage.';return {...defaults(),inventory:[],readOnlyStorage:true};}
  }
  state=load();
  function persist(){
    if(state.readOnlyStorage)return false;
    try{localStorage.setItem(KEY,JSON.stringify(state));$('storage-warning').textContent='';return true;}
    catch{ $('storage-warning').textContent='Browser storage is unavailable or full. Changes work for this session but will not persist after refresh.';return false; }
  }
  if(!state.readOnlyStorage)persist();
  function toast(message,undo=false){clearTimeout(toastTimer);$('toast-message').textContent=message;$('toast-undo').classList.toggle('hidden',!undo);$('toast').classList.remove('hidden');toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),6500);}
  function changed(){previous=null;persist();render();}
  function render(){
    const inventory=state.inventory,soon=inventory.filter(i=>E.freshness(i).status==='soon'),expired=inventory.filter(i=>E.freshness(i).status==='expired');
    $('total-stat').textContent=inventory.length;$('soon-stat').textContent=soon.length;
    $('ready-stat').textContent=D.recipes.filter(r=>E.match(r,inventory).ready).length;
    $('undo').disabled=!previous;
    $('priority').innerHTML=soon.length?soon.map(i=>`<span class="priority-item">${esc(i.name)} · ${E.freshness(i).days===0?'today':E.freshness(i).days+'d left'}</span>`).join(''):'Your fridge has a little breathing room. We’ll highlight ingredients as their dates approach.';
    if(expired.length)$('priority').innerHTML+=`<br><span class="priority-item expired">${expired.length} past-date item${expired.length===1?'':'s'} to review</span>`;
    renderInventory();renderRecipes();
  }
  function renderInventory(){
    const query=$('search').value.trim().toLowerCase();
    const items=state.inventory.filter(i=>i.name.toLowerCase().includes(query)&&(inventoryFilter==='all'||inventoryFilter==='soon'&&E.freshness(i).status==='soon'||inventoryFilter==='expired'&&E.freshness(i).status==='expired'||i.category===inventoryFilter)).slice().sort((a,b)=>a.expiry.localeCompare(b.expiry));
    $('items').innerHTML=items.length?items.map(i=>{
      const f=E.freshness(i),food=E.byId(i.food),n=i.n.map(v=>v*i.grams*i.quantity/100);
      return `<article class="item"><div class="food-icon" aria-hidden="true">${food?.emoji||'🌿'}</div><div class="item-info"><h4 class="item-name" style="margin-top:0">${esc(i.name)}</h4><div class="item-meta">${fmt(i.quantity)} × ${esc(i.unit)} · ${fmt(i.grams)} g/unit<br>Added ${esc(i.added)} · ${esc(i.storage)}<br>Est. ${Math.round(n[0])} kcal total · ${fmt(n[1])} g protein<br>Est. use-by ${esc(i.expiry)}</div><span class="badge ${f.status==='soon'?'soon':f.status==='expired'?'expired':''}">${f.label}${f.days>=0?' · '+(f.days===0?'today':f.days+'d left'):''}</span><div class="item-actions"><button class="text-button" data-edit="${esc(i.id)}" aria-label="Edit ${esc(i.name)}">${f.status==='expired'?'Review / edit':'Edit'}</button><button class="text-button" data-delete="${esc(i.id)}" aria-label="Remove ${esc(i.name)}">Remove</button></div></div></article>`;
    }).join(''):`<p class="empty">${state.inventory.length?'No ingredients match this search.':'Your fridge is ready for a fresh start. Add your first ingredient.'}</p>`;
  }
  function filteredRecipes(){
    return E.rank(state.inventory,state.preferences).filter(m=>(view!=='saved'||state.saved.includes(m.recipe.id))&&(recipeFilter==='all'||recipeFilter==='ready'&&m.ready||recipeFilter==='soon'&&m.soon>0||recipeFilter==='protein'&&m.nutrition[1]>=20));
  }
  function renderRecipes(){
    $('main').classList.toggle('all-recipes',view!=='fridge');
    $('recipe-title').textContent=view==='saved'?'Your saved ideas':view==='recipes'?'A little meal inspiration':'Made for your fridge';
    const matches=filteredRecipes();
    $('recipe-status').textContent=`${matches.length} recipe${matches.length===1?'':'s'} · Ranked by availability, freshness, speed & nutrition`;
    $('recipes').innerHTML=matches.length?matches.map(m=>{
      const r=m.recipe,saved=state.saved.includes(r.id),missing=m.lines.filter(l=>l.missing>.00001);
      return `<article class="recipe"><button class="recipe-open" data-recipe="${r.id}" aria-label="Review ${esc(r.name)}"><div class="photo"><img src="${r.image}" alt="${esc(r.name)} — illustrative food photograph" loading="lazy"><span class="tag">${m.soon>0?'☀ Uses ingredients due soon':r.time<=10?'Quick & easy':r.diet==='vegan'?'Plant powered':'A balanced idea'}</span></div></button><div class="recipe-body"><div class="recipe-top"><h4>${esc(r.name)}</h4><button class="text-button" data-save="${r.id}" aria-label="${saved?'Unsave':'Save'} ${esc(r.name)}" aria-pressed="${saved}">${saved?'♥':'♡'}</button></div><p class="description">${esc(r.description)}</p><div class="macro"><span>◷ ${r.time} min</span><span><strong>${Math.round(m.nutrition[0])}</strong> kcal</span><span><strong>${fmt(m.nutrition[1])} g</strong> protein</span></div><div class="match"><span class="${m.ready?'':'missing'}">${m.ready?'✓ All ingredients available':Math.round(m.coverage*100)+'% ingredient match · '+missing.length+' missing'}</span><button class="text-button" data-recipe="${r.id}" aria-label="View ingredients for ${esc(r.name)}">View →</button></div><p class="serving-info">${r.servings} serving${r.servings>1?'s':''} · ${r.diet==='omnivore'?'Includes fish or poultry':r.diet}${!m.ready?'<br>Needs: '+missing.map(l=>esc(l.ref.name)+' '+fmt(l.missing/l.ref.grams)+' × '+esc(l.ref.unit)).join(', '):''}</p></div></article>`;
    }).join(''):'<div class="empty">No recipes match yet. Try widening your filters, adding ingredients, or saving a recipe.</div>';
  }
  function selectView(page){view=page;document.querySelectorAll('[data-page]').forEach(b=>{b.classList.toggle('active',b.dataset.page===page);if(b.dataset.page===page)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});renderRecipes();}
  function previewNutrition(){
    const grams=Number($('weight').value),q=Number($('quantity').value),cal=Number($('calories').value);
    $('portion-preview').textContent=grams&&q&&$('calories').value!==''?`Estimated ${Math.round(cal*grams/100)} kcal per unit · ${Math.round(cal*grams*q/100)} kcal for all ${fmt(q)} units.`:'';
  }
  function suggestDate(force=false){
    const food=currentFood,storage=$('storage').value,added=$('added').value;
    const supported=food&&food.shelf[storage]!==undefined;
    $('shelf-hint').textContent=food?`${food.assumption} ${supported?'Suggested '+food.shelf[storage]+' days for selected storage.':'No reference estimate for this storage; enter a date based on your package and storage history.'} ${dateOverridden&&!force?'Your manual date is preserved.':''}`:'No recognized reference. Enter a date using your package label and actual storage history.';
    if((!dateOverridden||force)&&E.validDate(added))$('expiry').value=supported?E.estimate(food,storage,added):'';
    if(force)dateOverridden=false;
  }
  function recognize(){
    const food=E.identify($('food').value);
    if(food?.id===currentFood?.id&&food)return;
    currentFood=food||null;
    $('reference-hint').textContent=food?'Reference matched: '+food.name+'. Suggested values below are editable.':'Not in our reference list. Enter your own unit, weight, date, and nutrition; this food will be tracked but will not automatically match curated recipes.';
    if(food){$('unit').value=food.unit;$('weight').value=food.grams;$('category').value=food.category;['calories','protein','carbs','fat'].forEach((key,j)=>$(key).value=food.n[j]);$('storage').value=food.shelf.fridge!==undefined?'fridge':'pantry';}
    else{$('unit').value='';$('weight').value='';['calories','protein','carbs','fat'].forEach(key=>$(key).value='');}
    suggestDate();previewNutrition();
  }
  function openIngredient(id){
    const i=state.inventory.find(i=>i.id===id);
    $('ingredient-form').reset();$('form-error').textContent='';$('item-id').value=i?.id||'';
    currentFood=null;dateOverridden=false;
    $('ingredient-title').textContent=i?'A little fridge update':'A fresh addition';$('added').max=E.today();$('added').value=i?.added||E.today();
    if(i){currentFood=E.byId(i.food)||null;dateOverridden=!!i.manualDate;$('food').value=i.name;$('quantity').value=i.quantity;$('unit').value=i.unit;$('weight').value=i.grams;$('category').value=i.category;$('storage').value=i.storage;$('expiry').value=i.expiry;['calories','protein','carbs','fat'].forEach((key,j)=>$(key).value=i.n[j]);$('reference-hint').textContent=currentFood?'Reference: '+currentFood.name+'. Your saved values are shown.':'Custom ingredient; manually entered estimates.';const expiry=i.expiry;suggestDate();$('expiry').value=expiry;}
    else{$('reference-hint').textContent='Choose a common ingredient for automatic suggestions, or enter your own.';$('shelf-hint').textContent='';}
    previewNutrition();$('ingredient-dialog').showModal();
  }
  function openRecipe(id){
    const r=D.recipes.find(r=>r.id===id);if(!r)return;
    currentRecipe=id;const m=E.match(r,state.inventory);
    $('recipe-dialog').innerHTML=`<div class="dialog-top"><h2 id="detail-title">${esc(r.name)}</h2><button class="close" aria-label="Close recipe details">×</button></div><img class="detail-photo" src="${r.image}" alt="${esc(r.name)} — illustrative food photograph"><p>${esc(r.description)}</p><p class="serving-info">${r.time} min · ${r.servings} serving${r.servings>1?'s':''} · Quantities below are for the whole recipe.</p><div class="nutrition" aria-label="Estimated nutrition per serving">${['kcal','Protein g','Carbs g','Fat g'].map((label,j)=>`<div><b>${j?fmt(m.nutrition[j]):Math.round(m.nutrition[j])}</b>${label}</div>`).join('')}</div><h3>What you'll use</h3>${m.lines.map(l=>`<div class="ingredient-line"><span><b>${esc(l.ref.name)}</b><br>${fmt(l.units)} × ${esc(l.ref.unit)}<br><small>${fmt(l.required)} g required</small></span><span class="${l.missing>.00001?'missing':''}">${fmt(l.available)} g available${l.missing>.00001?'<br>Missing '+fmt(l.missing/l.ref.grams)+' × '+esc(l.ref.unit):'<br>✓ In your fridge'}${l.allocations.length?'<br>Uses '+l.allocations.map(a=>fmt(a.units)+' × '+esc(a.unit)).join(', '):''}</span></div>`).join('')}<p class="small-note">Nutrition is estimated per serving. Your edited nutrient values are used for available amounts; reference values fill any missing amounts. Past-date ingredients do not count as available.</p><p class="${m.ready?'small-note':'notice'}">${m.ready?'Confirm only after using these ingredients. This will update your fridge.':'You need additional eligible ingredients before you can confirm. Add missing quantities or review and update past-date items.'}</p><p id="deduction-error" class="error" role="alert"></p><button class="primary full" id="confirm-use" ${m.ready?'':'disabled'}>Confirm Ingredients Used</button>`;
    if(!$('recipe-dialog').open)$('recipe-dialog').showModal();
  }
  function undo(){
    if(!previous){toast('There is no ingredient use to undo.');return;}
    state.inventory=previous;previous=null;persist();render();toast('Ingredient use undone. Your fridge is restored.');
  }
  $('ingredient-form').addEventListener('submit',event=>{
    event.preventDefault();try{
      const id=$('item-id').value;
      const item=E.validateItem({id:id||crypto.randomUUID(),food:E.identify($('food').value)?.id||null,name:$('food').value.trim(),quantity:Number($('quantity').value),unit:$('unit').value.trim(),grams:Number($('weight').value),n:['calories','protein','carbs','fat'].map(k=>Number($(k).value)),category:$('category').value,storage:$('storage').value,added:$('added').value,expiry:$('expiry').value,manualDate:dateOverridden});
      // Preserve separate batches when their dates or assumptions differ; merge exact duplicates.
      const signature=i=>JSON.stringify([i.food,i.name.toLowerCase(),i.unit,i.grams,i.n,i.category,i.storage,i.added,i.expiry]);
      const duplicate=state.inventory.find(i=>i.id!==id&&signature(i)===signature(item));
      let next=state.inventory.filter(i=>i.id!==id);
      if(duplicate){next=next.map(i=>i.id===duplicate.id?E.validateItem({...i,quantity:E.rounded(i.quantity+item.quantity)}):i);}else next.push(item);
      state.inventory=next;changed();$('ingredient-dialog').close();toast(id?'Ingredient updated.':'A fresh addition to your fridge.');
    }catch(error){$('form-error').textContent=error.message;}
  });
  $('food').addEventListener('input',recognize);['added','storage'].forEach(id=>$(id).addEventListener('change',()=>suggestDate()));$('expiry').addEventListener('input',()=>{dateOverridden=true;suggestDate();});$('reestimate').onclick=()=>suggestDate(true);
  ['weight','quantity','calories'].forEach(id=>$(id).addEventListener('input',previewNutrition));
  $('add').onclick=$('add-more').onclick=()=>openIngredient();$('search').addEventListener('input',renderInventory);
  $('inventory-filters').onclick=event=>{const b=event.target.closest('[data-filter]');if(!b)return;inventoryFilter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(el=>{el.classList.toggle('active',el===b);el.setAttribute('aria-pressed',el===b);});renderInventory();};
  $('recipe-filters').onclick=event=>{const b=event.target.closest('[data-rfilter]');if(!b)return;recipeFilter=b.dataset.rfilter;document.querySelectorAll('[data-rfilter]').forEach(el=>{el.classList.toggle('active',el===b);el.setAttribute('aria-pressed',el===b);});renderRecipes();};
  $('preferences').onsubmit=e=>e.preventDefault();
  $('preferences').addEventListener('change',()=>{const min=Number($('min-cal').value),max=Number($('max-cal').value);$('max-cal').setCustomValidity(max<min?'Maximum calories must be at least the minimum.':'');if(!$('preferences').reportValidity())return;state.preferences={time:Number($('max-time').value),diet:$('diet').value,minCal:min,maxCal:max};persist();renderRecipes();});
  document.addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b)return;
    if(b.matches('.close'))b.closest('dialog').close();
    if(b.dataset.page)selectView(b.dataset.page);
    if(b.dataset.edit)openIngredient(b.dataset.edit);
    if(b.dataset.delete){state.inventory=state.inventory.filter(i=>i.id!==b.dataset.delete);changed();toast('Ingredient removed.');}
    if(b.dataset.recipe)openRecipe(b.dataset.recipe);
    if(b.dataset.save){const id=b.dataset.save;state.saved=state.saved.includes(id)?state.saved.filter(x=>x!==id):[...state.saved,id];persist();renderRecipes();}
    if(b.id==='confirm-use'){
      if(!currentRecipe||b.disabled)return;b.disabled=true;
      try{const r=D.recipes.find(r=>r.id===currentRecipe);const next=E.deduct(r,state.inventory);previous=structuredClone(state.inventory);state.inventory=next;currentRecipe=null;persist();render();$('recipe-dialog').close();toast('Ingredients used. Your fridge is up to date.',true);}
      catch(error){$('deduction-error').textContent=error.message;b.disabled=false;}
    }
  });
  $('generate').onclick=()=>{selectView('recipes');renderRecipes();$('recipe-title').scrollIntoView({behavior:'smooth',block:'start'});$('recipe-title').focus({preventScroll:true});toast('Fresh ideas ranked using your current fridge and preferences.');};
  document.querySelector('.brand').onclick=event=>{event.preventDefault();selectView('fridge');window.scrollTo({top:0,behavior:'smooth'});};
  $('undo').onclick=$('toast-undo').onclick=undo;
  $('about').onclick=event=>{event.preventDefault();$('about-dialog').showModal();};
  $('foods').innerHTML=D.foods.map(f=>`<option value="${esc(f.name)}"></option>`).join('');
  $('today').textContent=new Intl.DateTimeFormat(undefined,{weekday:'long',month:'short',day:'numeric'}).format(new Date());$('today').dateTime=E.today();
  $('max-time').value=state.preferences.time;$('diet').value=state.preferences.diet;$('min-cal').value=state.preferences.minCal;$('max-cal').value=state.preferences.maxCal;
  // Invalidate an undo snapshot after inventory edits or another tab's changes.
  window.addEventListener('storage',event=>{if(event.key===KEY){state=load();previous=null;$('ingredient-dialog').close();$('recipe-dialog').close();$('max-time').value=state.preferences.time;$('diet').value=state.preferences.diet;$('min-cal').value=state.preferences.minCal;$('max-cal').value=state.preferences.maxCal;render();toast('Your fridge was updated in another tab.');}});
  window.addEventListener('focus',render);setInterval(render,60000);render();
})();
