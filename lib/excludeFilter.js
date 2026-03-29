// Apply exclude-word filters to mapped job results.
export function applyExcludeFilters(mapped, excludes = []) {
  if (!mapped || !Array.isArray(excludes) || excludes.length === 0) return mapped;
  const excludesLower = excludes.map((s) => String(s).toLowerCase()).filter(Boolean);

  try {
    // Ensure each item has an `id` field (generate from available fields when missing)
    if (Array.isArray(mapped.afMatches)) {
      mapped.afMatches.forEach((item) => {
        if (!item.id) {
          const composed = `${item.headline || ''}||${item.employer || ''}||${item.conditions || ''}`;
          item.id = composed || null;
        }
      });
    }
    if (Array.isArray(mapped.linkedinMatches)) {
      mapped.linkedinMatches.forEach((item) => {
        if (!item.id) {
          const composed = `${item.url || ''}||${item.title || ''}||${item.company || ''}||${item.location || ''}||${item.datetime || ''}`;
          item.id = composed || null;
        }
      });
    }
    if (Array.isArray(mapped.afMatches)) {
      mapped.afMatches = mapped.afMatches.filter((item) => {
        const hay = ((item.headline || "") + " " + (item.conditions || "")).toLowerCase();
        return !excludesLower.some((ex) => ex && hay.includes(ex));
      });
    }

    if (Array.isArray(mapped.linkedinMatches)) {
      mapped.linkedinMatches = mapped.linkedinMatches.filter((item) => {
        const hay = ((item.title || item.headline || "") + " " + (item.company || "") + " " + (item.description || "")).toLowerCase();
        return !excludesLower.some((ex) => ex && hay.includes(ex));
      });
    }

    // Adjust total if present
    try {
      const afCount = Array.isArray(mapped.afMatches) ? mapped.afMatches.length : 0;
      const liCount = Array.isArray(mapped.linkedinMatches) ? mapped.linkedinMatches.length : 0;
      const newTotal = afCount + liCount;

      if (mapped.total && typeof mapped.total === 'object' && mapped.total.value != null) {
        mapped.total.value = Math.max(0, Number(newTotal));
      } else if (mapped.total != null) {
        mapped.total = Math.max(0, Number(newTotal));
      } else {
        mapped.total = { value: newTotal };
      }
    } catch (e) {
      // ignore
    }
  } catch (e) {
    // ignore filter errors
  }

  return mapped;
}
