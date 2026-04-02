import express from "express";
import cors from "cors";
import { runAgent } from "./agent.js";

const app = express();

app.use(cors());
app.use(express.json());

app.post("/chat", async (req, res) => {
  const { message, decision, id } = req.body; // ✅ ADD THIS

  const result = await runAgent(message, decision, id); // ✅ PASS id

  res.json(result);
});

app.listen(8000, () => {
  console.log("🔥 Backend running on http://localhost:8000");
});