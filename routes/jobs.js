import express from "express";
import fetch from "node-fetch";
import { getMunicipalityCodeByCityName } from "../lib/municipalities.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const city = req.query.city;
    const q = req.query.q || "";

    if (!city) {
      return res.status(400).json({ error: "Missing query param: city" });
    }

    const municipalityCode = await getMunicipalityCodeByCityName(city);
    if (!municipalityCode) {
      return res
        .status(404)
        .json({ error: `Ingen kommun hittades för city='${city}'` });
    }

    // Bygg JobSearch-URL
    const jobsearchUrl = new URL(
      "https://jobsearch.api.jobtechdev.se/search"
    );
    jobsearchUrl.searchParams.set("municipality", municipalityCode);
    if (q) jobsearchUrl.searchParams.set("q", q);

    const jobRes = await fetch(jobsearchUrl.toString(), {
      headers: { Accept: "application/json" },
    });

    if (!jobRes.ok) {
      return res.status(502).json({
        error: "JobSearch API error",
        status: jobRes.status,
        statusText: jobRes.statusText,
      });
    }

    const data = await jobRes.json();
    res.json({
      city,
      municipalityCode,
      query: q,
      result: data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
