import express from "express";
import jobsRouter from "./routes/jobs.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use("/jobs", jobsRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});