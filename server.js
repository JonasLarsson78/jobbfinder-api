import express from "express";
import cors from "cors";
import morgan from "morgan";
import jobsRouter from "./routes/jobs.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use(express.static("public"));

app.use(morgan("dev"));
app.use("/jobs", jobsRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});