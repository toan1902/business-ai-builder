const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
const KEY = process.env.ANTHROPIC_API_KEY;

app.post("/api/chat", async (req, res) => {
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: req.body.system || "You are a helpful assistant.",
        messages: req.body.messages
      })
    });
    const data = await r.json();

    // Tự động lưu code ra file nếu có
    const text = data.content?.find(b => b.type === "text")?.text || "";
    const codeMatch = text.match(/```(?:jsx?|tsx?)\n([\s\S]*?)```/);
    if (codeMatch && req.body.moduleId) {
      const dir = path.join(__dirname, "generated");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir);
      const file = path.join(dir, `${req.body.moduleId}.jsx`);
      fs.writeFileSync(file, codeMatch[1]);
      console.log(`💾 Đã lưu: generated/${req.body.moduleId}.jsx`);
    }

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(process.env.PORT || 3001, () =>
  console.log("OK Server http://localhost:3001")
);