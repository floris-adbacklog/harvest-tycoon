import { a as e, i as t, r as n, t as r } from "./leaderboard-BigxBEvc.js";
var i = Object.freeze({
	corn: {
		name: "Corn",
		cost: 10,
		sell: 40,
		duration: 9e5,
		xp: 5,
		model: "plant_001",
		height: 1.55,
		use: "Animal feed"
	},
	wheat: {
		name: "Wheat",
		cost: 3,
		sell: 8,
		duration: 12e4,
		xp: 2,
		model: "plant_011",
		height: .85,
		use: "Flour & bread"
	},
	cabbage: {
		name: "Cabbage",
		cost: 40,
		sell: 110,
		duration: 72e5,
		xp: 12,
		model: "plant_004",
		height: .48,
		use: "Vegetable boxes"
	},
	pumpkin: {
		name: "Pumpkin",
		cost: 95,
		sell: 250,
		duration: 288e5,
		xp: 24,
		model: "plant_003",
		height: .8,
		use: "Pumpkin pies"
	},
	sunflower: {
		name: "Sunflower",
		cost: 180,
		sell: 480,
		duration: 864e5,
		xp: 45,
		model: "plant_007",
		height: 1.65,
		use: "Sunflower oil"
	},
	barley: {
		name: "Barley",
		cost: 20,
		sell: 85,
		duration: 27e5,
		xp: 8,
		model: "plant_010",
		height: 1.05,
		use: "Animal feed",
		art: "/assets/icons/barley.svg"
	},
	lettuce: {
		name: "Lettuce",
		cost: 7,
		sell: 20,
		duration: 3e5,
		xp: 3,
		model: "plant_005",
		height: .47,
		use: "Fresh salads",
		art: "/assets/icons/lettuce.svg"
	},
	redcabbage: {
		name: "Red cabbage",
		cost: 130,
		sell: 340,
		duration: 432e5,
		xp: 32,
		model: "plant_004",
		height: .6,
		use: "Pickled vegetables",
		art: "/assets/icons/redcabbage.svg",
		tint: 11955406
	},
	cauliflower: {
		name: "Cauliflower",
		cost: 65,
		sell: 175,
		duration: 144e5,
		xp: 18,
		model: "plant_005",
		height: .5,
		use: "Vegetable boxes"
	},
	greenbeans: {
		name: "Green beans",
		cost: 45,
		sell: 90,
		duration: 54e5,
		xp: 14,
		model: "plant_006",
		height: 1.25,
		use: "Vegetable stew",
		minLevel: 6
	},
	apples: {
		name: "Apples",
		cost: 700,
		sell: 100,
		duration: 432e5,
		regrow: 216e5,
		xp: 22,
		model: "tree_009",
		height: 1.8,
		use: "Apple juice & apple pie",
		minLevel: 8,
		perennial: !0
	},
	berries: {
		name: "Berries",
		cost: 1e3,
		sell: 130,
		duration: 288e5,
		regrow: 144e5,
		xp: 18,
		model: "bush_003",
		height: .95,
		use: "Berry preserves & berry tart",
		minLevel: 10,
		perennial: !0
	}
}), a = Object.freeze({
	honey: {
		name: "Honey",
		sell: 35,
		icon: "hexagon",
		color: "gold"
	},
	grainmeal: {
		name: "Grain meal",
		sell: 180,
		icon: "wheat",
		color: "wheat"
	},
	fertilizer: {
		name: "Natural fertilizer",
		sell: 260,
		icon: "sprout",
		color: "green"
	},
	salad: {
		name: "Fresh salad",
		sell: 450,
		icon: "salad",
		color: "green"
	},
	pickles: {
		name: "Pickled cabbage",
		sell: 1100,
		icon: "amphora",
		color: "coral"
	},
	flour: {
		name: "Flour",
		sell: 60,
		icon: "wheat",
		color: "wheat"
	},
	feed: {
		name: "Animal feed",
		sell: 115,
		icon: "package-open",
		color: "wheat"
	},
	oil: {
		name: "Sunflower oil",
		sell: 1600,
		icon: "droplet",
		color: "gold"
	},
	milk: {
		name: "Milk",
		sell: 80,
		icon: "milk",
		color: "blue"
	},
	eggs: {
		name: "Eggs",
		sell: 50,
		icon: "egg",
		color: "cream"
	},
	cheese: {
		name: "Cheese",
		sell: 230,
		icon: "sandwich",
		color: "gold"
	},
	bread: {
		name: "Fresh bread",
		sell: 340,
		icon: "croissant",
		color: "wheat"
	},
	pie: {
		name: "Fresh pumpkin pie",
		sell: 1250,
		icon: "cake-slice",
		color: "coral"
	},
	vegetables: {
		name: "Vegetable box",
		sell: 1700,
		icon: "salad",
		color: "green"
	},
	applejuice: {
		name: "Apple juice",
		sell: 650,
		icon: "package-check",
		color: "gold"
	},
	applepie: {
		name: "Apple pie",
		sell: 1200,
		icon: "package-check",
		color: "gold"
	},
	berrypreserves: {
		name: "Berry preserves",
		sell: 800,
		icon: "package-check",
		color: "gold"
	},
	berrytart: {
		name: "Berry tart",
		sell: 3e3,
		icon: "package-check",
		color: "gold"
	},
	stew: {
		name: "Vegetable stew",
		sell: 1100,
		icon: "package-check",
		color: "gold"
	},
	orchardjuice: {
		name: "Apple & Berry Juice",
		sell: 780,
		icon: "package-check",
		color: "gold"
	},
	berrysmoothie: {
		name: "Berry Smoothie",
		sell: 810,
		icon: "package-check",
		color: "gold"
	},
	applecompote: {
		name: "Honey Apple Compote",
		sell: 640,
		icon: "package-check",
		color: "gold"
	},
	applevinegar: {
		name: "Apple Vinegar",
		sell: 1150,
		icon: "package-check",
		color: "gold"
	},
	pickledbeans: {
		name: "Pickled Green Beans",
		sell: 4100,
		icon: "package-check",
		color: "gold"
	},
	beangratin: {
		name: "Green Bean Gratin",
		sell: 1650,
		icon: "package-check",
		color: "gold"
	},
	orchardsalad: {
		name: "Orchard Salad",
		sell: 1200,
		icon: "package-check",
		color: "gold"
	},
	berrycheesecake: {
		name: "Berry Cheesecake",
		sell: 2250,
		icon: "package-check",
		color: "gold"
	},
	harvesthamper: {
		name: "Harvest Hamper",
		sell: 5900,
		icon: "package-check",
		color: "gold"
	}
});
Object.freeze({
	...i,
	...a
}), Object.freeze({
	familyhall: {
		name: "Family Hall",
		tagline: "Grow together with your Farm Family.",
		icon: "users",
		model: "house_008",
		type: "family",
		minLevel: 10
	},
	farmhouse: {
		name: "Farmhouse",
		tagline: "Room for your next big idea.",
		icon: "house",
		model: "house_010",
		type: "farm",
		upgradeCost: 140
	},
	mill: {
		name: "Feed Mill",
		tagline: "Make animal feed and press golden sunflower oil.",
		icon: "factory",
		model: "hangar_003",
		type: "production",
		upgradeCost: 90
	},
	dairy: {
		name: "Dairy Barn",
		tagline: "Happy cows, fresh milk and farmhouse cheese.",
		icon: "milk",
		model: "hangar_004",
		type: "production",
		upgradeCost: 110
	},
	coop: {
		name: "Chicken Coop",
		tagline: "A little feed. A basket of fresh eggs.",
		icon: "egg",
		model: "coop_001",
		type: "production",
		upgradeCost: 75
	},
	bakery: {
		name: "Bakery",
		tagline: "Bake something worth coming home for.",
		icon: "croissant",
		model: "house_027",
		type: "production",
		upgradeCost: 130
	},
	packing: {
		name: "Packing Shed",
		tagline: "Pack your vegetables for a better price.",
		icon: "package-check",
		model: "house_030",
		type: "production",
		upgradeCost: 100
	},
	windmill: {
		name: "Windmill",
		tagline: "Mill grain, make natural fertilizer and help your crops grow.",
		icon: "wind",
		model: "tower_001",
		type: "production",
		upgradeCost: 180
	},
	kitchen: {
		name: "Farm Kitchen",
		tagline: "Turn fresh vegetables into a comforting bowl of stew.",
		icon: "cooking-pot",
		model: "house_011",
		type: "production",
		upgradeCost: 420,
		minLevel: 6,
		buildCost: 3500
	},
	juicepress: {
		name: "Juice Press",
		tagline: "Bottle the sweetness of your orchard.",
		icon: "cup-soda",
		model: "hangar_005",
		type: "production",
		upgradeCost: 600,
		minLevel: 8,
		buildCost: 6500
	},
	preserves: {
		name: "Preserves Workshop",
		tagline: "Berries and honey, saved for something special.",
		icon: "amphora",
		model: "hangar_002",
		type: "production",
		upgradeCost: 850,
		minLevel: 10,
		buildCost: 1e4
	}
}), Object.freeze({
	grainmeal: {
		building: "windmill",
		name: "Grind grain meal",
		input: {
			wheat: 8,
			barley: 4
		},
		output: { grainmeal: 3 },
		duration: 12e5,
		xp: 30
	},
	fertilizer: {
		building: "windmill",
		name: "Mix natural fertilizer",
		input: {
			grainmeal: 2,
			cabbage: 2
		},
		output: { fertilizer: 3 },
		duration: 18e5,
		xp: 40
	},
	windflour: {
		building: "windmill",
		name: "Mill a large flour batch",
		input: { grainmeal: 3 },
		output: { flour: 14 },
		duration: 72e4,
		xp: 24
	},
	windfeed: {
		building: "windmill",
		name: "Wind-milled barley feed",
		input: { barley: 8 },
		output: { feed: 10 },
		duration: 12e5,
		xp: 32
	},
	barleyfeed: {
		building: "mill",
		name: "Mix barley feed",
		input: { barley: 2 },
		output: { feed: 2 },
		duration: 12e4,
		xp: 6
	},
	salad: {
		building: "packing",
		name: "Prepare a fresh salad",
		input: {
			lettuce: 4,
			cabbage: 2
		},
		output: { salad: 1 },
		duration: 9e5,
		xp: 14
	},
	pickles: {
		building: "packing",
		name: "Pickle red cabbage",
		input: { redcabbage: 2 },
		output: { pickles: 1 },
		duration: 108e5,
		xp: 60
	},
	flour: {
		building: "windmill",
		name: "Refine grain meal into flour",
		input: { grainmeal: 1 },
		output: { flour: 4 },
		duration: 24e4,
		xp: 8
	},
	feed: {
		building: "mill",
		name: "Mix animal feed",
		input: { corn: 2 },
		output: { feed: 1 },
		duration: 12e4,
		xp: 4
	},
	oil: {
		building: "mill",
		name: "Press sunflower oil",
		input: { sunflower: 2 },
		output: { oil: 1 },
		duration: 144e5,
		xp: 80
	},
	milk: {
		building: "dairy",
		name: "Feed the cows",
		input: { feed: 1 },
		output: { milk: 2 },
		duration: 6e5,
		xp: 10
	},
	cheese: {
		building: "dairy",
		name: "Make farmhouse cheese",
		input: { milk: 2 },
		output: { cheese: 1 },
		duration: 36e5,
		xp: 24
	},
	eggs: {
		building: "coop",
		name: "Feed the chickens",
		input: { feed: 1 },
		output: { eggs: 3 },
		duration: 3e5,
		xp: 10
	},
	bread: {
		building: "bakery",
		name: "Bake fresh bread",
		input: {
			flour: 4,
			milk: 2
		},
		output: { bread: 2 },
		duration: 12e5,
		xp: 16
	},
	pie: {
		building: "bakery",
		name: "Bake fresh pumpkin pie",
		input: {
			flour: 2,
			pumpkin: 2,
			eggs: 2
		},
		output: { pie: 1 },
		duration: 72e5,
		xp: 50
	},
	vegetables: {
		building: "packing",
		name: "Pack a vegetable box",
		input: {
			cabbage: 4,
			cauliflower: 4
		},
		output: { vegetables: 1 },
		duration: 36e5,
		xp: 30
	},
	stew: {
		building: "kitchen",
		name: "Simmer vegetable stew",
		input: {
			greenbeans: 4,
			corn: 3,
			cabbage: 2
		},
		output: { stew: 1 },
		duration: 72e5,
		xp: 40,
		minLevel: 6
	},
	applejuice: {
		building: "juicepress",
		name: "Press apple juice",
		input: { apples: 4 },
		output: { applejuice: 1 },
		duration: 108e5,
		xp: 45,
		minLevel: 8
	},
	applepie: {
		building: "bakery",
		name: "Bake an apple pie",
		input: {
			apples: 4,
			flour: 4,
			eggs: 2
		},
		output: { applepie: 1 },
		duration: 144e5,
		xp: 55,
		minLevel: 8
	},
	berrypreserves: {
		building: "preserves",
		name: "Cook berry preserves",
		input: {
			berries: 4,
			honey: 3
		},
		output: { berrypreserves: 1 },
		duration: 108e5,
		xp: 50,
		minLevel: 10
	},
	berrytart: {
		building: "bakery",
		name: "Bake a berry tart",
		input: {
			berrypreserves: 2,
			flour: 4,
			eggs: 2
		},
		output: { berrytart: 1 },
		duration: 18e6,
		xp: 70,
		minLevel: 10,
		requiresBuildings: ["preserves"]
	},
	orchardjuice: {
		building: "juicepress",
		name: "Press apple and berry juice",
		input: {
			apples: 2,
			berries: 2
		},
		output: { orchardjuice: 1 },
		duration: 36e5,
		xp: 45,
		minLevel: 10
	},
	berrysmoothie: {
		building: "juicepress",
		name: "Blend a berry smoothie",
		input: {
			berries: 2,
			milk: 2,
			honey: 2
		},
		output: { berrysmoothie: 1 },
		duration: 54e5,
		xp: 48,
		minLevel: 10
	},
	applecompote: {
		building: "preserves",
		name: "Cook honey apple compote",
		input: {
			apples: 3,
			honey: 2
		},
		output: { applecompote: 1 },
		duration: 72e5,
		xp: 42,
		minLevel: 10
	},
	applevinegar: {
		building: "preserves",
		name: "Ferment apple vinegar",
		input: { applejuice: 1 },
		output: { applevinegar: 1 },
		duration: 216e5,
		xp: 90,
		minLevel: 10,
		requiresBuildings: ["juicepress"]
	},
	pickledbeans: {
		building: "preserves",
		name: "Pickle green beans",
		input: {
			greenbeans: 4,
			applevinegar: 2
		},
		output: { pickledbeans: 1 },
		duration: 108e5,
		xp: 80,
		minLevel: 10,
		requiresBuildings: ["juicepress"]
	},
	beangratin: {
		building: "kitchen",
		name: "Bake green bean gratin",
		input: {
			greenbeans: 4,
			cheese: 2,
			milk: 2
		},
		output: { beangratin: 1 },
		duration: 108e5,
		xp: 65,
		minLevel: 7
	},
	orchardsalad: {
		building: "packing",
		name: "Prepare an orchard salad",
		input: {
			apples: 2,
			lettuce: 4,
			cheese: 2
		},
		output: { orchardsalad: 1 },
		duration: 27e5,
		xp: 38,
		minLevel: 8
	},
	berrycheesecake: {
		building: "bakery",
		name: "Bake a berry cheesecake",
		input: {
			berries: 4,
			cheese: 2,
			flour: 4,
			eggs: 2
		},
		output: { berrycheesecake: 1 },
		duration: 144e5,
		xp: 85,
		minLevel: 11
	},
	harvesthamper: {
		building: "packing",
		name: "Pack a harvest hamper",
		input: {
			applejuice: 2,
			berrypreserves: 2,
			bread: 2
		},
		output: { harvesthamper: 1 },
		duration: 288e5,
		xp: 140,
		minLevel: 12,
		requiresBuildings: ["juicepress", "preserves"]
	}
}), Object.freeze([
	{
		id: "harvest",
		title: "Your first basket",
		description: "Harvest one ready crop. Tap the crop or its basket.",
		guide: "harvest",
		icon: "shopping-basket"
	},
	{
		id: "plant",
		title: "Plant a little possibility",
		description: "Select Wheat and plant it in an empty field. Seeds cost 3 coins.",
		guide: "plant",
		icon: "sprout"
	},
	{
		id: "water",
		title: "A little water goes a long way",
		description: "Use Water on one growing crop. It grows faster and gives an extra crop.",
		guide: "water",
		icon: "droplets"
	},
	{
		id: "sell",
		title: "Your first market sale",
		description: "Open Market and sell some corn. Save your animal feed for the chickens.",
		guide: "market",
		icon: "store"
	},
	{
		id: "produce",
		title: "Put your buildings to work",
		description: "Start a production batch. Try Feed the chickens in the Chicken Coop using your starter feed.",
		guide: "produce",
		icon: "egg"
	},
	{
		id: "gift",
		title: "A gift for showing up",
		description: "Open Today and collect your daily gift. Come back tomorrow to build your streak.",
		guide: "today",
		icon: "gift"
	},
	{
		id: "chore",
		title: "A helping hand",
		description: "Complete one Farm chore for extra coins while your crops and buildings work.",
		guide: "chores",
		icon: "shovel"
	},
	{
		id: "tend",
		title: "Good things need a little care",
		description: "Use Care on a growing crop once its care marker appears. Wheat needs about 36 seconds.",
		guide: "tend",
		icon: "leaf"
	},
	{
		id: "wheat",
		title: "Bring in the wheat",
		description: "Harvest one wheat field when it is ready. Water and care make your harvest bigger.",
		guide: "harvest",
		icon: "wheat"
	},
	{
		id: "collect",
		title: "Made on your farm",
		description: "Collect a finished batch from a building. Chicken feed becomes eggs in 5 minutes.",
		guide: "collect",
		icon: "package-check"
	}
]), Object.freeze([
	{
		title: "Your first harvest",
		description: "Harvest 3 crops from your fields.",
		stat: "harvested",
		target: 3,
		reward: 40
	},
	{
		title: "A little green thumb",
		description: "Plant 6 crops and let them grow.",
		stat: "planted",
		target: 6,
		reward: 65
	},
	{
		title: "Open for business",
		description: "Earn 120 coins at the market.",
		stat: "earned",
		target: 120,
		reward: 100
	},
	{
		title: "Made on the farm",
		description: "Collect 3 finished production batches.",
		stat: "produced",
		target: 3,
		reward: 100
	},
	{
		title: "A growing operation",
		description: "Upgrade a production building.",
		stat: "upgrades",
		target: 1,
		reward: 80
	},
	{
		title: "Room for more",
		description: "Expand your fields at the Farmhouse.",
		stat: "expansions",
		target: 1,
		reward: 100
	},
	{
		title: "From field to oven",
		description: "Collect 2 loaves of fresh bread.",
		stat: "bread",
		target: 2,
		reward: 120
	},
	{
		title: "Harvest tycoon",
		description: "Earn 1,000 coins at the market.",
		stat: "earned",
		target: 1e3,
		reward: 200
	},
	{
		title: "Wheat beginnings",
		description: "Harvest 12 wheat.",
		stat: "harvest_wheat",
		target: 12,
		reward: 65
	},
	{
		title: "A splash of care",
		description: "Water 20 crops.",
		stat: "watered",
		target: 20,
		reward: 90
	},
	{
		title: "The whole garden",
		description: "Discover 9 crop varieties by harvesting them.",
		stat: "varieties",
		target: 9,
		reward: 150
	},
	{
		title: "Fresh every morning",
		description: "Collect 10 milk.",
		stat: "made_milk",
		target: 10,
		reward: 110
	},
	{
		title: "Egg-cellent work",
		description: "Collect 18 eggs.",
		stat: "made_eggs",
		target: 18,
		reward: 110
	},
	{
		title: "Golden goodness",
		description: "Collect 3 sunflower oil.",
		stat: "made_oil",
		target: 3,
		reward: 130
	},
	{
		title: "Sweet success",
		description: "Collect 4 pumpkin pies.",
		stat: "made_pie",
		target: 4,
		reward: 180
	},
	{
		title: "The greener side",
		description: "Harvest 10 lettuce.",
		stat: "harvest_lettuce",
		target: 10,
		reward: 80
	},
	{
		title: "A colourful harvest",
		description: "Harvest 8 red cabbage.",
		stat: "harvest_redcabbage",
		target: 8,
		reward: 140
	},
	{
		title: "Freshly packed",
		description: "Collect 5 vegetable boxes.",
		stat: "made_vegetables",
		target: 5,
		reward: 160
	},
	{
		title: "Delivery day",
		description: "Complete 3 orders from the farm cart.",
		stat: "deliveries",
		target: 3,
		reward: 120
	},
	{
		title: "A helping hand",
		description: "Use the tractor 5 times.",
		stat: "tractor",
		target: 5,
		reward: 100
	},
	{
		title: "Built to last",
		description: "Upgrade production buildings 5 times.",
		stat: "upgrades",
		target: 5,
		reward: 180
	},
	{
		title: "A full field",
		description: "Harvest 100 crops.",
		stat: "harvested",
		target: 100,
		reward: 250
	},
	{
		title: "A farm favourite",
		description: "Collect 30 production batches.",
		stat: "produced",
		target: 30,
		reward: 200
	},
	{
		title: "A little every day",
		description: "Complete 6 daily challenges.",
		stat: "dailies",
		target: 6,
		reward: 160
	},
	{
		title: "Above and beyond",
		description: "Give 50 crops extra care.",
		stat: "tended",
		target: 50,
		reward: 300
	},
	{
		title: "A familiar face",
		description: "Complete 100 farm chores.",
		stat: "chores",
		target: 100,
		reward: 500
	},
	{
		title: "Roots for the future",
		description: "Complete your first estate project.",
		stat: "projects",
		target: 1,
		reward: 600
	},
	{
		title: "A specialist touch",
		description: "Claim 9 crop mastery medals.",
		stat: "mastery_medals",
		target: 9,
		reward: 1500
	},
	{
		title: "A thousand little harvests",
		description: "Harvest 1,000 fields.",
		stat: "harvested",
		target: 1e3,
		reward: 2500
	},
	{
		title: "From farm to estate",
		description: "Complete 6 estate projects.",
		stat: "projects",
		target: 6,
		reward: 8e3
	},
	{
		title: "Known across the valley",
		description: "Complete 100 delivery orders.",
		stat: "deliveries",
		target: 100,
		reward: 6e3
	},
	{
		title: "A lifelong grower",
		description: "Claim 36 crop mastery medals.",
		stat: "mastery_medals",
		target: 36,
		reward: 2e4
	},
	{
		title: "Catch the wind",
		description: "Collect your first production batch at the Windmill.",
		stat: "windmill_batches",
		target: 1,
		reward: 180
	},
	{
		title: "Grain with a purpose",
		description: "Make 3 grain meal at the Windmill.",
		stat: "made_grainmeal",
		target: 3,
		reward: 160
	},
	{
		title: "Fresh from the mill",
		description: "Refine grain meal into 12 flour for the Bakery.",
		stat: "made_flour",
		target: 12,
		reward: 200
	},
	{
		title: "A gentler way to grow",
		description: "Use natural fertilizer on 4 growing fields.",
		stat: "fertilized",
		target: 4,
		reward: 240
	},
	{
		title: "A sparkling streak",
		description: "Earn 10 diamonds from daily gifts.",
		stat: "diamonds_earned",
		target: 10,
		reward: 200
	},
	{
		title: "A little extra power",
		description: "Activate 2 boosts with earned diamonds.",
		stat: "boosts_used",
		target: 2,
		reward: 250
	},
	{
		title: "A stronger windmill",
		description: "Upgrade your Windmill to level 2.",
		stat: "windmill_upgrades",
		target: 1,
		reward: 200
	},
	{
		title: "From mill to oven",
		description: "Collect 12 fresh bread from the Bakery.",
		stat: "made_bread",
		target: 12,
		reward: 300
	},
	{
		title: "Pumpkin perfection",
		description: "Collect 6 fresh pumpkin pies from the Bakery.",
		stat: "made_pie",
		target: 6,
		reward: 400
	},
	{
		title: "A helping hand everywhere",
		description: "Complete 8 hands-on jobs.",
		stat: "activities",
		target: 8,
		reward: 180
	},
	{
		title: "Greenhouse regular",
		description: "Finish 10 Greenhouse jobs.",
		stat: "activity_greenhouse",
		target: 10,
		reward: 220
	},
	{
		title: "A taste of honey",
		description: "Finish 5 Apiary jobs.",
		stat: "activity_apiary",
		target: 5,
		reward: 180
	},
	{
		title: "The bee keeper",
		description: "Finish 30 Apiary jobs.",
		stat: "activity_apiary",
		target: 30,
		reward: 550
	},
	{
		title: "Happy animals",
		description: "Finish 10 Animal paddock jobs.",
		stat: "activity_paddock",
		target: 10,
		reward: 220
	},
	{
		title: "Tools in good hands",
		description: "Finish 10 Tool workshop jobs.",
		stat: "activity_workshop",
		target: 10,
		reward: 220
	},
	{
		title: "Around the farm",
		description: "Finish 3 full farm rounds by helping at all four stops.",
		stat: "activity_rounds",
		target: 3,
		reward: 300
	},
	{
		title: "A well-loved farm",
		description: "Finish 25 full farm rounds.",
		stat: "activity_rounds",
		target: 25,
		reward: 1600
	},
	{
		title: "Clear paths ahead",
		description: "Successfully clear the paths 10 times.",
		stat: "chore_weeds",
		target: 10,
		reward: 180
	},
	{
		title: "Water you can count on",
		description: "Successfully fill the water troughs 10 times.",
		stat: "chore_troughs",
		target: 10,
		reward: 350
	},
	{
		title: "Everything in its place",
		description: "Successfully sort the seed boxes 10 times.",
		stat: "chore_sorting",
		target: 10,
		reward: 650
	},
	{
		title: "Working side by side",
		description: "Start 5 batches while another batch is still running in the same building.",
		stat: "parallel_batches",
		target: 5,
		reward: 250
	},
	{
		title: "An efficient workshop",
		description: "Start 50 batches while another batch is still running in the same building.",
		stat: "parallel_batches",
		target: 50,
		reward: 1400
	},
	{
		title: "Good soil, good harvests",
		description: "Collect 15 natural fertilizer from production.",
		stat: "made_fertilizer",
		target: 15,
		reward: 300
	},
	{
		title: "Food for the farm",
		description: "Collect 30 animal feed from production.",
		stat: "made_feed",
		target: 30,
		reward: 350
	},
	{
		title: "Fresh combinations",
		description: "Collect 10 fresh salads.",
		stat: "made_salad",
		target: 10,
		reward: 400
	},
	{
		title: "A pantry worth keeping",
		description: "Collect 10 pickled cabbage.",
		stat: "made_pickles",
		target: 10,
		reward: 600
	},
	{
		title: "Sweet deliveries",
		description: "Complete 5 delivery orders containing Honey.",
		stat: "honey_deliveries",
		target: 5,
		reward: 300
	},
	{
		title: "Crafted with care",
		description: "Complete 15 delivery orders containing processed farm goods.",
		stat: "crafted_deliveries",
		target: 15,
		reward: 600
	},
	{
		title: "A familiar daily rhythm",
		description: "Complete 30 daily challenges.",
		stat: "dailies",
		target: 30,
		reward: 600
	},
	{
		title: "The roadside regular",
		description: "Collect 2,000 coins from the farm stall.",
		stat: "passive_earned",
		target: 2e3,
		reward: 400
	},
	{
		title: "Prepared for the season",
		description: "Upgrade silo research 3 times.",
		stat: "silo_upgrades",
		target: 3,
		reward: 400
	},
	{
		title: "Wheat specialist",
		description: "Harvest 100 wheat.",
		stat: "harvest_wheat",
		target: 100,
		reward: 300
	},
	{
		title: "Corn specialist",
		description: "Harvest 75 corn.",
		stat: "harvest_corn",
		target: 75,
		reward: 500
	},
	{
		title: "Lettuce specialist",
		description: "Harvest 100 lettuce.",
		stat: "harvest_lettuce",
		target: 100,
		reward: 300
	},
	{
		title: "Barley specialist",
		description: "Harvest 60 barley.",
		stat: "harvest_barley",
		target: 60,
		reward: 500
	},
	{
		title: "Cabbage specialist",
		description: "Harvest 40 cabbage.",
		stat: "harvest_cabbage",
		target: 40,
		reward: 500
	},
	{
		title: "Cauliflower specialist",
		description: "Harvest 30 cauliflower.",
		stat: "harvest_cauliflower",
		target: 30,
		reward: 500
	},
	{
		title: "Pumpkin specialist",
		description: "Harvest 25 pumpkin.",
		stat: "harvest_pumpkin",
		target: 25,
		reward: 500
	},
	{
		title: "Red cabbage specialist",
		description: "Harvest 20 red cabbage.",
		stat: "harvest_redcabbage",
		target: 20,
		reward: 500
	},
	{
		title: "Sunflower specialist",
		description: "Harvest 15 sunflower.",
		stat: "harvest_sunflower",
		target: 15,
		reward: 500
	},
	{
		title: "Green beans beginnings",
		description: "Harvest 12 green beans.",
		stat: "harvest_greenbeans",
		target: 12,
		reward: 500
	},
	{
		title: "Apples beginnings",
		description: "Harvest 12 apples.",
		stat: "harvest_apples",
		target: 12,
		reward: 500
	},
	{
		title: "Berries beginnings",
		description: "Harvest 12 berries.",
		stat: "harvest_berries",
		target: 12,
		reward: 500
	},
	{
		title: "Open the Farm Kitchen",
		description: "Open the Farm Kitchen.",
		stat: "built_kitchen",
		target: 1,
		reward: 400
	},
	{
		title: "Open the Juice Press",
		description: "Open the Juice Press.",
		stat: "built_juicepress",
		target: 1,
		reward: 400
	},
	{
		title: "Open the Preserves Workshop",
		description: "Open the Preserves Workshop.",
		stat: "built_preserves",
		target: 1,
		reward: 400
	},
	{
		title: "Vegetable stew specialist",
		description: "Produce 6 vegetable stew.",
		stat: "made_stew",
		target: 6,
		reward: 1200
	},
	{
		title: "Apple juice specialist",
		description: "Produce 6 apple juice.",
		stat: "made_applejuice",
		target: 6,
		reward: 1200
	},
	{
		title: "Apple pie specialist",
		description: "Produce 6 apple pie.",
		stat: "made_applepie",
		target: 6,
		reward: 1200
	},
	{
		title: "Berry preserves specialist",
		description: "Produce 6 berry preserves.",
		stat: "made_berrypreserves",
		target: 6,
		reward: 1200
	},
	{
		title: "Berry tart specialist",
		description: "Produce 6 berry tart.",
		stat: "made_berrytart",
		target: 6,
		reward: 1200
	},
	{
		title: "Twelve tastes of the valley",
		description: "Discover all 12 crops by harvesting them.",
		stat: "varieties",
		target: 12,
		reward: 2e3
	},
	{
		title: "A complete crop collection",
		description: "Claim all 48 crop mastery medals.",
		stat: "mastery_medals",
		target: 48,
		reward: 3e4
	},
	{
		title: "Apple & Berry Juice specialist",
		description: "Collect 3 batches of Apple & Berry Juice.",
		stat: "made_orchardjuice",
		target: 3,
		reward: 310
	},
	{
		title: "Berry Smoothie specialist",
		description: "Collect 3 batches of Berry Smoothie.",
		stat: "made_berrysmoothie",
		target: 3,
		reward: 300
	},
	{
		title: "Honey Apple Compote specialist",
		description: "Collect 3 batches of Honey Apple Compote.",
		stat: "made_applecompote",
		target: 3,
		reward: 300
	},
	{
		title: "Apple Vinegar specialist",
		description: "Collect 3 batches of Apple Vinegar.",
		stat: "made_applevinegar",
		target: 3,
		reward: 460
	},
	{
		title: "Pickled Green Beans specialist",
		description: "Collect 3 batches of Pickled Green Beans.",
		stat: "made_pickledbeans",
		target: 3,
		reward: 980
	},
	{
		title: "Green Bean Gratin specialist",
		description: "Collect 3 batches of Green Bean Gratin.",
		stat: "made_beangratin",
		target: 3,
		reward: 660
	},
	{
		title: "Orchard Salad specialist",
		description: "Collect 3 batches of Orchard Salad.",
		stat: "made_orchardsalad",
		target: 3,
		reward: 340
	},
	{
		title: "Berry Cheesecake specialist",
		description: "Collect 3 batches of Berry Cheesecake.",
		stat: "made_berrycheesecake",
		target: 3,
		reward: 900
	},
	{
		title: "Harvest Hamper specialist",
		description: "Collect 3 batches of Harvest Hamper.",
		stat: "made_harvesthamper",
		target: 3,
		reward: 2360
	}
]), Object.freeze([
	25,
	45,
	75,
	110,
	160,
	225,
	300,
	400,
	525
]);
var o = 864e5;
Object.freeze([
	2,
	2,
	4
]), Object.freeze([
	{
		amount: 50,
		price: "€1.99"
	},
	{
		amount: 300,
		price: "€9.99"
	},
	{
		amount: 1e3,
		price: "€24.99"
	}
]), Object.freeze({
	xp: {
		name: "Double XP",
		cost: 25,
		duration: 18e5,
		art: "xp",
		description: "Earn twice the XP from farm actions for 30 minutes."
	},
	coins: {
		name: "Double earnings",
		cost: 60,
		duration: 18e5,
		art: "coins",
		description: "Double your market sales and delivery coins for 30 minutes. Passive income and gifts stay the same."
	},
	crops: {
		name: "Instant harvest",
		cost: 90,
		art: "seeds",
		description: "Make every currently growing crop ready to harvest. Crops stay in their fields until you collect them."
	},
	upgrade: {
		name: "Builder’s discount",
		cost: 150,
		art: "hammer",
		description: "Save 50% of the coin cost on your next production-building upgrade. One voucher at a time; it never expires."
	},
	production: {
		name: "Finish production",
		cost: 75,
		art: "boost",
		description: "Finish all current production batches instantly. Collect the finished goods from their buildings."
	}
});
var s = [
	[
		{
			stat: "harvested",
			target: 8,
			title: "Bring in the harvest",
			description: "Harvest 8 crops.",
			reward: 45
		},
		{
			stat: "watered",
			target: 8,
			title: "A little extra care",
			description: "Water 8 growing crops.",
			reward: 40
		},
		{
			stat: "planted",
			target: 10,
			title: "A fresh start",
			description: "Plant 10 crops.",
			reward: 45
		}
	],
	[
		{
			stat: "produced",
			target: 2,
			title: "Busy little buildings",
			description: "Collect 2 production batches.",
			reward: 55
		},
		{
			stat: "made_milk",
			target: 4,
			title: "Fresh from the barn",
			description: "Collect 4 milk.",
			reward: 60
		},
		{
			stat: "made_eggs",
			target: 6,
			title: "The morning basket",
			description: "Collect 6 eggs.",
			reward: 55
		}
	],
	[
		{
			stat: "earned",
			target: 120,
			title: "Market day",
			description: "Earn 120 coins from sales or deliveries.",
			reward: 55
		},
		{
			stat: "deliveries",
			target: 1,
			title: "Special delivery",
			description: "Complete an order at the farm cart.",
			reward: 60
		},
		{
			stat: "harvest_wheat",
			target: 6,
			title: "Golden fields",
			description: "Harvest 6 wheat.",
			reward: 45
		}
	]
], c = [
	[
		{
			stat: "harvest_greenbeans",
			target: 3,
			title: "Green beans baskets",
			description: "Harvest 3 green beans.",
			reward: 140,
			minLevel: 6
		},
		{
			stat: "harvest_apples",
			target: 3,
			title: "Apples baskets",
			description: "Harvest 3 apples.",
			reward: 140,
			minLevel: 8
		},
		{
			stat: "harvest_berries",
			target: 3,
			title: "Berries baskets",
			description: "Harvest 3 berries.",
			reward: 140,
			minLevel: 10
		}
	],
	[
		{
			stat: "made_stew",
			target: 1,
			title: "Vegetable stew day",
			description: "Collect 1 vegetable stew.",
			reward: 200,
			minLevel: 6,
			requiresBuildings: ["kitchen"]
		},
		{
			stat: "made_applejuice",
			target: 1,
			title: "Apple juice day",
			description: "Collect 1 apple juice.",
			reward: 200,
			minLevel: 8,
			requiresBuildings: ["juicepress"]
		},
		{
			stat: "made_berrypreserves",
			target: 1,
			title: "Berry preserves day",
			description: "Collect 1 berry preserves.",
			reward: 200,
			minLevel: 10,
			requiresBuildings: ["preserves"]
		}
	],
	[{
		stat: "made_applepie",
		target: 1,
		title: "Apple pie baking",
		description: "Collect 1 apple pie.",
		reward: 280,
		minLevel: 8,
		requiresBuildings: []
	}, {
		stat: "made_berrytart",
		target: 1,
		title: "Berry tart baking",
		description: "Collect 1 berry tart.",
		reward: 280,
		minLevel: 10,
		requiresBuildings: ["preserves"]
	}]
], l = [
	[
		{
			stat: "made_orchardjuice",
			target: 1,
			title: "Apple & Berry Juice day",
			description: "Collect 1 batch of Apple & Berry Juice.",
			reward: 150,
			minLevel: 10,
			requiresBuildings: ["juicepress"]
		},
		{
			stat: "made_berrysmoothie",
			target: 1,
			title: "Berry Smoothie day",
			description: "Collect 1 batch of Berry Smoothie.",
			reward: 150,
			minLevel: 10,
			requiresBuildings: ["juicepress"]
		},
		{
			stat: "made_orchardsalad",
			target: 1,
			title: "Orchard Salad day",
			description: "Collect 1 batch of Orchard Salad.",
			reward: 150,
			minLevel: 8,
			requiresBuildings: []
		}
	],
	[
		{
			stat: "made_applecompote",
			target: 1,
			title: "Honey Apple Compote day",
			description: "Collect 1 batch of Honey Apple Compote.",
			reward: 200,
			minLevel: 10,
			requiresBuildings: ["preserves"]
		},
		{
			stat: "made_pickledbeans",
			target: 1,
			title: "Pickled Green Beans day",
			description: "Collect 1 batch of Pickled Green Beans.",
			reward: 200,
			minLevel: 10,
			requiresBuildings: ["preserves", "juicepress"]
		},
		{
			stat: "made_beangratin",
			target: 1,
			title: "Green Bean Gratin day",
			description: "Collect 1 batch of Green Bean Gratin.",
			reward: 200,
			minLevel: 7,
			requiresBuildings: ["kitchen"]
		},
		{
			stat: "made_berrycheesecake",
			target: 1,
			title: "Berry Cheesecake day",
			description: "Collect 1 batch of Berry Cheesecake.",
			reward: 200,
			minLevel: 11,
			requiresBuildings: []
		}
	],
	[{
		stat: "made_applevinegar",
		target: 1,
		title: "Apple Vinegar day",
		description: "Collect 1 batch of Apple Vinegar.",
		reward: 250,
		minLevel: 10,
		requiresBuildings: ["preserves", "juicepress"]
	}, {
		stat: "made_harvesthamper",
		target: 1,
		title: "Harvest Hamper day",
		description: "Collect 1 batch of Harvest Hamper.",
		reward: 250,
		minLevel: 12,
		requiresBuildings: ["juicepress", "preserves"]
	}]
];
s.map((e, t) => Object.freeze([
	...e,
	...c[t],
	...l[t],
	...[
		[
			{
				stat: "activity_greenhouse",
				target: 2,
				title: "Seedling care",
				description: "Finish 2 Greenhouse jobs.",
				reward: 65
			},
			{
				stat: "activity_paddock",
				target: 2,
				title: "Happy herd",
				description: "Finish 2 Animal paddock jobs.",
				reward: 65
			},
			{
				stat: "chore_weeds",
				target: 3,
				title: "A tidy start",
				description: "Successfully clear the paths 3 times.",
				reward: 70
			},
			{
				stat: "tended",
				target: 4,
				title: "More than watering",
				description: "Give 4 growing crops extra care.",
				reward: 65
			},
			{
				stat: "harvest_lettuce",
				target: 8,
				title: "Leafy little harvest",
				description: "Harvest 8 lettuce.",
				reward: 55
			},
			{
				stat: "harvest_corn",
				target: 6,
				title: "Golden corn",
				description: "Harvest 6 corn.",
				reward: 65
			}
		],
		[
			{
				stat: "activity_apiary",
				target: 3,
				title: "Honey time",
				description: "Finish 3 Apiary jobs and collect their Honey.",
				reward: 85
			},
			{
				stat: "activity_workshop",
				target: 3,
				title: "Tools of the trade",
				description: "Finish 3 Tool workshop jobs.",
				reward: 85
			},
			{
				stat: "made_feed",
				target: 3,
				title: "Feed the farm",
				description: "Collect 3 animal feed from production.",
				reward: 80
			},
			{
				stat: "parallel_batches",
				target: 2,
				title: "Side by side",
				description: "Start 2 batches while another batch is still running in the same building.",
				reward: 90,
				parallel: !0
			},
			{
				stat: "fertilized",
				target: 2,
				title: "A soil boost",
				description: "Use natural fertilizer on 2 growing fields.",
				reward: 80,
				minLevel: 3
			},
			{
				stat: "made_flour",
				target: 4,
				title: "Flour power",
				description: "Collect 4 flour from production.",
				reward: 80,
				minLevel: 3
			},
			{
				stat: "made_salad",
				target: 1,
				title: "Freshly prepared",
				description: "Collect 1 fresh salad.",
				reward: 90,
				minLevel: 4
			}
		],
		[
			{
				stat: "activity_rounds",
				target: 1,
				title: "Make the rounds",
				description: "Finish a full farm round by helping at all four stops.",
				reward: 110
			},
			{
				stat: "activities",
				target: 6,
				title: "A hands-on day",
				description: "Finish 6 hands-on jobs around the farm.",
				reward: 110
			},
			{
				stat: "chore_troughs",
				target: 2,
				title: "Fresh water rounds",
				description: "Successfully fill the water troughs twice.",
				reward: 110,
				chore: "troughs"
			},
			{
				stat: "chore_sorting",
				target: 1,
				title: "Everything sorted",
				description: "Successfully sort the seed boxes once.",
				reward: 140,
				chore: "sorting"
			},
			{
				stat: "made_bread",
				target: 2,
				title: "Warm from the oven",
				description: "Collect 2 fresh bread.",
				reward: 100,
				minLevel: 4
			},
			{
				stat: "passive_earned",
				target: 30,
				title: "Roadside trade",
				description: "Collect 30 coins from the farm stall.",
				reward: 80,
				minLevel: 3
			}
		]
	][t]
])), Object.freeze([
	{
		title: "The baker next door",
		input: { wheat: 5 },
		xp: 15,
		minLevel: 1
	},
	{
		title: "A leafy lunch",
		input: {
			lettuce: 4,
			corn: 2
		},
		xp: 20,
		minLevel: 1
	},
	{
		title: "Sweet little favour",
		input: {
			honey: 2,
			wheat: 4
		},
		xp: 20,
		minLevel: 1
	},
	{
		title: "Breakfast at the inn",
		input: {
			eggs: 3,
			milk: 2
		},
		xp: 25,
		minLevel: 1
	},
	{
		title: "The paddock pantry",
		input: {
			feed: 2,
			corn: 2
		},
		xp: 25,
		minLevel: 1
	},
	{
		title: "Honey on toast",
		input: {
			honey: 2,
			bread: 2
		},
		xp: 35,
		minLevel: 3
	},
	{
		title: "A cream tea",
		input: {
			honey: 3,
			milk: 2,
			bread: 1
		},
		xp: 35,
		minLevel: 3
	},
	{
		title: "The village grocer",
		input: {
			corn: 3,
			lettuce: 2,
			cabbage: 1
		},
		xp: 25,
		minLevel: 3
	},
	{
		title: "The millers basket",
		input: {
			grainmeal: 2,
			flour: 4
		},
		xp: 30,
		minLevel: 3
	},
	{
		title: "For the garden club",
		input: {
			fertilizer: 2,
			lettuce: 4
		},
		xp: 30,
		minLevel: 3
	},
	{
		title: "The animal sanctuary",
		input: {
			feed: 3,
			barley: 3
		},
		xp: 30,
		minLevel: 3
	},
	{
		title: "A picnic in the park",
		input: {
			bread: 2,
			salad: 1,
			honey: 1
		},
		xp: 40,
		minLevel: 4
	},
	{
		title: "The cheese board",
		input: {
			cheese: 2,
			bread: 1
		},
		xp: 35,
		minLevel: 4
	},
	{
		title: "A farm-fresh lunch",
		input: {
			salad: 2,
			eggs: 3
		},
		xp: 35,
		minLevel: 4
	},
	{
		title: "Sunday lunch",
		input: {
			cabbage: 2,
			pumpkin: 2
		},
		xp: 35,
		minLevel: 5
	},
	{
		title: "The harvest kitchen",
		input: {
			vegetables: 1,
			flour: 3
		},
		xp: 45,
		minLevel: 5
	},
	{
		title: "A golden afternoon",
		input: {
			pie: 1,
			honey: 2,
			milk: 2
		},
		xp: 50,
		minLevel: 6
	},
	{
		title: "Autumn pantry",
		input: {
			redcabbage: 2,
			cauliflower: 2
		},
		xp: 40,
		minLevel: 6
	},
	{
		title: "The village feast",
		input: {
			bread: 3,
			cheese: 2,
			vegetables: 1
		},
		xp: 65,
		minLevel: 7
	},
	{
		title: "Pantry provisions",
		input: {
			pickles: 1,
			vegetables: 1
		},
		xp: 55,
		minLevel: 7
	},
	{
		title: "A chefs finishing touch",
		input: {
			oil: 1,
			salad: 2,
			honey: 2
		},
		xp: 65,
		minLevel: 8
	},
	{
		title: "Golden harvest hamper",
		input: {
			sunflower: 2,
			oil: 1
		},
		xp: 60,
		minLevel: 8
	},
	{
		title: "The autumn festival",
		input: {
			pie: 2,
			pickles: 1,
			honey: 3
		},
		xp: 75,
		minLevel: 8
	},
	{
		title: "The estate banquet",
		input: {
			oil: 1,
			vegetables: 2,
			cheese: 2,
			bread: 2
		},
		xp: 85,
		minLevel: 10
	},
	{
		title: "The kitchen garden",
		input: {
			stew: 2,
			bread: 2
		},
		xp: 80,
		minLevel: 6,
		requiresBuildings: ["kitchen"]
	},
	{
		title: "An orchard picnic",
		input: {
			applejuice: 2,
			applepie: 1
		},
		xp: 110,
		minLevel: 8,
		requiresBuildings: ["juicepress"]
	},
	{
		title: "Breakfast preserves",
		input: {
			berrypreserves: 2,
			bread: 3
		},
		xp: 120,
		minLevel: 10,
		requiresBuildings: ["preserves"]
	},
	{
		title: "The orchard tea room",
		input: {
			berrytart: 2,
			applepie: 2
		},
		xp: 160,
		minLevel: 10,
		requiresBuildings: ["preserves"]
	},
	{
		title: "A colourful orchard refreshment",
		input: {
			orchardjuice: 1,
			bread: 2
		},
		xp: 65,
		minLevel: 10,
		requiresBuildings: ["juicepress"]
	},
	{
		title: "Smoothies for the village",
		input: {
			berrysmoothie: 1,
			bread: 2
		},
		xp: 68,
		minLevel: 10,
		requiresBuildings: ["juicepress"]
	},
	{
		title: "A honey-sweet breakfast",
		input: {
			applecompote: 1,
			bread: 2
		},
		xp: 62,
		minLevel: 10,
		requiresBuildings: ["preserves"]
	},
	{
		title: "The pickling pantry",
		input: {
			applevinegar: 1,
			bread: 2
		},
		xp: 80,
		minLevel: 10,
		requiresBuildings: ["preserves", "juicepress"]
	},
	{
		title: "Beans for the village deli",
		input: {
			pickledbeans: 1,
			bread: 2
		},
		xp: 100,
		minLevel: 10,
		requiresBuildings: ["preserves", "juicepress"]
	},
	{
		title: "A warming farm supper",
		input: {
			beangratin: 1,
			bread: 2
		},
		xp: 85,
		minLevel: 7,
		requiresBuildings: ["kitchen"]
	},
	{
		title: "Lunch under the apple trees",
		input: {
			orchardsalad: 1,
			bread: 2
		},
		xp: 58,
		minLevel: 8,
		requiresBuildings: []
	},
	{
		title: "Cheesecake at the tea room",
		input: {
			berrycheesecake: 1,
			honey: 2
		},
		xp: 105,
		minLevel: 11,
		requiresBuildings: []
	},
	{
		title: "A gift from the valley",
		input: {
			harvesthamper: 1,
			honey: 2
		},
		xp: 160,
		minLevel: 12,
		requiresBuildings: ["juicepress", "preserves"]
	}
]), Object.freeze([
	{
		title: "The village breakfast",
		customer: "Village Inn",
		story: "A full house of guests needs a hearty farm breakfast.",
		input: {
			milk: 8,
			eggs: 12,
			flour: 8
		},
		xp: 75,
		minLevel: 1
	},
	{
		title: "A countryside picnic",
		customer: "Valley School",
		story: "Pack fresh supplies for the children’s countryside outing.",
		input: {
			milk: 6,
			eggs: 9,
			honey: 6
		},
		xp: 80,
		minLevel: 1
	},
	{
		title: "The baker’s big weekend",
		customer: "Willow Bakery",
		story: "Help the bakery prepare a whole counter of fresh treats.",
		input: {
			bread: 6,
			flour: 12,
			milk: 6
		},
		xp: 110,
		minLevel: 4
	},
	{
		title: "Lunch in the village square",
		customer: "Village Kitchen",
		story: "The village is gathering for a farm-to-table lunch.",
		input: {
			salad: 4,
			cheese: 6,
			bread: 4
		},
		xp: 120,
		minLevel: 4
	},
	{
		title: "The golden harvest festival",
		customer: "Harvest Festival",
		story: "Fill the festival pantry with your finest golden produce.",
		input: {
			oil: 3,
			pie: 3,
			honey: 8
		},
		xp: 160,
		minLevel: 8
	},
	{
		title: "The winter pantry",
		customer: "Valley Grocer",
		story: "Stock the village shelves with a generous assortment of farm goods.",
		input: {
			vegetables: 3,
			pickles: 4,
			cheese: 6
		},
		xp: 170,
		minLevel: 8
	},
	{
		title: "The grand estate banquet",
		customer: "Hilltop Estate",
		story: "A special celebration calls for an impressive farm-made feast.",
		input: {
			oil: 4,
			vegetables: 4,
			pie: 3,
			bread: 8
		},
		xp: 220,
		minLevel: 12
	},
	{
		title: "The valley food fair",
		customer: "Valley Food Fair",
		story: "Bring a showcase of your best goods to the annual food fair.",
		input: {
			pickles: 5,
			oil: 3,
			cheese: 8,
			vegetables: 3
		},
		xp: 230,
		minLevel: 12
	},
	{
		title: "The orchard opening",
		customer: "Valley Orchard Fair",
		story: "Serve the fair a fresh taste of the orchard.",
		input: {
			applejuice: 4,
			applepie: 3,
			stew: 3
		},
		xp: 300,
		minLevel: 14,
		requiresBuildings: ["juicepress", "kitchen"]
	},
	{
		title: "The summer preserve festival",
		customer: "Village Summer Festival",
		story: "Celebrate the season with honey-sweet preserves and berry baking.",
		input: {
			berrypreserves: 5,
			berrytart: 4,
			applejuice: 3
		},
		xp: 380,
		minLevel: 16,
		requiresBuildings: ["preserves", "juicepress"]
	},
	{
		title: "The valley gift collection",
		customer: "Valley Gift Shop",
		story: "Pack two complete farm-made hampers for the village celebration.",
		input: { harvesthamper: 2 },
		xp: 420,
		minLevel: 16,
		requiresBuildings: ["juicepress", "preserves"]
	},
	{
		title: "The orchard dessert reception",
		customer: "Hilltop Tea Room",
		story: "Bring a colourful dessert table to the orchard reception.",
		input: {
			berrycheesecake: 3,
			applecompote: 3,
			orchardjuice: 3
		},
		xp: 380,
		minLevel: 16,
		requiresBuildings: ["preserves", "juicepress"]
	},
	{
		title: "A feast from the kitchen garden",
		customer: "Village Supper Club",
		story: "Prepare warm dishes, crisp pickles and fresh orchard salads for the supper club.",
		input: {
			beangratin: 3,
			pickledbeans: 3,
			orchardsalad: 3
		},
		xp: 400,
		minLevel: 16,
		requiresBuildings: [
			"kitchen",
			"preserves",
			"juicepress"
		]
	}
]), Object.freeze({
	quick: {
		name: "Quick delivery",
		minBonus: 25,
		maxBonus: 40
	},
	village: {
		name: "Village order",
		minBonus: 45,
		maxBonus: 70
	},
	commission: {
		name: "Special commission",
		minBonus: 90,
		maxBonus: 125
	}
});
var u = [
	{
		name: "Bronze",
		target: 25,
		coins: 100,
		xp: 25
	},
	{
		name: "Silver",
		target: 100,
		coins: 350,
		xp: 60
	},
	{
		name: "Gold",
		target: 300,
		coins: 1200,
		xp: 150
	},
	{
		name: "Platinum",
		target: 1e3,
		coins: 4e3,
		xp: 400
	}
];
Object.freeze({
	weeds: {
		name: "Clear the paths",
		description: "Pull weeds along the farm paths.",
		icon: "shovel",
		coins: 18,
		xp: 4,
		cooldown: 6e4,
		baseChance: 60,
		maxChance: 100
	},
	troughs: {
		name: "Fill the water troughs",
		description: "Fresh water for the animals.",
		icon: "droplets",
		coins: 40,
		xp: 8,
		cooldown: 18e4,
		baseChance: 40,
		maxChance: 80,
		requires: "weeds"
	},
	sorting: {
		name: "Sort the seed boxes",
		description: "Get tomorrow’s planting ready.",
		icon: "package-open",
		coins: 90,
		xp: 16,
		cooldown: 48e4,
		baseChance: 35,
		maxChance: 60,
		requires: "troughs"
	},
	fences: {
		name: "Mend the orchard fence",
		description: "Repair loose rails and keep the orchard safe.",
		icon: "fence",
		coins: 180,
		xp: 35,
		cooldown: 9e5,
		baseChance: 30,
		maxChance: 70,
		requires: "sorting"
	},
	irrigation: {
		name: "Restore the irrigation",
		description: "Clear the channels and bring water to the far fields.",
		icon: "waves",
		coins: 330,
		xp: 65,
		cooldown: 15e5,
		baseChance: 25,
		maxChance: 65,
		requires: "fences"
	},
	harvestfair: {
		name: "Prepare the harvest fair",
		description: "Arrange a prize-worthy display of the farm’s best goods.",
		icon: "party-popper",
		coins: 600,
		xp: 120,
		cooldown: 27e5,
		baseChance: 20,
		maxChance: 60,
		requires: "irrigation"
	}
}), Object.freeze([
	10,
	20,
	35,
	50,
	75,
	100
]), Object.freeze([
	{
		name: "Rooted homestead",
		description: "Build a dependable home for your growing farm.",
		coins: 600,
		input: {
			wheat: 40,
			milk: 12
		},
		medals: 0,
		duration: 72e5,
		xp: 250
	},
	{
		name: "Village supplier",
		description: "Become the village’s everyday source of fresh food.",
		coins: 3e3,
		input: {
			corn: 40,
			eggs: 36,
			bread: 20
		},
		medals: 1,
		duration: 288e5,
		xp: 600
	},
	{
		name: "Irrigated gardens",
		description: "Turn your vegetable patch into a thriving garden.",
		coins: 12e3,
		input: {
			cabbage: 50,
			cauliflower: 35,
			salad: 20
		},
		medals: 3,
		duration: 864e5,
		xp: 1200
	},
	{
		name: "Artisan farmstead",
		description: "Establish a reputation for carefully made farm goods.",
		coins: 45e3,
		input: {
			bread: 100,
			cheese: 50,
			pie: 30
		},
		medals: 6,
		duration: 1728e5,
		xp: 2200
	},
	{
		name: "Valley showcase",
		description: "Prepare a harvest worthy of the whole valley.",
		coins: 14e4,
		input: {
			sunflower: 75,
			redcabbage: 75,
			oil: 20
		},
		medals: 12,
		duration: 2592e5,
		xp: 4e3
	},
	{
		name: "Harvest estate",
		description: "Make your farm a lasting part of the countryside.",
		coins: 4e5,
		input: {
			pickles: 100,
			vegetables: 150,
			pie: 100
		},
		medals: 18,
		duration: 6048e5,
		xp: 8e3
	}
]), Object.freeze({
	greenhouse: {
		name: "Greenhouse",
		icon: "sprout",
		model: "greenhouse_003",
		coins: 20,
		xp: 28,
		cooldown: 18e4,
		item: "lettuce",
		itemCount: 3,
		instruction: "Water the three dry seedlings.",
		target: "Dry seedling",
		other: "Healthy seedling",
		verb: "Water",
		targetIcon: "droplets",
		otherIcon: "sprout"
	},
	apiary: {
		name: "Apiary",
		icon: "flower-2",
		model: "apiary_001",
		coins: 26,
		xp: 32,
		cooldown: 24e4,
		item: "honey",
		itemCount: 3,
		instruction: "Collect the three capped honey frames. Leave the bees at work.",
		target: "Capped honey",
		other: "Bees at work",
		verb: "Collect",
		targetIcon: "hexagon",
		otherIcon: "flower-2"
	},
	paddock: {
		name: "Animal paddock",
		icon: "heart",
		model: "horse_002",
		coins: 24,
		xp: 28,
		cooldown: 18e4,
		item: "fertilizer",
		instruction: "Refill the three empty water bowls.",
		target: "Empty bowl",
		other: "Full bowl",
		verb: "Fill",
		targetIcon: "droplet",
		otherIcon: "waves"
	},
	workshop: {
		name: "Tool workshop",
		icon: "wrench",
		model: "lawn_mower_001",
		coins: 30,
		xp: 32,
		cooldown: 24e4,
		item: "feed",
		instruction: "Repair the three worn tools. The others are ready to use.",
		target: "Worn tool",
		other: "Ready tool",
		verb: "Repair",
		targetIcon: "wrench",
		otherIcon: "check"
	}
}), Object.freeze({
	coins: 22,
	xp: 40
}), Object.freeze({
	MAX_MEMBERS: 6,
	MIN_CONTRIB_POINTS: 500,
	JOIN_COOLDOWN_MS: 48 * 36e5,
	RENAME_COOLDOWN_MS: 7 * o,
	ATTEMPTS_PER_HOUR: 10,
	EXTRA_POINTS_CAP: 3e4,
	TOURNAMENT_FIRST_MIN: 50,
	TOURNAMENT_FIRST_MAX: 300,
	TOURNAMENT_PER_EXTRA_PLAYER: 10,
	ORDER_PLAYER_WEEK_DIAMOND_CAP: 25,
	TOURNAMENT_MIN_POINTS: 1,
	ORDER_COIN_MULTIPLIER: 1.25,
	ORDER_XP_PER_VALUE: 1 / 100,
	ORDER_DIAMOND_BASE: 1,
	ORDER_DIAMOND_MAX: 3,
	ORDER_COMPLETION_DIAMONDS: 4,
	REWARD_WEEKS: 8,
	ORDER_MIN_VALUE_PER_MEMBER: 16e3,
	ORDER_MAX_VALUE_PER_MEMBER: 3e4,
	RANK_WEIGHTS: [
		1,
		.6,
		.4
	]
});
var d = Object.freeze([
	"wheat",
	"corn",
	"sunflower",
	"apples",
	"berries",
	"honey",
	"bread",
	"milk",
	"eggs",
	"tractor",
	"farm",
	"trophy",
	"family-bee",
	"family-oak",
	"family-barn",
	"pumpkin",
	"greenbeans",
	"cheese",
	"applejuice",
	"berrypreserves",
	"harvesthamper"
].map((e, t) => ({
	id: String(t),
	icon: e,
	color: [
		"#6b8e50",
		"#c39538",
		"#b57851",
		"#517c83",
		"#8b6a95",
		"#a66c71"
	][t % 6]
})));
Object.freeze([
	{
		wheat: 100,
		bread: 30,
		oil: 6,
		honey: 30
	},
	{
		corn: 80,
		vegetables: 6,
		cheese: 30,
		honey: 30
	},
	{
		barley: 60,
		pie: 8,
		eggs: 100,
		honey: 30
	},
	{
		cabbage: 50,
		pickles: 8,
		milk: 80,
		honey: 30
	}
]), 7 * o;
var f = (e) => String(e ?? "").replace(/[&<>"']/g, (e) => ({
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&#39;"
})[e]), p = (e) => Math.max(0, Number(e) || 0).toLocaleString("en-US"), m = (e) => String(e ?? "Farmer").split(/\s+/).slice(0, 2).map((e) => e[0] ?? "").join("").toUpperCase(), h = (e) => `<span class="farmer-presence"><span class="online-dot${e ? " is-online" : ""}" aria-hidden="true"></span>${e ? "Online" : "Offline"}</span>`;
function g(t) {
	let n = t.family, r = d.find((e) => e.id === n?.emblem), a = t.stats ?? {}, o = [
		[
			"harvested_crops",
			"Crops harvested",
			"harvest"
		],
		[
			"goods_produced",
			"Goods produced",
			"buildings"
		],
		[
			"items_sold",
			"Items sold",
			"market"
		],
		[
			"deliveries",
			"Deliveries completed",
			"cart"
		]
	], s = t.badges ?? [];
	return `<div class="farmer-identity"><div class="farmer-avatar" aria-hidden="true">${e("wheat")}<span>${f(m(t.username))}</span></div><div><span class="eyebrow">FARMER OF THE VALLEY</span><h3>${f(t.username)}</h3><div class="farmer-identity-meta"><span class="farmer-level">${e("xp")}Level ${p(t.level)}</span>${h(t.online)}</div></div></div>
 <section class="farmer-family" aria-label="Family">${e(r?.icon ?? "familyhall")}<div><span class="eyebrow">FAMILY</span><h4>${f(n?.name ?? "No family yet")}</h4><p>${f(n?.role ?? "Growing at their own pace")}</p></div></section>
 <h3 class="farmer-section-title">Life on the farm</h3><div class="farmer-stat-grid">${o.map(([t, n, r]) => `<div class="farmer-stat">${e(r)}<div><strong>${p(a[t])}</strong><span>${n}</span></div></div>`).join("")}</div>
 <section class="farmer-badges"><div class="farmer-section-heading"><h3 class="farmer-section-title">Crop mastery</h3><span>${s.length} / 48 badges</span></div>${s.length ? `<div class="farmer-badge-grid">${s.map((t) => {
		let n = i[t.crop], r = u[t.tier];
		return !n || !r ? "" : `<div class="farmer-badge farmer-badge-${Number(t.tier)}" title="${f(r.name)} · ${f(n.name)}">${e(t.crop)}<strong>${f(n.name)}</strong><span>${f(r.name)}</span></div>`;
	}).join("")}</div>` : "<p class=\"farmer-empty\">Every harvest is a step towards a first mastery badge.</p>"}</section>`;
}
function _(e) {
	return e.map((e) => `<button type="button" class="farmer-search-result" data-player-id="${f(e.playerId)}" aria-haspopup="dialog"><span class="farmer-search-avatar" aria-hidden="true">${f(m(e.username))}</span><span class="farmer-search-name"><strong>${f(e.username)}</strong><small>${e.family ? f(e.family.name) : "No family yet"} · Level ${p(e.level)}</small></span>${h(e.online)}<span aria-hidden="true">›</span></button>`).join("");
}
function v(e) {
	let t = document.getElementById("leaderboard-dialog"), n = document.createElement("section");
	n.className = "farmer-search", n.setAttribute("aria-label", "Player search"), n.innerHTML = "<label for=\"farmer-search-input\">Find a farmer</label><div class=\"farmer-search-control\"><input id=\"farmer-search-input\" type=\"search\" maxlength=\"20\" autocomplete=\"off\" spellcheck=\"false\" placeholder=\"Search by player name…\" aria-describedby=\"farmer-search-status\"><button type=\"button\" class=\"small-button\" id=\"farmer-search-clear\" hidden>Clear</button></div><p id=\"farmer-search-status\" role=\"status\">Enter at least 2 characters to search all farmers.</p><div id=\"farmer-search-results\"></div>", t.querySelector(".leaderboard-filter").before(n);
	let r = document.createElement("dialog");
	r.id = "player-profile-dialog", r.className = "game-dialog farmer-profile-dialog", r.setAttribute("aria-labelledby", "farmer-profile-title"), r.innerHTML = "<div class=\"dialog-heading\"><div><span class=\"eyebrow\">GROWING TOGETHER</span><h2 id=\"farmer-profile-title\">Farmer profile</h2></div><button class=\"icon-button farmer-profile-close\" aria-label=\"Close player profile\">×</button></div><div id=\"farmer-profile-content\" aria-busy=\"false\"></div><p id=\"farmer-profile-status\" class=\"farmer-profile-status\" role=\"status\"></p><button type=\"button\" class=\"small-button farmer-profile-back\">Back to leaderboard</button>", document.body.append(r);
	let i = n.querySelector("input"), a = n.querySelector("#farmer-search-clear"), o = n.querySelector("#farmer-search-results"), s = n.querySelector("#farmer-search-status"), c = r.querySelector("#farmer-profile-content"), l = r.querySelector("#farmer-profile-status"), u = 0, d = 0, f, p = null, m, h = !1;
	function v() {
		r.close();
	}
	r.querySelector(".farmer-profile-close").onclick = v, r.querySelector(".farmer-profile-back").onclick = v, r.addEventListener("close", () => {
		++d, p = null, h || (m?.isConnected ? m : i).focus();
	});
	async function y(e) {
		h || (m = document.activeElement, p = e, ++d, r.querySelector("#farmer-profile-title").textContent = "Farmer profile", c.innerHTML = "<p class=\"farmer-empty\">Opening this farmer’s gate…</p>", l.textContent = "", r.open || r.showModal(), r.scrollTop = 0, await b(!1));
	}
	async function b(t) {
		let n = p, i = ++d;
		if (n) {
			c.setAttribute("aria-busy", "true");
			try {
				let a = await e.request({
					operation: "player_profile",
					playerId: n
				});
				if (h || i !== d || !r.open) return;
				let o = r.scrollTop;
				c.innerHTML = g(a.playerProfile), r.querySelector("#farmer-profile-title").textContent = `${a.playerProfile.username}'s profile`, l.textContent = "Online status is based on activity in the last 30 minutes.", t && (r.scrollTop = o);
			} catch (e) {
				if (h || i !== d || !r.open) return;
				if (t || c.replaceChildren(), l.textContent = t ? "Could not refresh this profile. Showing the last update." : e.message, !t) {
					let e = document.createElement("button");
					e.className = "small-button", e.textContent = "Try again", e.onclick = () => b(!1), c.append(e);
				}
			} finally {
				i === d && c.setAttribute("aria-busy", "false");
			}
		}
	}
	async function x(t, n) {
		if (!(h || t !== u)) {
			o.setAttribute("aria-busy", "true"), s.textContent = "Looking around the valley…";
			try {
				let r = await e.request({
					operation: "player_search",
					query: n
				});
				if (h || t !== u) return;
				o.innerHTML = _(r.players), s.textContent = r.players.length ? `${r.players.length} farmer${r.players.length === 1 ? "" : "s"} found.${r.hasMore ? " More matches available — keep typing to narrow your search." : ""}` : "No farmers found. Try another name.";
			} catch (e) {
				!h && t === u && (o.replaceChildren(), s.textContent = e.message);
			} finally {
				t === u && o.setAttribute("aria-busy", "false");
			}
		}
	}
	function S() {
		clearTimeout(f);
		let e = ++u, t = i.value.trim();
		if (a.hidden = !i.value, o.replaceChildren(), o.setAttribute("aria-busy", "false"), t.length < 2) {
			s.textContent = "Enter at least 2 characters to search all farmers.";
			return;
		}
		s.textContent = "Searching…", f = setTimeout(() => x(e, t), 300);
	}
	i.addEventListener("input", S), a.onclick = () => {
		i.value = "", S(), i.focus();
	}, o.onclick = (e) => {
		let t = e.target.closest("[data-player-id]");
		t && o.contains(t) && y(t.dataset.playerId);
	};
	let C = setInterval(() => {
		h || document.hidden || (r.open ? b(!0) : t.open && i.value.trim().length >= 2 && o.children.length && document.activeElement !== i && !o.contains(document.activeElement) && x(++u, i.value.trim()));
	}, 3e4);
	return window.addEventListener("pagehide", () => {
		h = !0, ++u, ++d, clearTimeout(f), clearInterval(C);
	}, { once: !0 }), {
		open: y,
		get isOpen() {
			return r.open;
		}
	};
}
//#endregion
//#region src/ui.js
var y = (e) => document.getElementById(e);
function b({ onOpen: e, onName: t, onRetry: n, onSignIn: i, onRegister: a, onSignOut: o, onPlayer: s }) {
	let c = document.createElement("button");
	c.id = "leaderboard-button", c.className = "leaderboard-button", c.setAttribute("aria-haspopup", "dialog"), c.innerHTML = "<i data-lucide=\"trophy\"></i><span>Leaderboard</span>", document.querySelector(".tool-dock").append(c);
	let l = document.createElement("div");
	l.innerHTML = `<dialog id="auth-dialog" class="game-dialog auth-dialog" aria-labelledby="auth-title"><div class="auth-brand"><img src="/assets/harvest-tycoon-logo.png" alt="" width="92" height="92"><div><span class="eyebrow">WELCOME BACK TO THE FARM</span><h2 id="auth-title">Save your progress</h2></div></div><p class="section-copy">Sign in to access your coins, level, and player name on any device.</p><div class="auth-tabs" role="tablist"><button type="button" role="tab" data-auth-tab="signin" aria-selected="true">Sign in</button><button type="button" role="tab" data-auth-tab="register" aria-selected="false">Create account</button></div><form id="auth-form"><div id="register-name-row" hidden><label for="auth-username">Player name</label><input id="auth-username" autocomplete="nickname" minlength="3" maxlength="20" placeholder="Sunny Acres"></div><label for="auth-email">Email address</label><input id="auth-email" type="email" autocomplete="email" required placeholder="you@example.com"><label for="auth-password">Password</label><input id="auth-password" type="password" autocomplete="current-password" minlength="6" required><p id="auth-message" class="cloud-form-error" role="status"></p><button id="auth-submit" class="primary-button" type="submit">Sign in<i data-lucide="log-in"></i></button></form><p class="auth-note">Your session stays securely saved in this browser.</p></dialog>
 <dialog id="leaderboard-dialog" class="game-dialog wide-dialog" aria-labelledby="leaderboard-title"><div class="dialog-heading"><div><span class="eyebrow">GROWING TOGETHER</span><h2 id="leaderboard-title">The valley leaderboard</h2></div><button class="icon-button" data-cloud-close aria-label="Close"><i data-lucide="x"></i></button></div><p class="leaderboard-intro">Meet the farmers of the valley. Tap a name to see their profile. A green dot means they have played in the last 30 minutes.</p><div class="cloud-profile"><span id="player-name">Your farmer profile</span><button class="small-button" id="view-player-profile">Your profile</button><button class="small-button" id="rename-player" hidden>Change name</button><button class="small-button" id="logout-player" hidden>Sign out</button></div><div class="leaderboard-filter"><label for="leaderboard-category">Rank by</label><select id="leaderboard-category" aria-describedby="leaderboard-description">${[["progress", "Farm progress"], ["crops", "Individual crops"]].map(([e, t]) => `<optgroup label="${t}">${Object.entries(r).filter(([, t]) => (t.group ?? "progress") === e).map(([e, t]) => `<option value="${e}">${t.label}</option>`).join("")}</optgroup>`).join("")}</select><p id="leaderboard-description">${r.level.description}</p></div><div class="cloud-sync"><span id="cloud-status" role="status">Connecting…</span><button id="retry-cloud" class="back-button">Refresh</button></div><div id="leaderboard-results" aria-live="polite"></div><p class="cloud-privacy">Your name, online status and public farming achievements appear here. Your diamonds and farm details stay private.</p></dialog>
 <dialog id="username-dialog" class="game-dialog" aria-labelledby="username-title"><div class="dialog-heading"><div><span class="eyebrow">MEET THE OTHER FARMERS</span><h2 id="username-title">What should we call you?</h2></div><button class="icon-button" data-cloud-close aria-label="Keep playing"><i data-lucide="x"></i></button></div><p class="section-copy">Choose the display name other players will see on the leaderboard.</p><form id="username-form"><label for="username-input">Display name</label><input id="username-input" name="username" autocomplete="nickname" minlength="3" maxlength="20" required placeholder="Sunny Acres"><small>3–20 letters, numbers, spaces, underscores or hyphens.</small><p id="username-error" class="cloud-form-error" role="alert"></p><button class="primary-button" type="submit">Join the leaderboard<i data-lucide="arrow-right"></i></button></form></dialog>`, document.body.append(...l.children);
	let u = "signin";
	function d(e) {
		document.querySelectorAll("dialog[open]").forEach((e) => e.close()), y(e).showModal();
	}
	function f(e) {
		u = e, document.querySelectorAll("[data-auth-tab]").forEach((e) => e.setAttribute("aria-selected", String(e.dataset.authTab === u))), y("register-name-row").hidden = u !== "register", y("auth-username").required = u === "register", y("auth-password").autocomplete = u === "register" ? "new-password" : "current-password", y("auth-submit").innerHTML = u === "register" ? "Create account<i data-lucide=\"user-plus\"></i>" : "Sign in<i data-lucide=\"log-in\"></i>", y("auth-message").textContent = "", window.lucide?.createIcons();
	}
	function p(e = "") {
		y("username-input").value = e, y("username-error").textContent = "", d("username-dialog"), y("username-input").focus();
	}
	return document.querySelectorAll("[data-cloud-close]").forEach((e) => e.onclick = () => e.closest("dialog").close()), document.querySelectorAll("[data-auth-tab]").forEach((e) => e.onclick = () => f(e.dataset.authTab)), c.onclick = () => {
		d("leaderboard-dialog"), e();
	}, y("retry-cloud").onclick = n, y("leaderboard-category").onchange = () => {
		y("leaderboard-description").textContent = r[y("leaderboard-category").value].description, e();
	}, y("rename-player").onclick = () => p(y("player-name").dataset.username ?? ""), y("logout-player").onclick = o, y("view-player-profile").onclick = s, y("auth-form").onsubmit = async (e) => {
		e.preventDefault();
		let t = y("auth-submit");
		t.disabled = !0, y("auth-message").textContent = u === "register" ? "Creating your account…" : "Signing in…";
		try {
			if (u === "signin") await i(y("auth-email").value, y("auth-password").value);
			else if ((await a(y("auth-email").value, y("auth-password").value, y("auth-username").value)).confirmationRequired) {
				y("auth-message").textContent = "Check your inbox and confirm your email address. You will be signed in automatically afterward.";
				return;
			}
			y("auth-dialog").close();
		} catch (e) {
			y("auth-message").textContent = e.message;
		} finally {
			t.disabled = !1;
		}
	}, y("username-form").onsubmit = async (n) => {
		n.preventDefault();
		let r = n.currentTarget.querySelector("[type=\"submit\"]");
		r.disabled = !0, y("username-error").textContent = "";
		try {
			await t(y("username-input").value), d("leaderboard-dialog"), await e();
		} catch (e) {
			y("username-error").textContent = e.message;
		} finally {
			r.disabled = !1;
		}
	}, window.lucide?.createIcons(), {
		promptName: p,
		requireAuth() {
			y("auth-dialog").open || d("auth-dialog");
		},
		authenticated() {
			y("auth-dialog").open && y("auth-dialog").close();
		},
		configurationError() {
			d("auth-dialog"), y("auth-message").textContent = "The account connection has not been configured yet.";
		},
		authMessage(e) {
			y("auth-dialog").open && (y("auth-message").textContent = e);
		},
		setProfile(e, t) {
			y("player-name").textContent = e ? e.username : "Pick your farmer name", y("player-name").dataset.username = e?.username ?? "", y("rename-player").hidden = !t, y("logout-player").hidden = !t;
		},
		status(e) {
			y("cloud-status").textContent = e;
		},
		message(e) {
			let t = document.createElement("p");
			t.className = "leaderboard-empty", t.textContent = e, y("leaderboard-results").replaceChildren(t);
		},
		get category() {
			return y("leaderboard-category").value;
		},
		get results() {
			return y("leaderboard-results");
		},
		get open() {
			return y("leaderboard-dialog").open;
		}
	};
}
//#endregion
//#region src/payment-ui.js
function x(t) {
	let n = t.paymentReturn?.();
	if (!n?.id) return;
	let r = document.createElement("dialog");
	r.className = "payment-dialog", r.setAttribute("aria-labelledby", "payment-result-title"), r.setAttribute("aria-describedby", "payment-result-message"), r.innerHTML = `<button type="button" class="payment-dismiss" aria-label="Close purchase update"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button><div class="payment-hero">${e("diamonds")}</div><p class="payment-eyebrow">A LITTLE EXTRA GROWING POWER</p><h2 id="payment-result-title">Checking your purchase</h2><p id="payment-result-message" class="payment-message" role="status" aria-live="polite">Just a moment while we check your payment.</p><span class="payment-status">Checking payment</span><div class="payment-actions"><button type="button" data-close autofocus>Back to farm</button><button type="button" data-retry>Check payment</button></div>`, document.body.append(r);
	let i = r.querySelector("h2"), a = r.querySelector(".payment-message"), o = r.querySelector(".payment-status"), s = r.querySelector("[data-retry]"), c, l = 0, u = !1, d = !1, f = () => {
		u = !0, clearTimeout(c);
	};
	r.addEventListener("close", () => {
		f(), window.removeEventListener("pagehide", f), t.clearPaymentReturn?.(), r.remove();
	}), window.addEventListener("pagehide", f, { once: !0 }), r.querySelector("[data-close]").onclick = () => r.close(), r.querySelector(".payment-dismiss").onclick = () => r.close();
	function p(e, t, n, s) {
		r.dataset.state = e, i.textContent = t, a.textContent = n, o.textContent = s;
	}
	async function m() {
		if (!(u || d)) {
			d = !0, clearTimeout(c), s.disabled = !0, s.textContent = "Checking…";
			try {
				let e = await t.payments({
					operation: "status",
					purchaseId: n.id
				});
				if (u) return;
				if (e.status === "credited") {
					p("credited", e.pack === "starter" ? "Your Starter Pack is here!" : "A little sparkle for your farm", e.pack === "starter" ? "10,000 coins, 300 diamonds and one of every crop have been added to your account." : `${Number(e.diamonds).toLocaleString("en-US")} diamonds have been added to your farm. Enjoy your next little upgrade!`, "Payment confirmed"), s.hidden = !0, window.dispatchEvent(new Event("harvest-purchase-confirmed"));
					try {
						await window.harvestRefresh?.();
					} catch {
						u || (a.textContent += " Reopen your farm to refresh your balance.");
					}
					return;
				}
				if (e.status === "test_paid") {
					p("test", "Test payment confirmed", "This was a test purchase. No real diamonds were added.", "Test complete"), s.hidden = !0;
					return;
				}
				if (e.status === "expired") {
					p("closed", "This checkout has expired", "You can return to the diamond shop to start a new checkout.", "Checkout expired"), s.hidden = !0;
					return;
				}
				n.cancelled ? p("closed", "Back to your farm", "Checkout was closed. If you paid before returning, check your payment status below.", "Checkout closed") : p("pending", "Confirming your purchase", "We’re waiting for payment confirmation. You can return to your farm while we check.", "Awaiting confirmation"), !n.cancelled && ++l < 20 && (c = setTimeout(m, 3e3));
			} catch {
				u || p("error", "Let’s check again", "We couldn’t confirm your payment right now. If you paid, check again in a moment.", "Connection interrupted");
			} finally {
				d = !1, s.disabled = !1, s.textContent = "Check payment";
			}
		}
	}
	s.onclick = () => {
		l = 0, m();
	}, r.showModal(), m();
}
//#endregion
//#region src/starter-pack-ui.js
async function S(e) {
	let { CROPS: t, formatDuration: n } = await import(
		/* @vite-ignore */
		"/farm-state.js"
), { art: r, refreshArt: i } = await import(
		/* @vite-ignore */
		"/visual-icons.js"
), a = document.createElement("link");
	a.rel = "stylesheet", a.href = "/starter-pack.css", document.head.append(a);
	let o = document.createElement("button");
	o.id = "starter-pack-button", o.hidden = !0, o.type = "button", o.setAttribute("aria-label", "Starter Pack, €2.99"), o.innerHTML = "<img src=\"/assets/icons/starter-pack.svg\" alt=\"\"><span>Starter Pack</span><small>€2.99</small>";
	let s = document.createElement("dialog");
	s.id = "starter-pack-dialog", s.className = "game-dialog", s.setAttribute("aria-labelledby", "starter-pack-title"), s.innerHTML = `<button type="button" class="starter-close" aria-label="Close Starter Pack">×</button><img class="starter-hero" src="/assets/icons/starter-pack.svg" alt=""><span class="eyebrow">A LITTLE HEAD START</span><h2 id="starter-pack-title">Starter Pack</h2><p>Make yourself at home with a one-time welcome bundle.</p><div class="starter-rewards"><div>${r("coins")}<strong>10,000</strong><span>coins</span></div><div>${r("diamonds")}<strong>300</strong><span>diamonds</span></div></div><h3>1× each of all 12 crops</h3><div class="starter-crops">${Object.entries(t).map(([e, t]) => `<div>${r(e)}<span>${t.name}</span><b>×1</b></div>`).join("")}</div><p class="starter-note">All crops are added to your inventory, ready to use or sell; no fields are planted.</p><p class="starter-time"></p><button class="primary-button starter-buy" disabled>Buy Starter Pack · €2.99</button><p class="starter-feedback" role="status" aria-live="polite"></p><small>One purchase per account. Available for your first 72 hours.</small>`, document.body.append(o, s), i();
	let c = s.querySelector(".starter-buy"), l = s.querySelector(".starter-feedback"), u = s.querySelector(".starter-time"), d = null, f = 0, p = !1, m = !1, h = "", g = !1;
	function _() {
		let e = d?.starter, t = (e?.expiresAt ?? 0) - (Date.now() + f), r = e?.eligible && t > 0;
		o.hidden = !r, c.disabled = p || !r || !d?.enabled, c.textContent = p ? "Opening secure checkout…" : d?.mode === "test" ? "Test Starter Pack · €2.99" : "Buy Starter Pack · €2.99", u.textContent = e?.claimed ? "Starter Pack already received" : r ? `Available for ${n(t)}` : "This welcome offer has ended.", !d?.enabled && !p ? l.textContent = "Purchases are not available yet. Please check back later." : d?.enabled && l.textContent === "Purchases are not available yet. Please check back later." && (l.textContent = "");
	}
	async function v() {
		if (!(g || m)) {
			g = !0;
			try {
				let t = await e.payments({ operation: "catalog" });
				if (m) return;
				d = t, f = t.serverNow - Date.now(), _();
			} catch {
				d || (o.hidden = !0);
			} finally {
				g = !1;
			}
		}
	}
	o.onclick = () => {
		document.querySelectorAll("dialog[open]").forEach((e) => e.close()), h = crypto.randomUUID(), l.textContent = "", _(), s.showModal(), v();
	}, s.querySelector(".starter-close").onclick = () => s.close(), c.onclick = async () => {
		if (!(p || c.disabled)) {
			p = !0, l.textContent = "", _();
			try {
				await e.checkout("starter", h);
			} catch (e) {
				l.textContent = e.message, p = !1, _();
			}
		}
	};
	let y = setInterval(_, 1e4), b = setInterval(v, 6e4), x = () => {
		document.hidden || v();
	};
	document.addEventListener("visibilitychange", x), window.addEventListener("harvest-purchase-confirmed", v), window.addEventListener("pagehide", () => {
		m = !0, clearInterval(y), clearInterval(b), document.removeEventListener("visibilitychange", x), window.removeEventListener("harvest-purchase-confirmed", v);
	}, { once: !0 }), await v();
}
//#endregion
//#region src/game-cloud.js
var C;
try {
	C = window.parent === window ? null : window.parent.harvestBridge;
} catch {}
if (!C) location.replace("/play.html");
else if (window.harvestInitialFarm = C.takeInitial(), !window.harvestInitialFarm) location.replace("/play.html");
else {
	document.body.hidden = !1;
	let e = b({
		onOpen: s,
		onRetry: s,
		onPlayer: () => r.open(C.playerId),
		onName: async (t) => {
			let n = await C.request({
				operation: "rename",
				username: t
			});
			e.setProfile(n.profile, { id: C.playerId });
		},
		onSignOut: () => C.signOut()
	}), r = v(C);
	e.setProfile(window.harvestInitialFarm.profile, { id: C.playerId }), e.status("Live rankings");
	let i = C.presence?.subscribe((n) => {
		e.open && t(e.results, n);
	}), a = setInterval(() => {
		e.open && !r.isOpen && !document.hidden && s(!0);
	}, 3e4);
	window.addEventListener("pagehide", () => {
		i?.(), clearInterval(a);
	}, { once: !0 });
	let o = 0;
	async function s(t = !1) {
		let i = ++o, a = e.category;
		t || e.message("Gathering the latest scores…"), e.results.setAttribute("aria-busy", "true");
		try {
			let t = await C.leaderboard(a);
			if (i !== o) return;
			n(e.results, t, C.playerId, (e) => r.open(e)), e.status("Up to date");
		} catch (n) {
			i === o && (t || e.message(n.message), e.status("Could not refresh"));
		} finally {
			i === o && e.results.setAttribute("aria-busy", "false");
		}
	}
	let { farmReady: c } = await import(
		/* @vite-ignore */
		"/game.js"
);
	await c && (x(C), await S(C));
}
//#endregion
