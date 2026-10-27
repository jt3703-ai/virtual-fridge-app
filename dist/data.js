/* Reference adapter: replace this dataset with a validated FDC import in a future version.
 * Nutrients: rounded USDA SR Legacy / FoodData Central values per 100 g edible food.
 * n = [kcal, protein g, carbohydrate g, fat g]. Weights are approximate UX portions.
 * Storage days: conservative defaults adapted from Nebraska Extension Home Food Storage;
 * null means no automatic prediction. See DATA_SOURCES.md for assumptions and limitations.
 */
(function (root) {
  'use strict';
  const foods = [
    ['eggs','Eggs','Protein','🥚','1 large egg',50,[143,12.56,.72,9.51],{fridge:21},'Raw eggs in shell; do not freeze in shell.',['egg']],
    ['spinach','Spinach','Vegetables','🥬','1 handful',30,[23,2.86,3.63,.39],{fridge:2},'Opened bag of raw greens.',['baby spinach']],
    ['tomato','Tomatoes','Vegetables','🍅','1 medium tomato',123,[18,.88,3.89,.2],{fridge:3},'Ripe whole tomatoes.',['tomato','cherry tomatoes']],
    ['avocado','Avocado','Fruit','🥑','1 medium avocado',150,[160,2,8.53,14.66],{fridge:3},'Ripe avocado; edible flesh only.',['avocados']],
    ['broccoli','Broccoli','Vegetables','🥦','1 portion (100 g)',100,[34,2.82,6.64,.37],{fridge:3},'Fresh raw broccoli. Freezing requires preparation. ',[]],
    ['carrot','Carrots','Vegetables','🥕','1 medium carrot',61,[41,.93,9.58,.24],{fridge:14},'Whole raw carrots.',['carrot']],
    ['pepper','Bell pepper','Vegetables','🫑','1 medium pepper',119,[31,.99,6.03,.3],{fridge:4},'Whole raw red sweet pepper.',['peppers','bell peppers','red pepper']],
    ['cucumber','Cucumber','Vegetables','🥒','1 medium cucumber',200,[15,.65,3.63,.11],{fridge:4},'Whole raw cucumber with peel.',['cucumbers']],
    ['chicken','Chicken breast','Protein','🍗','1 portion (150 g)',150,[120,22.5,0,2.62],{fridge:1,freezer:270},'Raw boneless skinless chicken breast; freezer days refer to quality.',['chicken']],
    ['tofu','Firm tofu','Protein','◻️','1 portion (100 g)',100,[144,17.3,2.78,8.72],{fridge:3},'Opened firm tofu; use package instructions if shorter.',['tofu']],
    ['chickpeas','Chickpeas','Protein','🫘','1 drained portion (100 g)',100,[139,7.05,22.53,2.77],{fridge:3},'Opened canned chickpeas, drained.',['chickpea']],
    ['tuna','Tuna','Protein','🐟','1 drained portion (100 g)',100,[116,25.51,0,.82],{fridge:3},'Opened canned light tuna in water, drained.',['canned tuna']],
    ['yogurt','Greek yogurt','Dairy','🥣','1 pot (170 g)',170,[59,10.19,3.6,.39],{fridge:7},'Plain nonfat Greek yogurt, opened.',['yogurt','yoghurt']],
    ['milk','Milk','Dairy','🥛','1 cup (244 g)',244,[61,3.15,4.8,3.25],{fridge:7,freezer:90},'Pasteurized whole milk. Freezer days refer to quality.',[]],
    ['feta','Feta cheese','Dairy','🧀','1 portion (30 g)',30,[264,14.21,4.09,21.28],{fridge:7},'Opened soft cheese; package date takes precedence.',['feta']],
    ['rice','Cooked brown rice','Grains','🍚','1 portion (100 g)',100,[123,2.74,25.58,.97],{fridge:3,freezer:30},'Previously cooked rice, promptly cooled and refrigerated.',['rice','brown rice']],
    ['pasta','Dry whole-wheat pasta','Grains','🍝','1 dry portion (75 g)',75,[352,13.87,72,2.93],{pantry:180},'Dry whole-wheat pasta. No automatic fridge prediction.',['pasta']],
    ['bread','Whole-wheat bread','Grains','🍞','1 slice (28 g)',28,[247,12.95,41.29,3.35],{pantry:3,freezer:90},'Commercial sliced whole-wheat bread.',['bread']],
    ['oats','Rolled oats','Grains','🌾','1 dry portion (40 g)',40,[379,13.15,67.7,6.52],{pantry:180},'Dry rolled oats in a sealed container.',['oatmeal','oats']],
    ['banana','Banana','Fruit','🍌','1 medium banana',118,[89,1.09,22.84,.33],{fridge:3},'Ripe banana; edible flesh only.',['bananas']],
    ['apple','Apple','Fruit','🍎','1 medium apple',182,[52,.26,13.81,.17],{fridge:28,pantry:21},'Whole fresh apple with skin.',['apples']],
    ['strawberries','Strawberries','Fruit','🍓','1 portion (100 g)',100,[32,.67,7.68,.3],{fridge:2},'Fresh whole strawberries.',['strawberry']],
    ['oil','Olive oil','Other','🫒','1 teaspoon (4.5 g)',4.5,[884,0,0,100],{pantry:90},'Opened olive oil stored cool and dark.',['oil']]
  ].map(([id,name,category,emoji,unit,grams,n,shelf,assumption,aliases])=>({id,name,category,emoji,unit,grams,n,shelf,assumption,aliases,source:'USDA SR Legacy, rounded; see DATA_SOURCES.md'}));

  const recipes = [
    ['green-omelette','The green-day omelette','A quick, protein-rich plate with tender greens and sweet tomatoes.',12,'vegetarian',1,[['eggs',2],['spinach',2],['tomato',1],['oil',1]]],
    ['avocado-toast','Avocado & egg toast','Creamy avocado, whole-grain crunch, and a satisfying protein boost.',10,'vegetarian',1,[['bread',2],['avocado',.5],['eggs',1]]],
    ['chickpea-bowl','Mediterranean chickpea bowl','Colorful, crisp, and ready for a lunch break that feels good.',10,'vegetarian',1,[['chickpeas',1.5],['cucumber',.5],['tomato',1],['feta',1],['oil',1]]],
    ['chicken-rice','Chicken & greens rice bowl','A simple mix of lean protein, whole grains, and green goodness.',20,'omnivore',1,[['chicken',1],['rice',1.5],['broccoli',1],['oil',1]]],
    ['tofu-bowl','Golden tofu & broccoli bowl','A plant-powered bowl with a hearty whole-grain base.',15,'vegan',1,[['tofu',1.5],['broccoli',1],['rice',1.5],['oil',1]]],
    ['overnight-oats','Berry good yogurt oats','A no-cook breakfast with fruit, fiber, and a little staying power.',5,'vegetarian',1,[['oats',1],['yogurt',1],['strawberries',1],['banana',.5]]],
    ['tomato-pasta','Tomato & spinach pasta','Whole-grain comfort with a fresh green twist.',20,'vegetarian',2,[['pasta',2],['tomato',3],['spinach',4],['feta',2],['oil',2]]],
    ['tuna-toast','Crunchy tuna lunch toast','An easy, high-protein lunch with a fresh cucumber crunch.',8,'omnivore',1,[['tuna',1],['bread',2],['cucumber',.5],['yogurt',.25]]],
    ['veggie-rice','Rainbow chickpea rice','A colorful one-bowl idea with plant protein and plenty of vegetables.',15,'vegan',1,[['chickpeas',1],['rice',1.5],['carrot',1],['pepper',1],['oil',1]]],
    ['apple-oats','Apple & banana breakfast bowl','A quick whole-grain start with naturally sweet fruit.',8,'vegetarian',1,[['oats',1],['milk',.5],['apple',.5],['banana',.5]]]
  ].map(([id,name,description,time,diet,servings,ingredients])=>({id,name,description,time,diet,servings,ingredients:ingredients.map(([food,units])=>({food,units})),image:`assets/recipes/${id}.svg`}));
  root.FridgeData={foods,recipes};
  if(typeof module!=='undefined') module.exports=root.FridgeData;
})(typeof globalThis!=='undefined'?globalThis:window);
