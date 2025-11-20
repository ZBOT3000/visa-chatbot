import express from "express";
import cors from "cors";
import { OpenAI } from "openai";
import fs from "fs";
import cosineSimilarity from "compute-cosine-similarity";

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Load KB
const kb = JSON.parse(fs.readFileSync("./visa-kb.json", "utf-8"));
let kbEmbeddings = [];
let ready = false; // becomes true once embeddings are ready

// Precompute embeddings (with error handling)
(async () => {
  try {
    for (const item of kb) {
      const embedding = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: item.text
      });
      kbEmbeddings.push({ ...item, embedding: embedding.data[0].embedding });
    }
    console.log("KB embeddings ready!");
    ready = true;
  } catch (err) {
    console.error("Failed to build KB embeddings:", err);
    // keep ready = false so requests will receive helpful error
  }
})();

// Health / root routes
app.get("/", (req, res) => {
  res.send("Visa chatbot backend is running. Use POST /api/chat");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", ready });
});

const slugify = str =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const findKbMatch = query => {
  const slug = slugify(query);
  const lower = query.toLowerCase();

  return (
    kb.find(item => item.id === slug) ||
    kb.find(item => item.id.includes(slug)) ||
    kb.find(item => slug.includes(item.id)) ||
    kb.find(item => item.text.toLowerCase().includes(lower))
  );
};

app.get("/api/kb/search", (req, res) => {
  const query = req.query.q?.toString().trim();
  if (!query) {
    return res.status(400).json({ error: "Missing 'q' query parameter." });
  }

  const match = findKbMatch(query);
  if (!match) {
    return res.status(404).json({ error: "No matching knowledge base entry." });
  }

  res.json({ id: match.id, text: match.text });
});

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  if (!ready) {
    return res.status(503).json({ error: "Service initializing embeddings. Try again shortly." });
  }

  const userMessage = req.body?.message;
  if (!userMessage) {
    return res.status(400).json({ error: "Missing 'message' in request body." });
  }

  try {
    // Embed user input
    const userEmbed = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: userMessage
    });
    const embedding = userEmbed.data[0].embedding;

    // Retrieve top 3 KB items
    const ranked = kbEmbeddings
      .map(item => ({ ...item, score: cosineSimilarity(item.embedding, embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const context = ranked.map(x => x.text).join("\n");

    // GPT answer
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
You are an AI visa assistant. Follow these rules:
1. Answer concisely in plain language.
2. Only use information from the provided context.
3. If the question cannot be answered from the context, politely say:
   "I'm sorry, I don't have that information. Please contact a consultant for further assistance."
4. If the user's question is unclear, ask politely for clarification.
5. Format answers in short paragraphs or bullet points when helpful.
          `
        },
        { role: "user", content: `Context:\n${context}\n\nQuestion: ${userMessage}` }
      ]
    });

    res.json({ answer: completion.choices[0].message.content });
  } catch (err) {
    console.error("Chat endpoint error:", err);
    // If it's an OpenAI client error, return a safe message + status
    res.status(502).json({ error: "Upstream API error", details: err.message || err.toString() });
  }
});

app.listen(3001, () => console.log("Backend running on http://localhost:3001"));
