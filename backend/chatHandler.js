// ============================================================
// chatHandler.js — Smart recommendations with built-in fallback
// Works WITHOUT an API key using local menu intelligence
// Uses Claude AI when ANTHROPIC_API_KEY is set for richer replies
// ============================================================

const HAS_API_KEY =
  process.env.ANTHROPIC_API_KEY &&
  process.env.ANTHROPIC_API_KEY.trim() !== "" &&
  !process.env.ANTHROPIC_API_KEY.startsWith("your_");

let client = null;
if (HAS_API_KEY) {
  try {
    const Anthropic = require("@anthropic-ai/sdk");
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  } catch (e) {
    console.warn("⚠️  Anthropic SDK not available — using built-in engine.");
  }
}

// In-memory session store
const sessions = {};

// ─── REAL Suka Brew Menu ──────────────────────────────────────────────────
const FULL_MENU = {
  starters: {
    veg: [
      { name: "Cheesy Nachos", price: 329, tags: ["veg", "continental", "mild"] },
      { name: "Garlic Butter Mushrooms", price: 399, tags: ["veg", "continental", "mild"] },
      { name: "Malai Magic Broccoli", price: 359, tags: ["veg", "indian", "mild"] },
      { name: "Classic Chilli Mushrooms", price: 319, tags: ["veg", "asian", "spicy"] },
      { name: "Podi Corn Masala", price: 199, tags: ["veg", "indian", "medium"] },
      { name: "Mix Poppadom Basket", price: 199, tags: ["veg", "indian", "mild"] },
    ],
    nonVeg: [
      { name: "Egg Manchurian", price: 229, tags: ["egg", "asian", "medium"] },
      { name: "Kundapura Chicken 65", price: 249, tags: ["nonveg", "indian", "spicy"] },
      { name: "Kori Kempu Bezule", price: 249, tags: ["nonveg", "indian", "spicy"] },
    ],
  },
  seafoodStarters: [
    { name: "Shetty's Prawns Ghee Roast", price: 489, tags: ["seafood", "indian", "spicy"] },
    { name: "Hebri Prawn Pepper Dry", price: 449, tags: ["seafood", "indian", "spicy"] },
    { name: "Golden Fish Fingers", price: 449, tags: ["seafood", "continental", "mild"] },
  ],
  soups: [
    { name: "Cream of Mushroom Soup", price: 249, tags: ["veg", "continental", "mild"] },
    { name: "Roasted Tomato & Basil Soup", price: 249, tags: ["veg", "continental", "mild"] },
    { name: "Curry Leaf Rasam", price: 249, tags: ["veg", "indian", "medium"] },
    { name: "Tom Yum Chicken", price: 299, tags: ["nonveg", "asian", "spicy"] },
    { name: "Chicken Clear Soup", price: 299, tags: ["nonveg", "continental", "mild"] },
    { name: "Sweet Corn Chicken Soup", price: 299, tags: ["nonveg", "continental", "mild"] },
    { name: "Mutton Paya Soup", price: 349, tags: ["nonveg", "indian", "medium"] },
  ],
  pizza: [
    { name: "Fiery BBQ Chicken Pizza", price: 489, tags: ["nonveg", "continental", "medium"] },
    { name: "Chicken Tikka Pizza", price: 489, tags: ["nonveg", "indian", "medium"] },
  ],
  burgers: [
    { name: "Chicken Topkapi Burger", price: 369, tags: ["nonveg", "continental", "medium"] },
    { name: "Classic Veg Burger", price: 339, tags: ["veg", "continental", "mild"] },
  ],
  globalMains: [
    { name: "Chicken Alfredo Pasta", price: 420, tags: ["nonveg", "italian", "mild"] },
    { name: "Spaghetti Bolognese", price: 450, tags: ["nonveg", "italian", "mild"] },
    { name: "Creamy Mushroom Pasta", price: 380, tags: ["veg", "italian", "mild"] },
    { name: "Lemon Spaghetti", price: 360, tags: ["veg", "italian", "mild"] },
    { name: "Grilled Fish Steak", price: 520, tags: ["seafood", "continental", "mild"] },
    { name: "Chicken Steak", price: 499, tags: ["nonveg", "continental", "mild"] },
  ],
  biryanis: [
    { name: "Veg Dum Biryani", price: 349, tags: ["veg", "indian", "medium"] },
    { name: "Chicken Biryani", price: 399, tags: ["nonveg", "indian", "medium"] },
    { name: "Mutton Biryani", price: 449, tags: ["nonveg", "indian", "medium"] },
    { name: "Prawn Biryani", price: 479, tags: ["seafood", "indian", "medium"] },
  ],
  indianCurry: [
    { name: "Dal Makhani", price: 299, tags: ["veg", "indian", "mild"] },
    { name: "Paneer Butter Masala", price: 349, tags: ["veg", "indian", "mild"] },
    { name: "Shahi Korma", price: 379, tags: ["veg", "indian", "mild"] },
    { name: "Butter Chicken", price: 399, tags: ["nonveg", "indian", "mild"] },
    { name: "Mutton Rogan Josh", price: 449, tags: ["nonveg", "indian", "spicy"] },
  ],
  asianCurry: [
    { name: "Thai Green Curry (Veg)", price: 349, tags: ["veg", "asian", "medium"] },
    { name: "Thai Red Curry (Chicken)", price: 399, tags: ["nonveg", "asian", "spicy"] },
    { name: "Korean Fried Chicken Bowl", price: 429, tags: ["nonveg", "asian", "medium"] },
  ],
  bbqGrill: [
    { name: "BBQ Chicken Wings", price: 399, tags: ["nonveg", "continental", "medium"] },
    { name: "Grilled Chicken Steak", price: 499, tags: ["nonveg", "continental", "mild"] },
    { name: "Lamb Kofta Kebab Platter", price: 529, tags: ["nonveg", "continental", "medium"] },
    { name: "Grilled Salmon", price: 599, tags: ["seafood", "continental", "mild"] },
    { name: "Grilled Shrimp Skewers", price: 549, tags: ["seafood", "continental", "medium"] },
  ],
  desserts: [
    { name: "New York Cheesecake", price: 349, tags: ["veg", "continental", "sweet"] },
    { name: "Matcha Panna Cotta", price: 249, tags: ["veg", "asian", "sweet"] },
    { name: "Gulab Jamun Cheesecake", price: 349, tags: ["veg", "fusion", "sweet"] },
    { name: "Raspberry Rasmalai Tart", price: 359, tags: ["veg", "fusion", "sweet"] },
    { name: "Biscoff Tres Leches", price: 359, tags: ["veg", "continental", "sweet"] },
    { name: "Milk Mawa Samosa", price: 329, tags: ["veg", "indian", "sweet"] },
    { name: "Chocolate Lava Cake", price: 299, tags: ["veg", "continental", "sweet"] },
  ],
  drinks: {
    cocktails: [
      { name: "Classic Mojito", price: 350, tags: ["alcohol", "refreshing", "mild"] },
      { name: "LIIT (Long Island Iced Tea)", price: 450, tags: ["alcohol", "strong", "bold"] },
      { name: "Margarita", price: 380, tags: ["alcohol", "citrus", "medium"] },
      { name: "Clover Club Cocktail", price: 420, tags: ["alcohol", "fruity", "mild"] },
      { name: "Blue Lagoon Cocktail", price: 380, tags: ["alcohol", "tropical", "mild"] },
      { name: "Espresso Martini", price: 450, tags: ["alcohol", "coffee", "bold"] },
    ],
    mocktails: [
      { name: "Virgin Mojito", price: 199, tags: ["nonalcohol", "refreshing", "mild"] },
      { name: "Fruit Punch", price: 179, tags: ["nonalcohol", "fruity", "mild"] },
      { name: "Watermelon Cooler", price: 189, tags: ["nonalcohol", "refreshing", "mild"] },
      { name: "Pineapple Ginger Juice", price: 199, tags: ["nonalcohol", "fruity", "zesty"] },
      { name: "Frozen Iced Tea Slush", price: 219, tags: ["nonalcohol", "refreshing", "mild"] },
    ],
    beer: [
      { name: "Belgian Wit", price: 299, tags: ["alcohol", "light", "citrus"] },
      { name: "IPA", price: 299, tags: ["alcohol", "bitter", "bold"] },
      { name: "Stout", price: 299, tags: ["alcohol", "dark", "roasted"] },
    ],
    wine: [
      { name: "Red Wine (Glass)", price: 399, tags: ["alcohol", "bold", "rich"] },
      { name: "White Wine (Glass)", price: 349, tags: ["alcohol", "light", "smooth"] },
      { name: "Rosé (Glass)", price: 349, tags: ["alcohol", "fruity", "light"] },
    ],
    nonAlcoholic: [
      { name: "Classic Cold Coffee", price: 179, tags: ["nonalcohol", "coffee", "sweet"] },
      { name: "Chilled Green Tea", price: 149, tags: ["nonalcohol", "healthy", "mild"] },
    ],
  },
};

// ─── Short flavour descriptions for local engine ──────────────────────────
const DESCRIPTIONS = {
  "Cheesy Nachos": "Crispy nachos loaded with melted cheese — great starter to share",
  "Garlic Butter Mushrooms": "Sautéed mushrooms in rich garlic butter sauce",
  "Malai Magic Broccoli": "Creamy malai-glazed broccoli florets, melt-in-mouth texture",
  "Classic Chilli Mushrooms": "Indo-Chinese stir-fried mushrooms with a spicy kick",
  "Podi Corn Masala": "Crunchy corn tossed in South Indian podi spice",
  "Mix Poppadom Basket": "Light crispy poppadoms with chutneys — perfect light bite",
  "Egg Manchurian": "Crispy egg fritters in tangy Manchurian sauce",
  "Kundapura Chicken 65": "Coastal Mangalorean-style fiery fried chicken",
  "Kori Kempu Bezule": "Spiced Tulu-style chicken fry with curry leaves",
  "Shetty's Prawns Ghee Roast": "Signature coastal prawns in aromatic ghee roast masala",
  "Hebri Prawn Pepper Dry": "Coastal dry-fried prawns with bold black pepper",
  "Golden Fish Fingers": "Crispy golden battered fish — crowd favourite",
  "Cream of Mushroom Soup": "Velvety smooth mushroom soup, perfect comfort starter",
  "Roasted Tomato & Basil Soup": "Classic roasted tomato with fresh basil",
  "Curry Leaf Rasam": "Tangy South Indian rasam with curry leaf aroma",
  "Tom Yum Chicken": "Hot and sour Thai broth with tender chicken",
  "Chicken Clear Soup": "Light, clean chicken broth — soothing and flavourful",
  "Sweet Corn Chicken Soup": "Creamy corn and chicken classic",
  "Mutton Paya Soup": "Rich, collagen-packed slow-cooked mutton trotter soup",
  "Fiery BBQ Chicken Pizza": "Thin-crust pizza with smoky BBQ chicken and chipotle sauce",
  "Chicken Tikka Pizza": "Tandoor-marinated chicken on pizza — fusion at its best",
  "Chicken Topkapi Burger": "Juicy grilled chicken with Turkish-inspired spiced sauce",
  "Classic Veg Burger": "Fresh veggie patty with crisp lettuce and house sauce",
  "Chicken Alfredo Pasta": "Creamy Alfredo sauce with tender grilled chicken strips",
  "Spaghetti Bolognese": "Slow-cooked minced chicken in rich tomato ragu",
  "Creamy Mushroom Pasta": "Earthy mushrooms in silky cream sauce — pure comfort",
  "Lemon Spaghetti": "Bright lemony spaghetti with herbs and olive oil",
  "Grilled Fish Steak": "Pan-seared fish steak with herb butter and seasonal sides",
  "Chicken Steak": "Grilled chicken breast with pepper sauce and veggies",
  "Veg Dum Biryani": "Fragrant basmati layered with seasonal vegetables",
  "Chicken Biryani": "Suka Brew's signature slow-cooked chicken biryani",
  "Mutton Biryani": "Tender mutton pieces in aromatic dum biryani",
  "Prawn Biryani": "Coastal-style prawn biryani with fried onions",
  "Dal Makhani": "Slow-cooked black lentils in buttery tomato gravy",
  "Paneer Butter Masala": "Soft paneer cubes in rich creamy tomato sauce",
  "Shahi Korma": "Royal Mughal-style paneer in cashew-cream gravy",
  "Butter Chicken": "Iconic smoky tandoor chicken in velvety tomato butter sauce",
  "Mutton Rogan Josh": "Kashmiri slow-cooked mutton with aromatic whole spices",
  "Thai Green Curry (Veg)": "Fragrant green curry with coconut milk and fresh veggies",
  "Thai Red Curry (Chicken)": "Bold and spicy red curry with chicken and coconut cream",
  "Korean Fried Chicken Bowl": "Crispy Korean-glazed chicken over steamed rice",
  "BBQ Chicken Wings": "Smoky BBQ-glazed wings — perfect with a cold beer",
  "Grilled Chicken Steak": "Herb-marinated chicken steak, juicy and chargrilled",
  "Lamb Kofta Kebab Platter": "Spiced minced lamb kebabs with mint chutney",
  "Grilled Salmon": "Atlantic salmon fillet, grilled with lemon-dill butter",
  "Grilled Shrimp Skewers": "Jumbo shrimp skewers with garlic and herb marinade",
  "New York Cheesecake": "Classic dense baked cheesecake with berry coulis",
  "Matcha Panna Cotta": "Silky Japanese matcha panna cotta — light and elegant",
  "Gulab Jamun Cheesecake": "Fusion: warm gulab jamun meets creamy cheesecake",
  "Raspberry Rasmalai Tart": "Delicate rasmalai filling in a buttery tart shell",
  "Biscoff Tres Leches": "Belgian Biscoff-soaked three-milk cake — indulgent",
  "Milk Mawa Samosa": "Crispy samosa stuffed with sweet khoya filling",
  "Chocolate Lava Cake": "Warm dark chocolate cake with molten centre",
  "Classic Mojito": "Fresh mint, lime and soda — light and refreshing",
  "LIIT (Long Island Iced Tea)": "Bold mix of five spirits — the party starter",
  "Margarita": "Classic tequila, lime and triple sec on the rocks",
  "Clover Club Cocktail": "Gin-based fruity pink cocktail — smooth and elegant",
  "Blue Lagoon Cocktail": "Tropical blue curacao cocktail — vibrant and fun",
  "Espresso Martini": "Vodka and espresso — the perfect after-dinner pick-me-up",
  "Virgin Mojito": "Alcohol-free mint lime refresher",
  "Fruit Punch": "A bright, fruity house blend of tropical juices",
  "Watermelon Cooler": "Fresh watermelon blended with mint and lime",
  "Pineapple Ginger Juice": "Tangy pineapple with a ginger kick",
  "Frozen Iced Tea Slush": "Chilled iced tea blended into a refreshing slush",
  "Classic Cold Coffee": "Creamy cold brew coffee — sweet and refreshing",
  "Chilled Green Tea": "Light and healthy chilled green tea",
  "Belgian Wit": "Light citrusy wheat beer — pairs great with starters",
  "IPA": "Hoppy bold IPA for craft beer lovers",
  "Stout": "Dark roasted stout with coffee and chocolate notes",
  "Red Wine (Glass)": "Rich and bold red wine — pairs with grills and curries",
  "White Wine (Glass)": "Light and smooth — great with seafood and pasta",
  "Rosé (Glass)": "Fruity and refreshing for any occasion",
};

// ─── Built-in recommendation engine ──────────────────────────────────────
function localRecommend(prompt) {
  // Parse the structured prompt the frontend sends
  const diet      = (prompt.match(/Diet:\s*(\S+)/i) || [])[1] || "any";
  const cuisines  = (prompt.match(/Cuisines preferred:\s*(.+)/i) || [])[1] || "any";
  const spice     = (prompt.match(/Spice level:\s*(\S+)/i) || [])[1] || "medium";
  const budget    = (prompt.match(/Budget per person:\s*₹([\d\-+]+)/i) || [])[1] || "500-800";
  const drinkLine = (prompt.match(/Drink:\s*(.+)/i) || [])[1] || "";
  const wantsDrink = !drinkLine.toLowerCase().includes("does not want");
  const drinkStyle = (drinkLine.match(/(beer|wine|cocktail|mocktail|juice|coffee|any)/i) || [])[1] || "any";

  const maxBudget = budget.includes("+") ? 99999 : parseInt(budget.split("-")[1] || budget) || 800;

  // Flatten all food items
  const allFood = [
    ...FULL_MENU.starters.veg.map(i => ({ ...i, category: "Starter" })),
    ...FULL_MENU.starters.nonVeg.map(i => ({ ...i, category: "Starter" })),
    ...FULL_MENU.seafoodStarters.map(i => ({ ...i, category: "Starter" })),
    ...FULL_MENU.soups.map(i => ({ ...i, category: "Soup" })),
    ...FULL_MENU.pizza.map(i => ({ ...i, category: "Main Course" })),
    ...FULL_MENU.burgers.map(i => ({ ...i, category: "Main Course" })),
    ...FULL_MENU.globalMains.map(i => ({ ...i, category: "Main Course" })),
    ...FULL_MENU.biryanis.map(i => ({ ...i, category: "Main Course" })),
    ...FULL_MENU.indianCurry.map(i => ({ ...i, category: "Main Course" })),
    ...FULL_MENU.asianCurry.map(i => ({ ...i, category: "Main Course" })),
    ...FULL_MENU.bbqGrill.map(i => ({ ...i, category: "BBQ & Grill" })),
  ];

  const cuisineList = cuisines.toLowerCase().split(/[,\s&and]+/).map(c => c.trim()).filter(Boolean);

  // Score each item
  function score(item) {
    let s = 0;
    const t = item.tags.join(" ");

    // Diet match
    if (diet === "veg" && (t.includes("nonveg") || t.includes("seafood") || t.includes("egg"))) return -1;
    if (diet === "seafood" && !t.includes("seafood")) s -= 2;
    if (diet === "nonveg" && (t.includes("veg") && !t.includes("nonveg"))) s -= 1;

    // Cuisine match
    if (cuisineList.some(c => c !== "any" && t.includes(c))) s += 3;

    // Spice match
    if (t.includes(spice)) s += 2;
    else if (spice === "mild" && t.includes("medium")) s += 0;
    else if (spice === "mild" && t.includes("spicy")) s -= 2;
    else if (spice === "spicy" && t.includes("mild")) s -= 1;

    // Budget
    if (item.price <= maxBudget * 0.5) s += 1;

    return s;
  }

  const candidates = allFood
    .filter(i => score(i) >= 0)
    .sort((a, b) => score(b) - score(a));

  // Enforce: 1 Starter + 1 Main Course + 1 Dessert
  const allStarters = candidates.filter(i => i.category === "Starter" || i.category === "Soup");
  const allMains    = candidates.filter(i => ["Main Course","BBQ & Grill"].includes(i.category));
  const allDesserts = FULL_MENU.desserts.map(i => ({...i, category:"Dessert"}));

  const picks = [];
  picks.push(allStarters[0] || { name:"Cheesy Nachos", price:329, tags:["veg","continental","mild"], category:"Starter" });
  picks.push(allMains[0]    || { name:"Fiery BBQ Chicken Pizza", price:489, tags:["nonveg","continental","medium"], category:"Main Course" });
  picks.push(allDesserts[0] || { name:"Chocolate Lava Cake", price:299, tags:["veg","continental","sweet"], category:"Dessert" });

  // Pick drink
  let drinkPick = null;
  if (wantsDrink) {
    const allDrinks = [
      ...FULL_MENU.drinks.cocktails,
      ...FULL_MENU.drinks.mocktails,
      ...FULL_MENU.drinks.beer,
      ...FULL_MENU.drinks.wine,
      ...FULL_MENU.drinks.nonAlcoholic,
    ];
    const ds = drinkStyle.toLowerCase();
    const filtered = allDrinks.filter(d => {
      const t = d.tags.join(" ");
      if (ds === "beer") return t.includes("light") || t.includes("bitter") || t.includes("dark");
      if (ds === "wine") return t.includes("bold") || t.includes("smooth") || t.includes("fruity");
      if (ds === "cocktail") return t.includes("alcohol") && !t.includes("light") && !t.includes("bitter");
      if (ds === "mocktail") return t.includes("nonalcohol") && t.includes("refreshing");
      if (ds === "juice") return t.includes("nonalcohol") && t.includes("fruity");
      if (ds === "coffee") return t.includes("coffee");
      // default: pick something matching budget
      return true;
    });
    drinkPick = filtered[0] || FULL_MENU.drinks.mocktails[0];
  }

  // Format the reply
  const categoryEmoji = { indian:"🍛", asian:"🥢", italian:"🍝", continental:"🍽️", seafood:"🦐", fusion:"🌮", bbq:"🥩", other:"✨" };
  function emoji(item) {
    const cat = item.tags.find(t => categoryEmoji[t]) || "other";
    return categoryEmoji[cat] || "✨";
  }

  const courseEmoji = { "Starter":"🥗", "Soup":"🍲", "Main Course":"🍕", "BBQ & Grill":"🥩", "Dessert":"🍰" };
  const courseLabel = { "Starter":"Starter", "Soup":"Starter", "Main Course":"Main Course", "BBQ & Grill":"Main Course", "Dessert":"Dessert" };

  let reply = `Here are your top picks at Suka Brew 🍽️\n\n`;
  for (const item of picks) {
    const desc = DESCRIPTIONS[item.name] || "A Suka Brew favourite";
    const icon = courseEmoji[item.category] || "✨";
    const label = courseLabel[item.category] || item.category;
    reply += `${icon} ${label}: ${item.name} — ₹${item.price}\n${desc}\n\n`;
  }

  if (drinkPick) {
    const desc = DESCRIPTIONS[drinkPick.name] || "A great pairing for your meal";
    reply += `🍹 Drink: ${drinkPick.name} — ₹${drinkPick.price}\n${desc}\n\n`;
  }

  reply += `Enjoy your meal at Suka Brew! 😊 Let your server know and they'll take care of the rest.`;
  return reply;
}

// ─── System Prompt (for Claude) ───────────────────────────────────────────
const SYSTEM_PROMPT = `You are SukaMate, the AI food and drinks assistant for Suka Brew restaurant in Bengaluru.

PERSONALITY: Warm, knowledgeable, conversational. Like a helpful friend who knows the menu inside out.

FULL MENU WITH PRICES (₹):

STARTERS (VEG): Cheesy Nachos ₹329, Garlic Butter Mushrooms ₹399, Malai Magic Broccoli ₹359, Classic Chilli Mushrooms ₹319, Podi Corn Masala ₹199, Mix Poppadom Basket ₹199
STARTERS (NON-VEG): Egg Manchurian ₹229, Kundapura Chicken 65 ₹249, Kori Kempu Bezule ₹249
SEAFOOD STARTERS: Shetty's Prawns Ghee Roast ₹489, Hebri Prawn Pepper Dry ₹449, Golden Fish Fingers ₹449
SOUPS: Cream of Mushroom ₹249, Tomato & Basil ₹249, Curry Leaf Rasam ₹249, Tom Yum Chicken ₹299, Chicken Clear Soup ₹299, Sweet Corn Chicken ₹299, Mutton Paya ₹349
PIZZA: Fiery BBQ Chicken Pizza ₹489, Chicken Tikka Pizza ₹489
BURGERS: Chicken Topkapi Burger ₹369, Classic Veg Burger ₹339
GLOBAL MAINS: Chicken Alfredo Pasta ₹420, Spaghetti Bolognese ₹450, Creamy Mushroom Pasta ₹380, Lemon Spaghetti ₹360, Grilled Fish Steak ₹520, Chicken Steak ₹499
BIRYANIS: Veg Dum Biryani ₹349, Chicken Biryani ₹399, Mutton Biryani ₹449, Prawn Biryani ₹479
INDIAN CURRY: Dal Makhani ₹299, Paneer Butter Masala ₹349, Shahi Korma ₹379, Butter Chicken ₹399, Mutton Rogan Josh ₹449
ASIAN CURRY: Thai Green Curry (Veg) ₹349, Thai Red Curry (Chicken) ₹399, Korean Fried Chicken Bowl ₹429
BBQ & GRILL: BBQ Chicken Wings ₹399, Grilled Chicken Steak ₹499, Lamb Kofta Kebab ₹529, Grilled Salmon ₹599, Grilled Shrimp Skewers ₹549
DESSERTS: New York Cheesecake ₹349, Matcha Panna Cotta ₹249, Gulab Jamun Cheesecake ₹349, Raspberry Rasmalai Tart ₹359, Biscoff Tres Leches ₹359, Milk Mawa Samosa ₹329, Chocolate Lava Cake ₹299
COCKTAILS: Classic Mojito ₹350, LIIT ₹450, Margarita ₹380, Clover Club ₹420, Blue Lagoon ₹380, Espresso Martini ₹450
MOCKTAILS: Virgin Mojito ₹199, Fruit Punch ₹179, Watermelon Cooler ₹189, Pineapple Ginger Juice ₹199, Frozen Iced Tea Slush ₹219
BEER: Belgian Wit ₹299, IPA ₹299, Stout ₹299
WINE: Red Wine ₹399, White Wine ₹349, Rosé ₹349
NON-ALCOHOLIC: Classic Cold Coffee ₹179, Chilled Green Tea ₹149

RULES:
- ONLY recommend items from the menu above with correct prices
- NEVER invent dishes not in this list
- Always show ₹ prices
- Keep responses SHORT (max 180 words) and voice-friendly
- ALWAYS give exactly: 1 Starter first, then 1 Main Course (pizza/biryani/pasta/curry/steak/burger), then 1 Dessert
- NEVER skip the Main Course. NEVER give 3 starters
- If drink requested, add as 4th item after dessert`;

// ─── Handle chat ──────────────────────────────────────────────────────────
async function handleChat(sessionId, userMessage, preferences = {}) {
  if (!sessions[sessionId]) sessions[sessionId] = { history: [], preferences: {} };
  const session = sessions[sessionId];
  Object.assign(session.preferences, preferences);
  // Store table number if provided
  if (preferences.tableNumber) session.preferences.tableNumber = preferences.tableNumber;
  session.history.push({ role: "user", content: userMessage });

  // ── Use Claude if key is available ──
  if (client) {
    try {
      const history = session.history.slice(-24);
      const response = await client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: history,
      });
      const reply = response.content[0].text;
      session.history.push({ role: "assistant", content: reply });
      return reply;
    } catch (e) {
      console.warn("Claude API error — falling back to local engine:", e.message);
      // Fall through to local engine
    }
  }

  // ── Built-in local engine (no API key needed) ──
  const reply = localRecommend(userMessage);
  session.history.push({ role: "assistant", content: reply });
  return reply;
}

function resetSession(sessionId) { delete sessions[sessionId]; }

module.exports = { handleChat, resetSession, FULL_MENU };
