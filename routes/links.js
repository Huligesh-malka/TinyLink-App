const express = require("express");
const router = express.Router();
const pool = require("../db");
const shortid = require("shortid");

// Shorten URL
router.post("/shorten", async (req, res) => {
  const { originalUrl } = req.body;
  const shortCode = shortid.generate().slice(0, 6);

  try {
    await pool.query(
      "INSERT INTO links (original_url, short_code) VALUES ($1, $2)",
      [originalUrl, shortCode]
    );
    res.json({ shortUrl: `${process.env.BASE_URL}/${shortCode}` });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Redirect
router.get("/:shortCode", async (req, res) => {
  const { shortCode } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM links WHERE short_code = $1",
      [shortCode]
    );
    if (result.rows.length === 0) return res.status(404).send("Not found");

    await pool.query(
      "UPDATE links SET clicks = clicks + 1 WHERE short_code = $1",
      [shortCode]
    );

    res.redirect(result.rows[0].original_url);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Get all links
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM links ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
