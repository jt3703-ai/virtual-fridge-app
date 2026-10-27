/* UI controller: state lives in one versioned localStorage record; DOM is a view. */
(function(){
  'use strict';
  const E=FridgeEngine,D=FridgeData,$=id=>document.getElementById(id),KEY='fridgekind.beta.v2';
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>Number(n.toFixed(2)).toLocaleString();
  let state,view='fridge',inventoryFilter='all',currentRecipe=null,currentFood=null,dateOverridden=false,previous=null,toastTimer;
  const defaults=()=>({version:2,inventory:[],preferences:{time:60,diet:'all',minCal:0,maxCal:1000},saved:[]});
  function load(){
    try{
      const raw=localStorage.getItem(KEY);
      if(raw===null)return defaults();
      const s=JSON.parse(raw);
      if(s.version!==2||!Array.isArray(s.inventory)||!Array.isArray(s.saved)||!s.preferences)throw Error('Unrecognized saved data.');
      const ids=new Set();s.inventory.forEach(i=>{E.validateItem(i);if(!i.id||ids.has(i.id)||i.food&&!E.byId(i.food))throw Error('Invalid inventory record.');ids.add(i.id);});
      const p=s.preferences;if(!['all','vegetarian','vegan'].includes(p.diet)||![p.time,p.minCal,p.maxCal].every(Number.isFinite)||p.minCal<0||p.maxCal<p.minCal)throw Error('Invalid saved preferences.');
      if(s.menu&&(!Array.isArray(s.menu.ids)||!E.validDate(s.menu.date)))delete s.menu;
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

    $('undo').disabled=!previous;
    $('priority').textContent=soon.length ? 'Use soon: '+soon.slice(0,3).map(i=>i.name).join(', ')+(soon.length>3?' + more':'') : '';
    if(expired.length) $('priority').textContent+=' · '+expired.length+' past-date item(s) to review.';
    renderInventory();renderRecipes();
  }
  function renderInventory(){
    const query=$('search').value.trim().toLowerCase();
    const items=state.inventory.filter(i=>i.name.toLowerCase().includes(query)&&(inventoryFilter==='all'||inventoryFilter==='soon'&&E.freshness(i).status==='soon'||inventoryFilter==='expired'&&E.freshness(i).status==='expired'||i.category===inventoryFilter)).slice().sort((a,b)=>a.expiry.localeCompare(b.expiry));
    $('items').innerHTML=items.length?items.map(i=>{
      const f=E.freshness(i),food=E.byId(i.food);
      return `<article class="fridge-food"><img class="food-image" src="assets/foods/${food?.id||'custom'}.svg" alt="${esc(i.name)} illustration"><h3>${esc(i.name)}</h3><p class="unit-count">${fmt(i.quantity)} × ${esc(i.unit)}</p><span class="badge ${f.status==='soon'?'soon':f.status==='expired'?'expired':''}">${f.label}${f.days>=0?' · '+(f.days===0?'today':f.days+'d'):''}</span><div class="food-actions"><button data-edit="${esc(i.id)}" aria-label="Edit ${esc(i.name)}">Edit</button><button data-delete="${esc(i.id)}" aria-label="Remove ${esc(i.name)}">Remove</button></div></article>`;
    }).join('') : state.inventory.length ? '<p class="empty">No foods match your search.</p>' : '<div class="fridge-empty"><span class="empty-icon" aria-hidden="true">❧</span><h2>A fresh start awaits.</h2><p>Add a few things you have. Good meal ideas begin right here.</p><button class="secondary" data-open-picker>Add your first food</button></div>';
  }
  function renderRecipes(){
    $('fridge-view').hidden=view!=='fridge';
    $('menu-view').hidden=view==='fridge';
    const menu=state.menu;
    const matches=(menu?.date===E.today()?menu.ids:[]).map(id=>D.recipes.find(r=>r.id===id)).filter(Boolean).map(r=>E.match(r,state.inventory));
    $('recipe-status').textContent=matches.length ? `${matches.length} ideas for today · Nutrition and availability reflect your current fridge.` : 'Your menu is waiting for a little inspiration.';
    $('recipes').innerHTML=matches.length?matches.map(m=>{
      const r=m.recipe;
      return `<article class="recipe"><button class="recipe-open" data-recipe="${r.id}" aria-label="Review ${esc(r.name)}"><div class="photo"><img src="${r.image}" alt="${esc(r.name)} — illustrative food photograph" loading="lazy"><span class="tag">${r.time} min · ${r.servings} serving${r.servings>1?'s':''}</span></div></button><div class="recipe-body"><h2>${esc(r.name)}</h2><p class="description">${esc(r.description)}</p><div class="macro"><span><strong>${Math.round(m.nutrition[0])}</strong> kcal / serving</span></div><p class="card-nutrients">Protein ${fmt(m.nutrition[1])} g · Carbs ${fmt(m.nutrition[2])} g · Fat ${fmt(m.nutrition[3])} g</p><ul class="recipe-ingredients">${m.lines.map(l=>`<li><span>${esc(l.ref.name)}${l.missing>.00001?'<small>Missing '+fmt(l.missing)+' g</small>':''}</span><span>${fmt(l.units)} × ${esc(l.ref.unit)}</span></li>`).join('')}</ul><p class="match ${m.ready?'':'missing'}">${m.ready?'✓ Everything is in your fridge':Math.round(m.coverage*100)+'% ingredient match · Extras needed'}</p><button class="secondary" data-recipe="${r.id}">Review ingredients →</button></div></article>`;
    }).join('') : '<div class="empty"><h2>Let’s make room for a good meal.</h2><p>'+(state.inventory.length?'Return to My Fridge and summarize your menu to see three matched ideas.':'Add food to My Fridge first, then summarize your menu.')+'</p><button class="secondary full" data-page="fridge">Go to My Fridge</button></div>';
  }
  function generateMenu(){
    if(!$('preferences').reportValidity()){selectView('recipes');return;}
    const matches=E.rank(state.inventory,state.preferences).filter(m=>m.coverage>0).slice(0,3);
    if(!matches.length){toast(state.inventory.length?'No matching meal ideas. Try changing preferences or adding more common foods.':'Add a few foods before summarizing your menu.');return;}
    state.menu={date:E.today(),ids:matches.map(m=>m.recipe.id)};persist();selectView('recipes');$('recipe-title').focus();window.scrollTo({top:0,behavior:'smooth'});
  }
  function renderCatalog(){
    const query=$('picker-search').value.trim().toLowerCase();
    const foods=D.foods.filter(f=>[f.name,...f.aliases].some(n=>n.toLowerCase().includes(query)));
    $('food-catalog').innerHTML=foods.length?foods.map(f=>{
      const storage=f.shelf.fridge!==undefined?'fridge':'pantry',days=f.shelf[storage];
      return `<button class="catalog-food" data-food="${f.id}" aria-label="Choose ${esc(f.name)}"><img src="assets/foods/${f.id}.svg" alt="${esc(f.name)} illustration"><b>${esc(f.name)}</b><span>${esc(f.unit)} · ${f.grams} g<br>Est. ${Math.round(f.n[0]*f.grams/100)} kcal / unit<br>P ${fmt(f.n[1]*f.grams/100)} · C ${fmt(f.n[2]*f.grams/100)} · F ${fmt(f.n[3]*f.grams/100)} g<br>Est. ${days} days · ${storage==='fridge'?'refrigerated':'pantry'}</span><em>Customize & add ＋</em></button>`;
    }).join(''):'<p class="empty">Not in the list? Add a custom food below.</p>';
  }
  function openPicker(){ $('picker-search').value='';renderCatalog();$('picker-dialog').showModal(); }

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
  $('add').onclick=$('add-more').onclick=openPicker;$('search').addEventListener('input',renderInventory);
  $('inventory-filters').onclick=event=>{const b=event.target.closest('[data-filter]');if(!b)return;inventoryFilter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(el=>{el.classList.toggle('active',el===b);el.setAttribute('aria-pressed',el===b);});renderInventory();};
  $('preferences').onsubmit=e=>e.preventDefault();
  $('preferences').addEventListener('change',()=>{const min=Number($('min-cal').value),max=Number($('max-cal').value);$('max-cal').setCustomValidity(max<min?'Maximum calories must be at least the minimum.':'');if(!$('preferences').reportValidity())return;state.preferences={time:Number($('max-time').value),diet:$('diet').value,minCal:min,maxCal:max};delete state.menu;persist();renderRecipes();});
  document.addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b)return;
    if(b.matches('.close'))b.closest('dialog').close();
    if(b.dataset.page)selectView(b.dataset.page);
    if(b.hasAttribute('data-open-picker'))openPicker();
    if(b.dataset.food){$('picker-dialog').close();openIngredient();$('food').value=E.byId(b.dataset.food).name;recognize();}
    if(b.dataset.edit)openIngredient(b.dataset.edit);
    if(b.dataset.delete){state.inventory=state.inventory.filter(i=>i.id!==b.dataset.delete);changed();toast('Ingredient removed.');}
    if(b.dataset.recipe)openRecipe(b.dataset.recipe);
    if(b.id==='confirm-use'){
      if(!currentRecipe||b.disabled)return;b.disabled=true;
      try{const r=D.recipes.find(r=>r.id===currentRecipe);const next=E.deduct(r,state.inventory);previous=structuredClone(state.inventory);state.inventory=next;currentRecipe=null;persist();render();$('recipe-dialog').close();toast('Ingredients used. Your fridge is up to date.',true);}
      catch(error){$('deduction-error').textContent=error.message;b.disabled=false;}
    }
  });
  $('generate').onclick=$('regenerate').onclick=generateMenu;
  $('picker-search').addEventListener('input',renderCatalog);
  $('custom-food').onclick=()=>{$('picker-dialog').close();openIngredient();};
  document.querySelector('.brand').onclick=event=>{event.preventDefault();selectView('fridge');window.scrollTo({top:0,behavior:'smooth'});};
  $('undo').onclick=$('toast-undo').onclick=undo;
  $('about').onclick=event=>{event.preventDefault();$('about-dialog').showModal();};
  $('foods').innerHTML=D.foods.map(f=>`<option value="${esc(f.name)}"></option>`).join('');
  $('max-time').value=state.preferences.time;$('diet').value=state.preferences.diet;$('min-cal').value=state.preferences.minCal;$('max-cal').value=state.preferences.maxCal;
  // Invalidate an undo snapshot after inventory edits or another tab's changes.
  window.addEventListener('storage',event=>{if(event.key===KEY){state=load();previous=null;$('ingredient-dialog').close();$('recipe-dialog').close();$('picker-dialog').close();$('max-time').value=state.preferences.time;$('diet').value=state.preferences.diet;$('min-cal').value=state.preferences.minCal;$('max-cal').value=state.preferences.maxCal;render();toast('Your fridge was updated in another tab.');}});
  window.addEventListener('focus',render);setInterval(render,60000);render();
})();
