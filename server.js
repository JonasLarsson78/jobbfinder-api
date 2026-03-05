import express from "express";
import cors from "cors";
import morgan from "morgan";
import jobsRouter from "./routes/jobs.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(morgan("dev"));
app.get('/favicon.ico', (req, res) => res.sendStatus(204));
app.use("/jobs", jobsRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});