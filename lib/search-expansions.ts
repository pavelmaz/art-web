// Smart-search synonym / correlation map.
//
// Some searches have little or no *literal* match but a clear semantic
// neighbourhood — e.g. "botanical" should also surface trees, mushrooms, ferns
// and flowers. runSiteSearch() expands a query through this map and appends the
// correlated artworks after the exact matches (exact always ranks first).
//
// Keys and values are lowercase. A key's own term is always included implicitly.
// Keep values mostly single words so they match both title text and the `tags`
// array cleanly. Extend freely — this is a plain data table.

const EXPANSIONS: Record<string, string[]> = {
  // ── Nature / botanical ───────────────────────────────────────────────
  botanical: ["botanical illustration", "flowers", "flower", "floral", "plants", "plant", "tree", "trees", "leaf", "foliage", "fern", "mushroom", "fungi", "herbarium", "garden", "roses", "blossom"],
  botany: ["botanical", "plants", "flowers", "tree", "fern", "herbarium"],
  flowers: ["flower", "floral", "rose", "roses", "tulip", "bouquet", "botanical", "blossom", "still life", "garden"],
  flower: ["flowers", "floral", "rose", "botanical", "blossom"],
  plants: ["plant", "botanical", "tree", "trees", "leaf", "foliage", "fern", "flowers"],
  tree: ["trees", "forest", "woodland", "foliage", "botanical", "landscape"],
  trees: ["tree", "forest", "woodland", "foliage", "botanical", "landscape"],
  forest: ["trees", "tree", "woodland", "woods", "nature", "landscape"],
  mushroom: ["mushrooms", "fungi", "botanical", "nature"],
  mushrooms: ["mushroom", "fungi", "botanical", "nature"],
  garden: ["flowers", "botanical", "plants", "landscape"],

  // ── Animals & pets ───────────────────────────────────────────────────
  animals: ["animal", "horse", "horses", "dog", "dogs", "cat", "cats", "bird", "birds", "wildlife", "lion", "deer", "fox", "cattle"],
  animal: ["animals", "wildlife", "horse", "dog", "cat", "bird"],
  horse: ["horses", "equestrian", "cavalry", "pony", "animals"],
  horses: ["horse", "equestrian", "cavalry", "pony", "animals"],
  dog: ["dogs", "hound", "puppy", "hunting", "animals"],
  dogs: ["dog", "hound", "puppy", "hunting", "animals"],
  cat: ["cats", "kitten", "feline", "animals"],
  cats: ["cat", "kitten", "feline", "animals"],
  birds: ["bird", "ornithology", "audubon", "wildlife", "animals"],
  bird: ["birds", "ornithology", "wildlife", "animals"],
  wildlife: ["animals", "birds", "nature"],

  // ── Sea / marine ─────────────────────────────────────────────────────
  sea: ["ocean", "marine", "ship", "ships", "boat", "coast", "coastal", "waves", "harbor", "seascape"],
  ocean: ["sea", "marine", "waves", "coast", "ship", "seascape"],
  marine: ["sea", "ocean", "ship", "ships", "boat", "nautical", "seascape"],
  ship: ["ships", "boat", "sailing", "marine", "sea", "nautical"],
  ships: ["ship", "boat", "sailing", "marine", "sea", "nautical"],
  boat: ["boats", "ship", "sailing", "marine", "sea"],
  coast: ["coastal", "sea", "shore", "beach", "harbor", "cliffs"],

  // ── Night / celestial ────────────────────────────────────────────────
  moon: ["night", "stars", "lunar", "crescent", "celestial", "nocturne"],
  night: ["moon", "stars", "nocturne", "twilight", "dark", "starry"],
  stars: ["star", "night", "moon", "celestial", "astronomy", "constellation"],
  astronomy: ["celestial", "stars", "moon", "planets", "constellation", "maps"],
  celestial: ["astronomy", "stars", "moon", "constellation", "zodiac"],

  // ── Places / maps ────────────────────────────────────────────────────
  maps: ["map", "cartography", "atlas", "topography", "celestial"],
  map: ["maps", "cartography", "atlas", "topography"],
  mountains: ["mountain", "alps", "peak", "hills", "landscape"],
  mountain: ["mountains", "alps", "peak", "hills", "landscape"],

  // ── People ───────────────────────────────────────────────────────────
  portrait: ["portraits", "face", "figure", "people", "woman", "man"],
  woman: ["women", "girl", "lady", "female", "portrait", "figure"],
  women: ["woman", "girl", "lady", "female", "portrait", "figure"],

  // ── Themes ───────────────────────────────────────────────────────────
  mythology: ["myth", "gods", "goddess", "legend", "allegory", "muses"],
  religious: ["religion", "biblical", "saint", "angel", "madonna", "christ"],
  architecture: ["building", "buildings", "cathedral", "ruins", "city", "castle"],
  autumn: ["fall", "foliage", "harvest", "landscape"],
  winter: ["snow", "ice", "frost", "landscape"],
  posters: ["poster", "advertising", "art nouveau", "travel"],
};

/** Return the query plus its correlated terms (deduped, query first). */
export function expandSearchTerm(rawQuery: string): string[] {
  const term = rawQuery.trim().toLowerCase();
  if (!term) return [];
  const related = EXPANSIONS[term];
  if (!related) return [term];
  const out: string[] = [term];
  const seen = new Set([term]);
  for (const r of related) {
    if (!seen.has(r)) {
      seen.add(r);
      out.push(r);
    }
  }
  return out;
}
