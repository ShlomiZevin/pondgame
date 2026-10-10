// ── "Add anything": the meaning table and the AI interface ──
// A thing is a bundle of properties: nutrition (with a food tag), poison, heat, light, sticky, acid, hard.
// G.ai.ask(task, input, schema) is the one door to imagination: offline now, a server later.
(function () {
  'use strict';
  const clamp = G.clamp;
  const GROUPS = [];
  function grp(label, p, words) { GROUPS.push({ label: label, p: p, words: words.split(/\s+/).filter(Boolean) }); }
  // p: n nutrition, tag, poison, h heat (-1..1), l light, s sticky, a acid, d hard, x spread, hue, r radius, life

  grp('fire', { h: 0.85, l: 0.7, hue: 20, r: 80 }, 'fire flame flames lava volcano magma ember embers torch bonfire inferno furnace oven stove blaze campfire fireball dragonfire eruption wildfire firework fireworks match lighter flamethrower kiln forge cinder ashes scorch sauna steam boiler heater radiator kettle toaster grill barbecue bbq hellfire hell devil demon fireplace candlelight smoke cauldron geyser hotspring');
  grp('sun', { h: 0.5, l: 0.95, hue: 48, r: 100 }, 'sun sunshine sunlight sunny summer star daylight noon sunrise sunset dawn daybreak solar supernova comet meteor sunbeam bright brightness shine glow radiant');
  grp('cold', { h: -0.85, hue: 200, r: 90 }, 'ice snow frost glacier freezer winter blizzard iceberg icicle snowman fridge refrigerator cold freeze frozen arctic antarctica snowflake hail sleet chill chilly polar tundra igloo penguin yeti popsicle slush frostbite iceland siberia');
  grp('sweet', { n: 0.95, tag: 0, hue: 45, r: 70, s: 0.15 }, 'honey sugar candy cake cookie cookies chocolate jam syrup donut doughnut cupcake pie brownie muffin pastry waffle pancake caramel toffee fudge lollipop marshmallow gum jelly pudding icecream dessert sweet sweets treat treats cinnamon vanilla nutella cheesecake macaron croissant biscuit cereal granola popcorn pretzel candybar gummy sprinkles frosting icing sundae milkshake smoothie');
  grp('fruit', { n: 0.85, tag: 5, hue: 335, r: 70, v: 0.35 }, 'apple banana orange lemon lime mango peach pear plum cherry grape grapes strawberry blueberry raspberry blackberry watermelon melon pineapple coconut kiwi papaya apricot fig date dates pomegranate cranberry grapefruit tangerine nectarine lychee guava avocado fruit berries berry raisin prune currant persimmon quince tomato olive pumpkin');
  grp('veg', { n: 0.8, tag: 1, hue: 100, r: 70, v: 0.6 }, 'salad lettuce spinach cabbage broccoli carrot potato cucumber onion garlic celery pepper peas bean beans corn radish beet turnip zucchini eggplant kale leek asparagus parsley basil mint herb herbs vegetable vegetables mushroom sprout sprouts seaweed algae kelp lentil chickpea tofu cauliflower artichoke');
  grp('meat', { n: 0.9, tag: 3, hue: 215, r: 70 }, 'meat steak burger hamburger bacon sausage ham chicken turkey beef pork lamb fish salmon tuna shrimp crab lobster oyster sushi egg eggs cheese pizza hotdog sandwich taco burrito kebab meatball ribs jerky pasta noodles ramen soup stew spaghetti lasagna omelette fries nuggets caviar squid octopus clam mussel sardine anchovy cod trout');
  grp('grain', { n: 0.8, tag: 0, hue: 40, r: 70 }, 'bread rice wheat oats barley rye flour dough toast bagel noodle tortilla porridge oatmeal cracker seed seeds grain grains nut nuts peanut almond walnut cashew pistachio acorn chestnut hazelnut sesame sunflower quinoa maize cornflakes bun roll');
  grp('drink', { n: 0.55, tag: 4, hue: 260, r: 75 }, 'milk juice soda cola lemonade tea coffee beer wine whiskey vodka water champagne cocktail smoothie yogurt kefir broth cocoa cider punch espresso latte mocha brandy rum sake soup potion elixir nectar tonic');
  grp('poison', { p: 0.9, hue: 280, r: 85, v: 0.45 }, 'poison venom toxin toxic arsenic cyanide hemlock nightshade deadly lethal contaminant pollution pollutant smog sewage waste garbage trash rot rotten rotting mold mildew fungus spore spores plague disease virus bacteria germ germs infection sickness cholera ebola anthrax scorpion cobra viper snake spider tarantula wasp hornet stinger sting bane curse hex witchcraft');
  grp('acid', { a: 0.9, hue: 85, r: 80 }, 'acid vinegar bleach ammonia lye battery corrosion corrosive rust vitriol caustic sulfur sulphur lemonjuice chlorine detergent drain cleaner solvent acidrain peroxide');
  grp('goo', { s: 0.9, hue: 110, r: 90 }, 'slime glue tar mud goo gunk sludge ooze paste putty gel jello resin sap molasses bubblegum cement clay quicksand swamp bog marsh peat jam tape web cobweb spiderweb flypaper adhesive sticky gluestick wax dough mucus snot syrup oil grease lard butter paint');
  grp('rock', { d: 0.9, hue: 210, r: 70, life: 150 }, 'rock stone boulder pebble iron steel metal brick concrete wall fence gate cage bars wood log plank lumber timber coal granite marble diamond crystal gem gemstone ruby emerald sapphire quartz obsidian copper bronze silver gold platinum titanium anvil hammer shield armor armour helmet tank bunker fortress castle tower dam barrier block cube pillar column statue monument tombstone coffin safe vault lock door ');
  grp('lamp', { l: 0.95, hue: 52, r: 95 }, 'lamp candle glowstick flashlight lantern neon laser spotlight lighthouse bulb lightbulb led chandelier firefly fireflies glowworm bioluminescence moon moonlight starlight halo aurora spark sparkle glitter shine beacon torchlight headlight flare flash lightning bolt thunderbolt electricity electric plasma hologram disco discoball');
  grp('dark', { l: -0.75, hue: 250, r: 110 }, 'shadow shadows darkness night midnight void blackhole abyss cave cavern dungeon eclipse dusk gloom murk fog mist haze cloud clouds ink inkwell squid-ink blackout coal-dust soot cellar basement tomb crypt grave graveyard ghost ghosts phantom spirit shade nightmare');
  grp('flower', { n: 0.5, tag: 2, l: 0.15, hue: 320, r: 70, v: 0.8 }, 'flower flowers rose tulip daisy lily orchid lotus sunflower violet lavender jasmine poppy daffodil marigold blossom bloom petal petals bouquet garden meadow grass lawn clover moss fern ivy vine bush shrub tree oak pine palm bamboo cactus leaf leaves branch forest jungle plant seedling sapling bonsai hay straw wildflower dandelion thistle');
  grp('animal', { n: 0.7, tag: 3, hue: 30, r: 75 }, 'cat dog bird fish cow pig sheep goat horse duck goose rabbit mouse rat hamster squirrel deer fox wolf bear lion tiger leopard cheetah elephant giraffe zebra monkey gorilla panda koala kangaroo camel llama alpaca donkey mule frog toad turtle tortoise lizard gecko crocodile alligator dolphin whale shark seal otter beaver hedgehog bat owl eagle hawk parrot crow pigeon sparrow chicken rooster swan flamingo penguin hamster ferret pony puppy kitten bunny lamb calf chick duckling cub fawn');
  grp('bug', { n: 0.5, tag: 1, hue: 90, r: 65, v: 0.5 }, 'ant bee ladybug butterfly moth fly mosquito beetle cricket grasshopper dragonfly caterpillar worm earthworm snail slug termite cockroach flea tick maggot larva centipede millipede cicada locust mantis aphid weevil bug bugs insect insects');
  grp('water', { x: 0.3, n: 0.2, tag: 2, hue: 195, r: 100 }, 'rain river lake ocean sea stream brook waterfall puddle star wave tide tsunami flood fountain spring well shower dew drizzle monsoon rainbow raindrop bubble bubbles foam splash mist waterdrop');
  grp('tech', { p: 0.25, h: 0.25, l: 0.25, hue: 200, r: 75 }, 'computer laptop phone smartphone tablet robot android cyborg drone satellite rocket spaceship ufo radio television tv camera microphone speaker headphones keyboard mouse monitor server chip processor circuit wire cable battery charger engine motor machine gear cog turbine generator reactor internet wifi bluetooth cloud software code bug-report algorithm ai blockchain bitcoin pixel hacker virus-scan');
  grp('radio', { p: 0.8, h: 0.3, l: 0.6, hue: 95, r: 100 }, 'uranium plutonium radiation radioactive nuclear atomic fallout reactor-core isotope chernobyl nuke bomb warhead gamma xray x-ray neutron cesium radium fission fusion');
  grp('weapon', { p: 0.3, d: 0.4, h: 0.3, hue: 0, r: 70 }, 'sword knife dagger axe spear arrow bow crossbow gun pistol rifle cannon grenade dynamite tnt missile torpedo landmine mine bullet bullets ammo blade scythe sickle mace club hammer-war trident shuriken katana saber rapier bomb explosive explosion blast boom shotgun sniper tank-shell');
  grp('building', { d: 0.8, hue: 30, r: 85, life: 160 }, 'house home hut cabin cottage mansion palace skyscraper building apartment school church temple mosque pyramid bridge tunnel road street highway tower lighthouse windmill barn farm factory warehouse office shop store market mall hotel hospital prison jail bank library museum stadium theater cinema airport station harbor dock port wall');
  grp('space', { l: 0.5, d: 0.6, hue: 255, r: 100 }, 'planet mars venus jupiter saturn mercury neptune uranus pluto earth moon asteroid meteorite galaxy nebula universe cosmos orbit alien aliens martian astronaut spacesuit blackhole-edge quasar pulsar constellation starship meteor-shower stardust lunar satellite-dish');
  grp('magic', { l: 0.5, n: 0.4, tag: 4, hue: 270, r: 90 }, 'magic spell wizard witch sorcerer mage potion-magic wand unicorn fairy pixie elf gnome goblin troll ogre dragon phoenix griffin mermaid genie angel wish miracle enchantment charm talisman amulet rune runes crystal-ball tarot cauldron-magic spellbook sorcery mystic mystical arcane unicorn-horn stardust-magic fairydust pegasus centaur kraken hydra sphinx');
  grp('medicine', { n: 0.35, tag: 4, hue: 175, r: 70 }, 'medicine pill pills vitamin vitamins vaccine antibiotic aspirin bandage syrup-cough cure remedy antidote doctor nurse hospital-bed herbal tea-herbal ginseng ginger turmeric probiotic supplement protein bandaid');
  grp('soap', { p: 0.45, a: 0.2, hue: 190, r: 80 }, 'soap shampoo detergent bubblebath toothpaste mouthwash sanitizer disinfectant perfume cologne deodorant lotion makeup lipstick nailpolish hairspray fabric-softener laundry dishsoap');
  grp('spice', { n: 0.5, tag: 0, h: 0.5, hue: 15, r: 70 }, 'chili chilli jalapeno habanero wasabi mustard horseradish curry hotsauce tabasco salsa spice spices pepperoni paprika cayenne cumin saffron cardamom clove nutmeg sriracha harissa');
  grp('storm', { l: 0.7, h: 0.3, p: 0.25, x: 0.4, hue: 215, r: 110 }, 'storm thunder thunderstorm tornado hurricane typhoon cyclone twister lightning-storm tempest monsoon-storm sandstorm dust-storm earthquake quake avalanche landslide shockwave');
  grp('joy', { l: 0.4, n: 0.5, tag: 5, hue: 330, r: 90 }, 'love joy happy happiness laughter smile hug kiss friendship kindness hope peace harmony party celebration birthday wedding gift present balloon confetti music song dance melody rhythm singing lullaby cheer fun giggle cuddle romance heart hearts');
  grp('rage', { h: 0.55, p: 0.3, hue: 5, r: 85 }, 'anger angry rage fury hate hatred wrath war battle fight conflict riot revenge jealousy envy greed pride violence terror fear panic anxiety stress chaos mayhem disaster catastrophe doom apocalypse crisis drama tantrum');
  grp('sorrow', { l: -0.4, h: -0.25, hue: 235, r: 95 }, 'sad sadness sorrow grief cry crying tears tear loneliness lonely depression melancholy blues misery despair sorrowful gloomy rainy-day funeral boredom bored tired sleep sleepy nightmare-dream yawn silence');
  grp('person', { n: 0.55, tag: 3, hue: 20, r: 75 }, 'person man woman child baby kid boy girl king queen prince princess knight pirate ninja samurai cowboy clown wizard-man chef farmer doctor teacher student soldier police firefighter astronaut scientist artist musician singer dancer athlete runner swimmer hunter fisherman sailor captain mummy zombie vampire werewolf skeleton robot-man mime mascot santa grandma grandpa');
  grp('clothes', { s: 0.3, d: 0.1, hue: 300, r: 70 }, 'shirt pants dress skirt hat cap shoe shoes sock socks glove gloves scarf coat jacket sweater hoodie jeans tie bowtie belt bag backpack purse wallet umbrella glasses sunglasses watch ring necklace bracelet earring crown mask cape blanket pillow towel sheet curtain carpet rug sofa couch bed');
  grp('toy', { d: 0.3, hue: 340, r: 65 }, 'ball toy toys doll teddy lego puzzle kite frisbee yoyo marble marbles dice cards chess checkers domino blocks rattle balloon-toy skateboard bicycle bike scooter tricycle swing slide seesaw trampoline sandbox playground');
  grp('vehicle', { d: 0.5, h: 0.2, p: 0.2, hue: 15, r: 85 }, 'car truck bus train tram subway taxi van jeep tractor bulldozer excavator crane motorcycle boat ship submarine yacht canoe kayak raft ferry plane airplane jet helicopter blimp balloon-ride rocket-ship sled wagon cart carriage chariot tank ambulance firetruck racecar');
  grp('tool', { d: 0.5, hue: 205, r: 65 }, 'hammer wrench screwdriver pliers saw drill nail screw bolt nut-bolt shovel rake hoe pickaxe ladder rope chain hook net trap bucket barrel box crate chest basket jar bottle can cup mug glass plate bowl spoon fork knife-kitchen pan pot lid broom mop brush comb scissors needle thread pen pencil crayon paintbrush ruler stapler tape-measure');
  grp('paper', { s: 0.2, n: 0.15, tag: 0, hue: 50, r: 65 }, 'paper book books newspaper magazine letter envelope map scroll note notebook diary calendar poster flag banner ticket coupon receipt cardboard napkin tissue tissue-box confetti-paper origami');
  grp('sound', { x: 0.5, l: 0.2, hue: 280, r: 100 }, 'noise sound echo scream shout whisper roar bang crash boom-sound siren alarm bell gong drum trumpet violin guitar piano flute harp saxophone orchestra opera choir thunder-clap buzz hum purr growl howl bark meow moo');
  grp('time', { x: 0.2, l: 0.1, hue: 215, r: 90 }, 'time clock hourglass second minute hour day week month year century eternity past future today tomorrow yesterday history memory dream dreams fate destiny luck chance');
  grp('gas', { x: 0.7, p: 0.3, hue: 150, r: 110 }, 'gas fart methane smog fumes exhaust stink stench odor smell perfume-cloud carbon-dioxide co2 oxygen helium hydrogen nitrogen ozone vapour vapor cloud-gas ether chloroform');
  grp('stuff', { d: 0.25, hue: 220, r: 65 }, 'thing stuff object item junk sand dust dirt soil earth gravel pebbles salt pepper-grain ash flour-dust sawdust glass mirror plastic rubber foam sponge cotton wool silk leather fur feather feathers bone bones skull shell shells coral pearl amber ivory horn tooth teeth claw claws');
  grp('egg', { n: 0.85, tag: 0, s: 0.2, hue: 55, r: 65 }, 'eggs-nest nest hatchling caviar-roe roe spawn frogspawn yolk omelet eggnog');
  grp('rich', { n: 1.0, tag: 2, hue: 160, r: 90, v: 0.5 }, 'food feast banquet buffet meal lunch dinner breakfast brunch snack supper picnic bounty harvest feast-table cornucopia manna ambrosia fertilizer compost manure nutrients plankton krill nutrient miracle-grow superfood');
  grp('crowd', { n: 0.6, tag: 5, x: 0.4, hue: 25, r: 100 }, 'crowd army mob swarm herd flock pack school colony nation city town village family tribe team crew gang band orchestra-crowd audience congregation');

  grp('nature', { d: 0.55, hue: 120, r: 90, life: 150 }, 'mountain hill cliff canyon valley desert dune beach island reef rockpile cave-wall ridge peak summit plateau mesa crater boulder-field outcrop cairn stalagmite stalactite headland shore coast cove lagoon delta');
  grp('seafood2', { n: 0.8, tag: 3, hue: 200, r: 70 }, 'plankton jellyfish starfish seahorse urchin barnacle eel manta stingray swordfish marlin mackerel herring carp bass pike perch catfish goldfish koi guppy clownfish angelfish piranha barracuda walrus narwhal orca manatee dugong nautilus cuttlefish prawn crayfish crawfish scallop abalone periwinkle limpet');
  grp('world-food', { n: 0.9, tag: 0, hue: 40, r: 70 }, 'paella risotto gnocchi ravioli tiramisu gelato cannoli focaccia baguette brioche crepe quiche fondue raclette schnitzel strudel pretzel-bread goulash borscht pierogi falafel hummus pita shawarma baklava couscous tagine biryani samosa naan dosa paneer tikka masala dumpling gyoza bao dimsum tempura udon miso mochi bento teriyaki kimchi bibimbap pho banhmi satay laksa adobo empanada tamale quesadilla nachos guacamole churro ceviche poutine haggis scone crumpet trifle');
  grp('weather2', { x: 0.5, h: -0.2, hue: 210, r: 100 }, 'wind breeze gust cyclone-wind draft whirlwind fog-bank drizzle-rain overcast humidity dewdrop frost-bite sleet-storm rainstorm snowstorm whiteout');
  grp('craft', { d: 0.3, s: 0.15, hue: 25, r: 65 }, 'yarn knitting quilt tapestry pottery vase urn jug teapot candlestick figurine doll-house mosaic sculpture painting canvas easel palette sketch drawing cartoon comic novel poem story legend myth fable fairytale');
  grp('sports', { d: 0.25, hue: 140, r: 70 }, 'football soccer basketball baseball tennis golf hockey rugby cricket volleyball badminton boxing wrestling judo karate skiing surfing skating diving archery fencing bowling darts billiards marathon sprint olympics trophy medal');
  grp('mythic', { l: 0.4, h: 0.3, p: 0.2, hue: 300, r: 95 }, 'kraken-ink leviathan behemoth chimera minotaur cyclops gorgon medusa cerberus banshee wraith lich golem gargoyle imp ifrit djinn valkyrie titan colossus yeti-lord bigfoot nessie chupacabra thunderbird roc basilisk wyvern');
  grp('shiny', { l: 0.6, d: 0.3, hue: 55, r: 75 }, 'treasure jewel jewels coin coins gold-coin pirate-gold loot hoard riches crown-jewel trinket tiara scepter chalice goblet medallion bling sparkler tinsel ornament disco-ball mirror-ball');
  grp('doom', { p: 0.6, a: 0.3, h: 0.3, hue: 70, r: 100 }, 'wasteland toxic-waste sludge-pit oil-spill tar-pit sewer swamp-gas landfill junkyard scrapyard slag lava-rock chemical chemicals reagent bio-hazard biohazard zombie-virus pandemic outbreak quarantine');
  const TABLE = {};
  for (let i = 0; i < GROUPS.length; i++) {
    const g = GROUPS[i];
    for (let j = 0; j < g.words.length; j++) {
      const w = g.words[j].toLowerCase();
      if (!TABLE[w]) TABLE[w] = g;
    }
  }
  G.wordCount = function () { return Object.keys(TABLE).length; };

  function stem(w) {
    const out = [w];
    if (w.length > 3 && w.endsWith('ies')) out.push(w.slice(0, -3) + 'y');
    if (w.length > 3 && w.endsWith('es')) out.push(w.slice(0, -2));
    if (w.length > 2 && w.endsWith('s')) out.push(w.slice(0, -1));
    if (w.length > 4 && w.endsWith('ing')) out.push(w.slice(0, -3), w.slice(0, -3) + 'e');
    if (w.length > 3 && w.endsWith('ed')) out.push(w.slice(0, -2), w.slice(0, -1));
    if (w.length > 3 && w.endsWith('y')) out.push(w.slice(0, -1));
    if (w.length > 3 && w.endsWith('er')) out.push(w.slice(0, -2));
    return out;
  }
  function lookup(w) {
    const forms = stem(w);
    for (let i = 0; i < forms.length; i++) if (TABLE[forms[i]]) return TABLE[forms[i]];
    return null;
  }
  // a long word made of known words ("firestorm", "icecream"): the known parts, longest first, not overlapping
  function compound(w) {
    const found = [], used = new Array(w.length).fill(false);
    for (let len = Math.min(w.length - 2, 9); len >= 4 && found.length < 3; len--) {
      for (let s = 0; s + len <= w.length && found.length < 3; s++) {
        let free = true;
        for (let i = s; i < s + len; i++) if (used[i]) free = false;
        const part = w.substr(s, len);
        if (free && TABLE[part]) { found.push(TABLE[part]); for (let i = s; i < s + len; i++) used[i] = true; }
      }
    }
    return found;
  }

  const PROPS = ['nutrition', 'poison', 'heat', 'light', 'sticky', 'acid', 'hard', 'spread', 'eats', 'moves', 'pull', 'vault', 'deadly'];
  function clampThing(t) {
    const pr = t.props || {};
    const o = {
      nutrition: clamp(+pr.nutrition || 0, 0, 1), poison: clamp(+pr.poison || 0, 0, 1), heat: clamp(+pr.heat || 0, -1, 1),
      light: clamp(+pr.light || 0, -1, 1), sticky: clamp(+pr.sticky || 0, 0, 1), acid: clamp(+pr.acid || 0, 0, 1),
      hard: clamp(+pr.hard || 0, 0, 1), spread: clamp(+pr.spread || 0, 0, 1),
      deadly: clamp(+pr.deadly || 0, 0, 1), vault: clamp(+pr.vault || 0, 0, 0.7), eats: clamp(+pr.eats || 0, 0, 1), moves: clamp(+pr.moves || 0, 0, 1), pull: clamp(+pr.pull || 0, -1, 1),
    };
    return {
      name: String(t.name || 'thing').slice(0, 28),
      props: o,
      tag: clamp(Math.round(+t.tag || 0), 0, 5),
      hue: ((+t.hue || 0) % 360 + 360) % 360,
      shape: clamp(Math.round(+t.shape || 0), 0, 4),
      radius: clamp(+t.radius || 80, 40, 150),
      life: clamp(+t.life || 120, 60, 240),
      note: String(t.note || '').slice(0, 160),
      source: t.source || 'table',
      svg: t.svg ? G.safeSvg(t.svg) : '',
      model: String(t.model || '').slice(0, 60),
      sig: t.sig >= 0 && t.sig <= 5 ? t.sig | 0 : -1,
      weak: typeof t.weak === 'string' ? G.weakIndex(t.weak) : (t.weak >= 0 && t.weak <= 4 ? t.weak | 0 : -1),
      alive: clamp(+t.alive || 0, 0, 1),
      look: G.cleanLook ? G.cleanLook(t.look) : null,
      act: G.cleanActs ? (G.cleanActs(t) || (t.source !== 'ai' && G.actsFromWord ? G.actsFromWord(t.name) : null)) : null,      // what it DOES of its own (54c_acts.js)
    };
  }
  G.clampThing = clampThing;
  // pictures are cleaned in the browser; a server-side run of the simulation only carries them along
  G.safeSvg = function (s) { return window.DOMParser ? G.sanitizeSvg(s) : String(s || '').slice(0, 6000); };

  const TAGNAMES = ['gold', 'lime', 'green', 'blue', 'violet', 'pink'];
  function describe(t) {
    const p = t.props, bits = [];
    if (p.nutrition > 0.25) bits.push((p.nutrition > 0.7 ? 'rich ' : '') + TAGNAMES[t.tag] + ' food');
    if (p.poison > 0.25) bits.push('poison');
    if (p.heat > 0.3) bits.push('heat'); else if (p.heat < -0.3) bits.push('cold');
    if (p.light > 0.3) bits.push('light'); else if (p.light < -0.3) bits.push('darkness');
    if (p.sticky > 0.3) bits.push('stickiness');
    if (p.acid > 0.3) bits.push('acid');
    if (p.hard > 0.3) bits.push('a solid wall');
    if (p.deadly > 0.3) bits.push('death at a touch');
    if (p.vault > 0.2) bits.push('a wall that locks food away');
    if (p.eats > 0.3) bits.push('something that eats what touches it');
    if (p.moves > 0.3) bits.push('a wanderer');
    if (p.pull > 0.3) bits.push('a pull that draws creatures in'); else if (p.pull < -0.3) bits.push('a push that drives creatures away');
    if (!bits.length) bits.push('a faint stir');
    return 'Gives the star ' + bits.join(', ') + '.';
  }

  function combine(a, b) {
    const o = { props: {}, tag: a.tag, hue: a.hue, radius: Math.max(a.radius, b.radius), life: Math.max(a.life, b.life), alive: Math.max(a.alive || 0, b.alive || 0) };
    for (let i = 0; i < PROPS.length; i++) {
      const k = PROPS[i];
      const x = a.props[k], y = b.props[k];
      o.props[k] = Math.abs(x) >= Math.abs(y) ? x : y;
    }
    if (b.props.nutrition > a.props.nutrition) { o.tag = b.tag; o.hue = b.hue; }
    return o;
  }

  function offlineThing(word) {
    const raw = String(word || '').trim().slice(0, 80) || 'thing';
    const toks = raw.toLowerCase().replace(/[^a-z0-9\- ]+/g, ' ').split(/\s+/).filter(Boolean).slice(0, 10);
    const h = G.hash(raw.toLowerCase());
    const rnd = G.rng(h);
    let acc = null, known = 0;
    for (let i = 0; i < toks.length; i++) {
      let gs = [];
      const one = lookup(toks[i]);
      if (one) gs = [one]; else if (toks[i].length >= 6) gs = compound(toks[i]);
      for (let gi = 0; gi < gs.length; gi++) {
      const g = gs[gi];
      known++;
      const p = g.p;
      // each word is a little different from its group: a stable wobble from its own hash
      const wr = G.rng(G.hash(toks[i]));
      const j = function (v) { return v ? v * (0.85 + wr() * 0.3) : 0; };
      const t = {
        props: { nutrition: clamp(j(p.n), 0, 1), poison: clamp(j(p.p), 0, 1), heat: clamp(j(p.h), -1, 1), light: clamp(j(p.l), -1, 1), sticky: clamp(j(p.s), 0, 1), acid: clamp(j(p.a), 0, 1), hard: clamp(j(p.d), 0, 1), spread: clamp(j(p.x), 0, 1) },
        tag: p.tag === undefined ? 2 : p.tag,
        hue: p.hue + (wr() - 0.5) * 26, radius: (p.r || 80) * (0.85 + wr() * 0.35), life: p.life || 110 + wr() * 40,
        alive: p.v || 0,
      };
      acc = acc ? combine(acc, t) : t;
      }
    }
    if (!acc) {
      // never heard of it: the pond improvises, always the same way for the same word
      const kinds = ['nutrition', 'poison', 'heat', 'light', 'sticky', 'acid', 'hard', 'spread'];
      const props = {};
      const n = 1 + Math.floor(rnd() * 2.4);
      for (let i = 0; i < n; i++) {
        const k = kinds[Math.floor(rnd() * kinds.length)];
        props[k] = (0.45 + rnd() * 0.5) * (k === 'heat' && rnd() < 0.4 ? -1 : 1);
      }
      acc = { props: props, tag: Math.floor(rnd() * 6), hue: rnd() * 360, radius: 70 + rnd() * 40, life: 100 + rnd() * 60, alive: rnd() < 0.3 ? 0.5 : 0 };
    }
    // what it does, read from the words: "a plant which eats everything", "a walking rock", "magnet"
    const low = ' ' + raw.toLowerCase() + ' ';
    if (/\b(eat|eats|eating|devour|devours|hungry|carnivor|swallow|gobbl|chomp|bites?|predator|shark|monster|venus|flytrap|man-?eater)/.test(low)) { acc.props.eats = 0.75; acc.alive = Math.max(acc.alive || 0, 0.5); }
    if (/(one touch|single touch|instant|immediately|at once|deadly|lethal|death ray|insta-?kill|kills? (them|creatures|everything|everyone|anything)|killer|assassin|executioner|reaper)/.test(low)) { acc.props.deadly = 0.9; acc.props.eats = Math.max(acc.props.eats || 0, 0.4); }
    if (/\b(walk|walking|run|running|swim|swimming|fly|flying|moving|moves|roam|wander|crawl|chas|hunt|drift|rolling|fast|predator|hunter|stalk|prowl|shark|monster|beast)/.test(low) || (toks.some(function (w) { const g2 = lookup(w); return g2 && /animal|bug|vehicle|person|seafood2/.test(g2.label); }))) acc.props.moves = 0.6;
    if (/\b(magnet|attract|lure|vacuum|black ?hole|whirlpool|vortex|suck|pull|hypnot|siren)/.test(low)) acc.props.pull = 0.75;
    if (/\b(wall|cage|locked?|vault|safe|fence|behind|trapped|sealed|shell|bars|prison|fortress|dome|bubble)\b/.test(low)) { acc.props.vault = 0.6; acc.props.hard = 1; acc.props.nutrition = 0; }
    if (/\b(repel|scar[ey]|fear|stink|push|blow|fan|scarecrow|horror|terrify)/.test(low)) acc.props.pull = -0.7;
    const out = {
      name: (raw.length > 26 ? raw.split(/\s+/).slice(0, 3).join(' ') : raw).replace(/^./, function (ch) { return ch.toUpperCase(); }),
      props: acc.props, tag: acc.tag, hue: acc.hue, shape: h % 5, radius: acc.radius, life: acc.life, alive: acc.alive || 0,
      source: known ? 'table' : 'guess',
    };
    out.note = (known ? '' : 'Never heard of it, so the star improvised. ') + describe(clampThing(out));
    return clampThing(out);
  }

  // the same word is never exactly the same twice: a little random wobble on every answer
  function wobble(t) {
    const j = function (v, lo, hi, a) { return Math.max(lo, Math.min(hi, v + (Math.random() - 0.5) * 2 * a)); };
    const p = t.props;
    for (const k in p) if (p[k]) p[k] = j(p[k], k === 'heat' || k === 'light' || k === 'pull' ? -1 : 0, 1, 0.07);
    t.hue = (t.hue + (Math.random() - 0.5) * 24 + 360) % 360;
    t.radius = j(t.radius, 40, 150, 8); t.life = j(t.life, 60, 240, 12);
    return t;
  }

  // ── mutation ideas: offline imagination ──
  const ADJ = ['Lantern', 'Armoured', 'Spiky', 'Swift', 'Big-mouthed', 'Fringed', 'Venomous', 'Hardy', 'Wide-eyed', 'Plump', 'Sleek', 'Shimmering'];
  const IDEAS = [
    { n: 'lure', parts: [{ k: 5, a: 3.1, s: 1 }, { k: 4, a: 0.5, s: 0.8 }] },
    { n: 'back plate', parts: [{ k: 3, a: 3.1, s: 1.2 }, { k: 3, a: 2.4, s: 1 }] },
    { n: 'crown', parts: [{ k: 2, a: -0.6, s: 1 }, { k: 2, a: 0, s: 1.1 }, { k: 2, a: 0.6, s: 1 }] },
    { n: 'tail', parts: [{ k: 7, a: 3.14, s: 1.1 }, { k: 1, a: 1.7, s: 0.9 }] },
    { n: 'gulp', parts: [{ k: 0, a: 0.2, s: 1.4 }] },
    { n: 'fringe', parts: [{ k: 8, a: 1.2, s: 1 }, { k: 8, a: -1.2, s: 1 }, { k: 4, a: 0.2, s: 1 }] },
    { n: 'sting', parts: [{ k: 6, a: 2.6, s: 1 }, { k: 2, a: 3.1, s: 0.9 }] },
    { n: 'thick skin', chem: [0, 0, 0, 0, 0, 0, 0.15, 0.15, 0.15] },
    { n: 'big body', size: 2.2 },
    { n: 'sharp senses', parts: [{ k: 4, a: 0.4, s: 1 }, { k: 4, a: -0.4, s: 1 }] },
    { n: 'paddles', parts: [{ k: 1, a: 1.6, s: 1 }, { k: 1, a: -1.6, s: 1 }] },
    { n: 'pair of arms', segs: [{ p: -1, a: 1.3, d: 1.1, s: 0.4, n: 2, m: 1 }] },
    { n: 'head', segs: [{ p: -1, a: 0, d: 1.1, s: 0.55, n: 1 }], parts: [{ k: 4, a: 0.2, s: 1, on: 0 }, { k: 4, a: -0.2, s: 1, on: 0 }] },
    { n: 'tentacles', segs: [{ p: -1, a: 0, d: 1.2, s: 0.35, n: 5 }] },
    { n: 'legs and feet', segs: [{ p: -1, a: 2.1, d: 1.1, s: 0.4, n: 2, m: 1 }, { p: 0, a: 0.2, d: 1.1, s: 0.3, n: 1 }] },
    { n: 'new taste', chem: [0.1, 0.15, 0, 0.18, 0.18, 0.18, 0, 0, 0] },
  ];
  function offlineIdeas(input) {
    const r = G.rng((G.W ? G.W.gen : 0) * 977 + 11);
    const out = [];
    const n = 6;
    for (let i = 0; i < n; i++) {
      const base = IDEAS[Math.floor(r() * IDEAS.length)];
      out.push({ name: ADJ[Math.floor(r() * ADJ.length)] + ' ' + base.n, parts: base.parts, chem: base.chem, size: base.size, segs: base.segs });
    }
    return out;
  }

  // ── SVG from a server must be tame: shapes only, no scripts, no links ──
  const OK_TAGS = { svg: 1, g: 1, circle: 1, ellipse: 1, rect: 1, path: 1, polygon: 1, polyline: 1, line: 1, defs: 1, lineargradient: 1, radialgradient: 1, stop: 1 };
  const OK_ATTR = { viewbox: 1, width: 1, height: 1, cx: 1, cy: 1, r: 1, rx: 1, ry: 1, x: 1, y: 1, x1: 1, y1: 1, x2: 1, y2: 1, d: 1, points: 1, fill: 1, stroke: 1, 'stroke-width': 1, opacity: 1, 'fill-opacity': 1, 'stroke-opacity': 1, transform: 1, offset: 1, 'stop-color': 1, 'stop-opacity': 1, id: 1, xmlns: 1, 'stroke-linecap': 1, 'stroke-linejoin': 1 };
  G.sanitizeSvg = function (str) {
    str = String(str || '');
    if (str.length > 6000 || !window.DOMParser || !window.XMLSerializer) return '';
    try {
      const doc = new window.DOMParser().parseFromString(str, 'image/svg+xml');
      const root = doc.documentElement;
      if (!root || root.nodeName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) return '';
      const walk = function (el) {
        const kids = Array.prototype.slice.call(el.children);
        for (let i = 0; i < kids.length; i++) {
          const k = kids[i];
          if (!OK_TAGS[k.nodeName.toLowerCase()]) { el.removeChild(k); continue; }
          walk(k);
        }
        const attrs = Array.prototype.slice.call(el.attributes);
        for (let i = 0; i < attrs.length; i++) {
          const a = attrs[i], n = a.name.toLowerCase();
          const v = String(a.value);
          if (!OK_ATTR[n] || /url\s*\((?!#)/i.test(v) || /javascript|data:|http|<|script/i.test(v)) el.removeAttribute(a.name);
        }
      };
      walk(root);
      root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      return new window.XMLSerializer().serializeToString(root);
    } catch (e) { return ''; }
  };

  // ── the one door: G.ai.ask(task, input, schema) → Promise ──
  const providers = {
    offline: function (task, input) {
      if (task === 'thing') return Promise.resolve(wobble(offlineThing(input)));
      if (task === 'mutation-ideas') return Promise.resolve(offlineIdeas(input));
      if (task === 'organ') return Promise.resolve(G.offlineOrgan());
      if (task === 'marvel') return Promise.resolve(null);      // the built-in marvels stand in
      if (task === 'event') return Promise.resolve(G.offlineEvent(input));
      if (task === 'story') return Promise.resolve(G.offlineStory(input));
      if (task === 'design') return Promise.resolve(G.offlineDesign());
      if (task === 'plan') return Promise.resolve(G.offlinePlan());
      if (task === 'judge') return Promise.resolve(null);      // without a server the pond goes by its own taste
      return Promise.reject(new Error('unknown task ' + task));
    },
    // a server on the site can answer through Plaxzy.ai.ask(task, input, schema); until then this is never used
    server: function (task, input, schema) {
      if (G.host && G.host.ready && G.host.caps.ai) {
        if (task === 'thing') return G.host.call('ai.thing', { word: input, model: G.ai.model || undefined, pond: G.thingsBrief ? G.thingsBrief() : undefined }, 45000).then(function (r) { G.ai.tally('thing', r.thing && r.thing.source, r.usd); return r.thing; });
        if (task === 'mutation-ideas') return G.host.call('ai.ideas', Object.assign({}, input, { model: G.ai.model || undefined }), 45000).then(function (r) { G.ai.tally('ideas', r.source, r.usd); return r.ideas; });
        if (task === 'event') return G.host.call('ai.event', { text: input, model: G.ai.model || undefined }, 45000).then(function (r) { G.ai.tally('event', r.source, r.usd); return r.event; });
        if (task === 'story') return G.host.call('ai.story', Object.assign({}, input, { model: G.ai.model || undefined }), 45000).then(function (r) { G.ai.tally('story', r.source, r.usd); return r.story; });
        if (task === 'plan') return G.host.call('ai.plan', Object.assign({}, input, { model: G.ai.model || undefined }), 45000).then(function (r) { G.ai.tally('plan', r.source, r.usd); return r.plan; });
        if (task === 'design') return G.host.call('ai.design', Object.assign({}, input, { model: G.ai.model || undefined }), 45000).then(function (r) { G.ai.tally('design', r.source, r.usd); return r.design; });
        if (task === 'judge') return G.host.call('ai.judge', Object.assign({}, input, { model: G.ai.model || undefined }), 70000).then(function (r) { G.ai.tally(input.kind === 'check' ? 'check' : input.kind === 'watch' ? 'watch' : 'judge', r.source, r.usd); return r.judge; });
        if (task === 'marvel') return G.host.call('ai.marvel', Object.assign({}, input, { model: G.ai.model || undefined }), 45000).then(function (r) { G.ai.tally('marvel', r.source, r.usd); return r.marvel; });
        if (task === 'organ') return G.host.call('ai.organ', Object.assign({}, input, { model: G.ai.model || undefined }), 45000).then(function (r) { G.ai.tally('organ', r.source, r.usd); return r.organ; });
      }
      if (window.Plaxzy && window.Plaxzy.ai && typeof window.Plaxzy.ai.ask === 'function') {
        return Promise.resolve(window.Plaxzy.ai.ask(task, input, schema));
      }
      return Promise.reject(new Error('no server'));
    },
  };
  G.ai = {
    provider: 'offline',
    drawn: true,         // creatures are drawn by the game, every part moving (the AI-painting path exists but is off)
    cache: {},
    models: [],          // what the server offers: [{ id, label }]
    model: '',           // the player's choice ('' = the server's default)
    // automatic calls (organs, the story, mutation ideas) are limited by wall-clock time and a session budget,
    // so the cost is the same whether the pond runs at 1x or 64x, for a minute or a day
    gaps: { organ: 40000, story: 45000, 'mutation-ideas': 120000, sound: 8000, judge: 40000, check: 3000, watch: 9000, marvel: 12000, nature: 120000, design: 50000, paint: 22000, plan: 55000 },
    caps: { organ: 30, story: 40, 'mutation-ideas': 20, sound: 15, judge: 45, check: 36, watch: 500, marvel: 40, nature: 60, design: 18, paint: 16, plan: 18 },
    used: {}, lastAt: {},
    // what this session has asked the server for: { kind: { asked, fresh } }. "fresh" = a model really ran;
    // the rest came from the server's library of earlier decisions and cost nothing.
    count: {},
    usd: 0, unpriced: 0,
    fuel: null,          // null = no limit. A number = fresh AI answers left; the host sets it (and can top it up).
    hasFuel: function () { return G.ai.fuel === null || G.ai.fuel > 0; },
    // every answer that came from a server is written down: what it was for, whether a model really ran, and what it cost
    ledger: [],          // this session, newest last: { at, kind, paid, usd }
    life: {},            // this pond since it began (kept in its save): { kind: { asked, fresh, usd } }
    LABEL: { thing: 'Things you typed', event: 'World events you typed', nature: 'What the star does by itself (invented events)', organ: 'New organs', story: 'Story chapters', ideas: 'Mutation ideas', judge: 'The eye for beauty: grading the creatures by looking at them', check: 'The eye for beauty: looking over new ideas', watch: 'The watcher: looking at living creatures and grading them', marvel: 'Rare marvels: inventing a gift for a lucky creature', design: 'New kinds of body part', plan: 'New shapes of body', paint: 'Painted creatures (Leonardo)', sound: 'Sounds (Leonardo)' },
    tally: function (kind, source, usd) {
      const c = G.ai.count[kind] || (G.ai.count[kind] = { asked: 0, fresh: 0, usd: 0 });
      c.asked++;
      const paid = source === 'ai' || source === 'leonardo', L = G.ai.life[kind] || (G.ai.life[kind] = { asked: 0, fresh: 0, usd: 0 });
      L.asked++; if (paid) { L.fresh++; if (typeof usd === 'number') L.usd += usd; }
      G.ai.ledger.push({ at: Date.now(), kind: kind, paid: paid, usd: paid && typeof usd === 'number' ? usd : paid ? null : 0, gen: G.W ? G.W.gen : 0 });
      if (G.ai.ledger.length > 300) G.ai.ledger.shift();
      if (source === 'ai' || source === 'leonardo') {
        c.fresh++;
        if (typeof usd === 'number') { c.usd = (c.usd || 0) + usd; G.ai.usd += usd; } else G.ai.unpriced++;      // a model with no price set
        if (G.ai.fuel !== null) { G.ai.fuel = Math.max(0, G.ai.fuel - 1); G.emit('fuel', G.ai.fuel, kind); }
      }
      G.emit('ai-used', kind, source);
    },
    totals: function () { let a = 0, f = 0; for (const k in G.ai.count) { a += G.ai.count[k].asked; f += G.ai.count[k].fresh; } return { asked: a, fresh: f, usd: G.ai.usd, unpriced: G.ai.unpriced }; },
    money: function (v) { return '$' + (v < 0.1 ? v.toFixed(3) : v.toFixed(2)); },
    allow: function (kind) {
      if (!G.ai.hasFuel()) return false;
      const now = Date.now(), n = G.ai.used[kind] || 0;
      if (n >= (G.ai.caps[kind] || 1e9) || now - (G.ai.lastAt[kind] || 0) < (G.ai.gaps[kind] || 0)) return false;
      G.ai.used[kind] = n + 1; G.ai.lastAt[kind] = now;
      return true;
    },
    labelOf: function (id) { for (let i = 0; i < G.ai.models.length; i++) if (G.ai.models[i].id === id) return G.ai.models[i].label; return ''; },
    pending: 0,
    available: function () { return !!((G.host && G.host.ready && G.host.caps.ai) || (window.Plaxzy && window.Plaxzy.ai && typeof window.Plaxzy.ai.ask === 'function')); },
    ask: function (task, input, schema) {
      const useServer = G.ai.provider === 'server' && G.ai.available() && G.ai.hasFuel();     // out of fuel: the pond imagines by itself
      const fin = function (res) {
        if (task === 'thing') res = clampThing(res);   // never cached: the same word comes out a little different each time
        else if (task === 'event') { res = G.cleanEvent(res, input); if (!res) res = G.offlineEvent(input); }
        else if (task === 'story') res = G.cleanStory(res, input) || G.offlineStory(input);
        else if (task === 'skin') res = G.cleanSkin(res);
        return res;
      };
      G.ai.pending++;
      const done = function () { G.ai.pending--; };
      const p = (useServer ? providers.server(task, input, schema) : providers.offline(task, input))
        .catch(function (err) { if (err && err.refused) throw err; return providers.offline(task, input); })   // the game never waits on, or depends on, a server
        .then(fin);
      p.then(done, done);
      return p;
    },
  };
  // keep the idea pool filled; the sim only ever reads W.pool
  G.ai.refill = function () {
    const W = G.W;
    if (!W || W.poolBusy) return;
    // with a server: only now and then; the pool is reused in between
    if (G.ai.provider === 'server' && G.ai.available() && W.pool.length && !G.ai.allow('mutation-ideas')) return;
    W.poolBusy = true;
    G.ai.ask('mutation-ideas', { gen: W.gen, species: W.species.filter(function (s) { return !s.extinct; }).slice(0, 8).map(function (s) { return { name: s.name, n: s.n }; }) })
      .then(function (ideas) { if (G.W === W && Array.isArray(ideas)) W.pool = ideas.slice(0, 24); W.poolBusy = false; }, function () { W.poolBusy = false; });
  };
  G.on('scored', function (h) { if (h.gen % 4 === 1) G.ai.refill(); });
  G.on('new-pond', function () { G.ai.life = {}; });      // a new pond starts its own account
})();
