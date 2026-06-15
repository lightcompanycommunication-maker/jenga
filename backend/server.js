import express from "express";
import cors from "cors";
import { Readable } from "stream";

const app = express();
const PORT = 3001;

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "4mb" }));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

if (!ANTHROPIC_API_KEY) {
  console.warn("[jenga-backend] WARNING: ANTHROPIC_API_KEY is not set. Generation will fail.");
}

const ANTHROPIC_HEADERS = {
  "Content-Type": "application/json",
  "x-api-key": ANTHROPIC_API_KEY,
  "anthropic-version": "2023-06-01",
};

app.post("/api/generate", async (req, res) => {
  const { prompt, systemPrompt, maxTokens = 8000, model = "claude-haiku-4-5-20251001" } = req.body;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured." });
  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: ANTHROPIC_HEADERS,
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await upstream.json();
    if (data.error) return res.status(400).json({ error: data.error.message });
    const text = data.content?.map((b) => b.text || "").join("") || "";
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/anthropic/messages", async (req, res) => {
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured." });
  const isStream = !!req.body.stream;
  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: ANTHROPIC_HEADERS,
      body: JSON.stringify(req.body),
    });
    if (isStream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("X-Accel-Buffering", "no");
      // Use Node.js native Readable.fromWeb() for reliable streaming
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
