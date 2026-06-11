import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Custom Route to serve the APK file directly with correct headers
  app.get('/timemate-bd.apk', (req, res) => {
    let filePath = path.resolve(process.cwd(), 'public/timemate-bd.apk');
    
    // Fallback if public folder is not used or it is already in dist/
    if (!fs.existsSync(filePath)) {
      filePath = path.resolve(process.cwd(), 'dist/timemate-bd.apk');
    }

    if (fs.existsSync(filePath)) {
      console.log(`[APK] Serving APK file from: ${filePath}`);
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="timemate-bd.apk"');
      res.sendFile(filePath);
    } else {
      console.error(`[APK Error] APK file not found at: ${filePath}`);
      res.status(404).send('APK File Not Found.');
    }
  });

  // API Health route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log(`[Server] Vite middleware loaded in development mode.`);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log(`[Server] Serving static files from: ${distPath}`);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Error starting server:", err);
});
