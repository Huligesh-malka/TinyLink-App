// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

dotenv.config();
const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// __dirname fix for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../public")));

// Constants
const CODE_REGEX = /^[A-Za-z0-9]{6,8}$/;

// Helpers
function makeShortCode(len = 6) {
  return Math.random().toString(36).replace(/[^a-z0-9]/gi, "").slice(0, len);
}

function isValidUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// Healthcheck
app.get("/healthz", (_req, res) => res.json({ ok: true, version: "1.0" }));

// Create new link
app.post("/api/links", async (req, res) => {
  const { original_url, custom_code } = req.body;

  if (!original_url || !isValidUrl(original_url))
    return res.status(400).json({ error: "Invalid or missing original_url" });

  let short_code = "";

  try {
    if (custom_code) {
      if (!CODE_REGEX.test(custom_code))
        return res.status(400).json({ error: "custom_code must be 6-8 alphanumeric" });

      const existing = await prisma.link.findUnique({ where: { short_code: custom_code } });
      if (existing) return res.status(409).json({ error: "code_exists" });

      short_code = custom_code;
    } else {
      let tries = 0;
      while (tries < 6) {
        const candidate = makeShortCode(6 + Math.floor(Math.random() * 3)); // 6-8 chars
        const existing = await prisma.link.findUnique({ where: { short_code: candidate } });
        if (!existing) {
          short_code = candidate;
          break;
        }
        tries++;
      }
      if (!short_code) short_code = makeShortCode(8); // fallback
    }

    const created = await prisma.link.create({
      data: { original_url, short_code },
    });

    const base = (process.env.BASE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");

    return res.status(201).json({
      id: created.id,
      original_url: created.original_url,
      short_code: created.short_code,
      clicks: created.clicks,
      last_clicked: created.last_clicked,
      created_at: created.created_at,
      short_url: `${base}/${created.short_code}`,
    });
  } catch (err) {
    if (err?.code === "P2002") return res.status(409).json({ error: "code_exists" });
    return res.status(500).json({ error: "db_error", details: err.message });
  }
});

// Get all links
app.get("/api/links", async (_req, res) => {
  try {
    const links = await prisma.link.findMany({ orderBy: { created_at: "desc" } });
    return res.json(links);
  } catch (err) {
    return res.status(500).json({ error: "db_error", details: err.message });
  }
});

// Get single link stats
app.get("/api/links/:code", async (req, res) => {
  const code = req.params.code;
  if (!CODE_REGEX.test(code)) return res.status(400).json({ error: "invalid_code" });

  try {
    const link = await prisma.link.findUnique({ where: { short_code: code } });
    if (!link) return res.status(404).json({ error: "not_found" });
    return res.json(link);
  } catch (err) {
    return res.status(500).json({ error: "db_error", details: err.message });
  }
});

// Delete link
app.delete("/api/links/:code", async (req, res) => {
  const code = req.params.code;
  if (!CODE_REGEX.test(code)) return res.status(400).json({ error: "invalid_code" });

  try {
    const deleted = await prisma.link.deleteMany({ where: { short_code: code } });
    if (deleted.count === 0) return res.status(404).json({ error: "not_found" });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "db_error", details: err.message });
  }
});

// Redirect route with click tracking
app.get("/:code", async (req, res, next) => {
  const code = req.params.code;
  const reserved = ["api", "healthz", "code"];
  if (reserved.includes(code)) return next();
  if (!CODE_REGEX.test(code)) return res.status(404).send("Not found");

  try {
    const link = await prisma.link.findUnique({ where: { short_code: code } });
    if (!link) return res.status(404).send("Not found");

    await prisma.link.update({
      where: { id: link.id },
      data: { clicks: link.clicks + 1, last_clicked: new Date() },
    });

    return res.redirect(302, link.original_url);
  } catch {
    return res.status(500).send("Server error");
  }
});

// Serve link stats page
app.get("/code/:code", (_req, res) => {
  res.sendFile(path.join(__dirname, "../public/code.html"));
});

// SPA fallback
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Start server
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`TinyLink server listening on port ${port}`));
