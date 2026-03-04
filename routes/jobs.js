import express from "express";
import fetch from "node-fetch";
import { getMunicipalityCodeByCityName } from "../lib/municipalities.js";
import { mapJobSearchResult } from "../lib/jobMapper.js";
import { searchLinkedInByQuery } from "../lib/linkedin.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const cityParam = req.query.city;
    const q = req.query.q || "";

    // accept repeated city params or comma-separated list
    let cities = [];
    if (Array.isArray(cityParam)) cities = cityParam.map((c) => String(c).trim()).filter(Boolean);
    else if (typeof cityParam === "string") cities = cityParam.split(",").map((c) => c.trim()).filter(Boolean);

    if (cities.length === 0) {
      return res.status(400).json({ error: "Missing query param: city" });
    }

    const parseBoolish = (v) => {
      if (v === undefined || v === null) return false;
      if (v === "") return true; // ?scan_linkedin (no value) should count as true
      const s = String(v).toLowerCase();
      return ["1", "true", "yes", "y", "on"].includes(s);
    };
    let scanLinkedInFlag = parseBoolish(req.query.scan_linkedin);
    const rawQuery = req.originalUrl || req.url || "";
    const presenceNoValue = /[?&]scan_linkedin(?=($|&))/i.test(rawQuery);
    if (!scanLinkedInFlag && presenceNoValue) scanLinkedInFlag = true;
    // request received
    // Resolve municipality codes in parallel
    const codePromises = cities.map(async (c) => ({ city: c, code: await getMunicipalityCodeByCityName(c) }));
    const resolved = await Promise.all(codePromises);

    const notFound = resolved.filter((r) => !r.code).map((r) => r.city);
    const found = resolved.filter((r) => r.code);

    if (found.length === 0) {
      return res.status(404).json({ error: `Ingen kommun hittades för city='${cities.join(", ")}'` });
    }

    // Fetch JobSearch for each found municipality in parallel
    const fetchPromises = found.map(async ({ city, code }) => {
      const jobsearchUrl = new URL("https://jobsearch.api.jobtechdev.se/search");
      jobsearchUrl.searchParams.set("municipality", code);
      if (q) jobsearchUrl.searchParams.set("q", q);

      try {
        const jobRes = await fetch(jobsearchUrl.toString(), { headers: { Accept: "application/json" } });
        if (!jobRes.ok) {
          return { city, municipalityCode: code, error: { status: jobRes.status, statusText: jobRes.statusText } };
        }
        const data = await jobRes.json();
        const mapped = mapJobSearchResult(data);

        // Scan LinkedIn for matching jobs (best-effort HTML fetch + parse).
        try {
          const liLocation = city;
          const liQuery = q || `${mapped.afMatches[0]?.headline || ""} ${mapped.afMatches[0]?.employer || ""}`.trim();
          // linkedin call
          const linkedinMatches = await searchLinkedInByQuery({ query: liQuery, location: liLocation, limit: 10 });
          // linkedin result: count added to mapped.total

          mapped.linkedinMatches = linkedinMatches;
          // Add linkedin matches into total.value (preserve existing shape)
          try {
            const add = Array.isArray(linkedinMatches) ? linkedinMatches.length : 0;
            if (add > 0) {
              if (mapped.total && typeof mapped.total === 'object' && mapped.total.value != null) {
                mapped.total.value = Number(mapped.total.value) + add;
              } else if (mapped.total != null) {
                mapped.total = { value: Number(mapped.total) + add };
              } else {
                mapped.total = { value: add };
              }
            }
          } catch (e) {
            // ignore total adjustment errors
          }

          return { city, municipalityCode: code, result: mapped };
        } catch (e) {
          mapped.linkedinMatches = [];
          return { city, municipalityCode: code, result: mapped };
        }

        return { city, municipalityCode: code, result: mapped };
      } catch (err) {
        return { city, municipalityCode: code, error: { message: String(err) } };
      }
    });

    const results = await Promise.all(fetchPromises);

    // If a single city was requested, keep backward-compatible shape
    if (results.length === 1 && notFound.length === 0) {
      const r = results[0];
      if (r.error) return res.status(502).json({ error: "JobSearch API error", details: r.error });
      // Include linkedinMatches when present so single-city callers receive the combined data
      const out = { city: r.city, municipalityCode: r.municipalityCode, query: q, result: r.result };
      return res.json(out);
    }

    // Multiple cities: return per-city results and list of cities not found
    return res.json({ queries: results, notFound });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
