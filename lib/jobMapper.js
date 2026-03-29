// Map JobSearch API responses to a minimal set of fields requested by UX.
export function mapJobSearchResult(raw) {
  if (!raw) return { total: 0, items: [] };

  let arr = [];
  if (Array.isArray(raw)) arr = raw;
  else if (Array.isArray(raw.results)) arr = raw.results;
  else if (Array.isArray(raw.hits)) arr = raw.hits;
  else if (raw.hits && Array.isArray(raw.hits.hits)) arr = raw.hits.hits;
  else if (Array.isArray(raw.items)) arr = raw.items;
  else if (Array.isArray(raw['@graph'])) arr = raw['@graph'];
  else if (Array.isArray(raw.result)) arr = raw.result;

  const parseDate = (v) => {
    if (!v) return null;
    try {
      const d = new Date(v);
      if (!isNaN(d)) return d.toISOString().slice(0, 10); // YYYY-MM-DD
    } catch (e) { }
    return null;
  };

  const findLink = (links, rels = ["application", "self"]) => {
    if (!links) return null;
    if (typeof links === "string") return links;
    if (Array.isArray(links)) {
      for (const rel of rels) {
        const hit = links.find((l) => (l.rel || l.relation) === rel || l.rel === rel);
        if (hit) return hit.href || hit.url || hit.link || null;
      }
      // fallback to first link-like object
      const first = links.find((l) => l.href || l.url || l.link);
      return first ? first.href || first.url || first.link : null;
    }
    if (links.href || links.url || links.link) return links.href || links.url || links.link;
    return null;
  };

  const afMatches = arr.map((job) => {
    const headline = job.title || job.name || job.headline || job["vacancy-title"] || null;
    const employer = (job.employer && job.employer.name) || job.employer || job["organisation-name"] || null;
    const location = job.workplace_address?.municipality || job.workplace_address?.city || job.location || job.place || null;
    // Try to find a stable id from common fields, fall back to webpage_url or a composite
    const rawId = job['@id'] || job.id || job.identifier || job['vacancy-id'] || job.uri || job.url || null;
    const webpage_url =
      job.webpage_url || job.webpageUrl || job.webpage || job.applicationUrl || job.application?.url || job.application_details?.url || job.application_details?.link || job.url || job.link || job["@id"] || job.employer?.url || findLink(job.links) || findLink(job.links, ["apply", "application"]);

    const application_deadline =
      parseDate(job.application_deadline) || parseDate(job.applicationDeadline) || parseDate(job.last_publication_date) || parseDate(job.lastPublicationDate) || parseDate(job.dateClosing) || parseDate(job.dateApplyBefore) || parseDate(job.deadline) || null;

    const rawVacancies =
      job.number_of_vacancies || job.numberOfVacancies || job.vacancyCount || job.openings || job.positions || job.vacancies || job.numberOfPositions || job.number_of_positions || (job.scope_of_work && (job.scope_of_work.min || job.scope_of_work.max)) || null;
    const number_of_vacancies = rawVacancies == null ? null : Number(rawVacancies) || null;

    let conditions = job.description.conditions
    if (Array.isArray(conditions)) conditions = conditions.join(", ");
    if (conditions && typeof conditions !== "string") conditions = String(conditions);

    // If still missing, try to extract key details from description text/html
    if (!conditions) {
      const descRaw = job.description?.text_formatted || job.description?.text || job.description || null;
      if (descRaw) {
        let txt = String(descRaw);
        // strip simple HTML
        if (/<[^>]+>/.test(txt)) txt = txt.replace(/<[^>]+>/g, " ");
        // normalize whitespace
        txt = txt.replace(/\r/g, "\n").replace(/\n+/g, "\n").trim();

        const parts = [];
        const capture = (label) => {
          const re = new RegExp(label + "[:\s]*([^-\n\r]+)", "i");
          const m = txt.match(re);
          return m ? m[1].trim() : null;
        };

        const start = capture("Start");
        const end = capture("End");
        const location = capture("Location") || capture("Plats") || capture("Location:");
        const workload = capture("Workload") || capture("Workload:") || capture("Workload") || capture("Workload");
        const language = capture("Language") || capture("Språk") || capture("Language:");

        if (start) parts.push(`Start: ${start}`);
        if (end) parts.push(`End: ${end}`);
        if (location) parts.push(`Location: ${location}`);
        if (workload) parts.push(`Workload: ${workload}`);
        if (language) parts.push(`Language: ${language}`);

        if (parts.length > 0) conditions = parts.join("; ");
      }
    }

    const salary_description = job.salary_description || job.salary || job.salaryDescription || job.remuneration || job["salary-description"] || job.salaryInfo || job.compensation || null;

    const id = String(rawId || webpage_url || `${headline || ''}||${employer || ''}||${location || ''}`).trim();

    return {
      id: id || null,
      headline,
      employer,
      webpage_url: webpage_url || null,
      application_deadline,
      number_of_vacancies,
      conditions,
      salary_description,
    };
  });

  const total = raw.total || (raw.hits && (raw.hits.total || raw.hits.total?.value)) || afMatches.length;

  return { total: total || afMatches.length, afMatches };
}
