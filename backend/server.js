import express from "express";
import cors from "cors";
import { Readable } from "stream";
import { generateApp, resolveModel, resolveMaxTokens, extractJson } from "./ai.js";

const app = express();
const PORT = 3001;

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "4mb" }));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

if (!ANTHROPIC_API_KEY) {
  console.warn("[jenga-backend] WARNING: ANTHROPIC_API_KEY is not set. Generation will fail.");
}

// Non-streaming generation endpoint — uses ai.js with full JSON repair
app.post("/api/generate", async (req, res) => {
  try {
    const result = await generateApp(req.body);
    res.json({ text: JSON.stringify(result) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Streaming proxy — applies model mapping + 16k token cap
app.post("/api/anthropic/messages", async (req, res) => {
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured." });
  const isStream = !!req.body.stream;

  // Apply model resolution and token cap to every request
  const body = {
    ...req.body,
    model: resolveModel(req.body.model),
    max_tokens: resolveMaxTokens(req.body.max_tokens),
  };

  console.log(`[proxy] model=${body.model} max_tokens=${body.max_tokens} stream=${isStream}`);

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (isStream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("X-Accel-Buffering", "no");
      Readable.fromWeb(upstream.body).pipe(res);
    } else {
      const data = await upstream.json();
      res.status(upstream.status).json(data);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, "localhost", () => {
  console.log(`[jenga-backend] Running on http://localhost:${PORT}`);
});
