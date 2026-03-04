import fetch from "node-fetch";

let municipalitiesCache = null;

// Hämta alla kommuner från taxonomy och cacha i minnet
export async function loadMunicipalities() {
  if (municipalitiesCache) return municipalitiesCache;

  const res = await fetch(
    "https://taxonomy.api.jobtechdev.se/v1/taxonomy/specific/concepts/municipality",
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) {
    throw new Error(
      `Failed to load municipalities: ${res.status} ${res.statusText}`
    );
  }
  municipalitiesCache = await res.json();
  return municipalitiesCache;
}

// Hitta kommunkod utifrån stadsnamn, t.ex. "Lund"
export async function getMunicipalityCodeByCityName(cityName) {
  const all = await loadMunicipalities();
  const lower = cityName.toLowerCase();

  // matcha exakt preferred-label = "Lund" (kommunnamn)
  const hit = all.find(
    (m) => m["taxonomy/preferred-label"]?.toLowerCase() === lower
  );

  return hit ? hit["taxonomy/lau-2-code-2015"] : null;
}
