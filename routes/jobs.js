import express from "express";
import fetch from "node-fetch";
import { getMunicipalityCodeByCityName } from "../lib/municipalities.js";
import { mapJobSearchResult } from "../lib/jobMapper.js";

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
        return { city, municipalityCode: code, result: mapJobSearchResult(data) };
      } catch (err) {
        return { city, municipalityCode: code, error: { message: String(err) } };
      }
    });

    const results = await Promise.all(fetchPromises);

    // If a single city was requested, keep backward-compatible shape
    if (results.length === 1 && notFound.length === 0) {
      const r = results[0];
      if (r.error) return res.status(502).json({ error: "JobSearch API error", details: r.error });
      return res.json({ city: r.city, municipalityCode: r.municipalityCode, query: q, result: r.result });
    }

    // Multiple cities: return per-city results and list of cities not found
    return res.json({ queries: results, notFound });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
