import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { processExternalImage } from "../lpr";
import { getCameraSettingsByParkingLot } from "../db";
import multer from "multer";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Multer for handling multipart/form-data (camera image uploads)
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

  // Camera image webhook endpoint
  // 監視カメラからの画像受信用API
  app.post("/api/camera/upload", upload.single("image"), async (req, res) => {
    try {
      const parkingLotId = parseInt(req.body.parkingLotId || req.query.parkingLotId as string);
      const apiToken = req.body.apiToken || req.query.apiToken as string;

      if (!parkingLotId || isNaN(parkingLotId)) {
        return res.status(400).json({ success: false, error: "parkingLotId is required" });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, error: "Image file is required" });
      }

      // カメラ設定からLPR APIトークンを取得
      let lprApiToken = apiToken;
      let lprApiUrl: string | undefined;

      if (!lprApiToken) {
        const cameras = await getCameraSettingsByParkingLot(parkingLotId);
        if (cameras.length > 0 && cameras[0].lprApiToken) {
          lprApiToken = cameras[0].lprApiToken;
          lprApiUrl = cameras[0].lprApiUrl || undefined;
        }
      }

      if (!lprApiToken) {
        return res.status(400).json({ success: false, error: "LPR API token is not configured" });
      }

      const result = await processExternalImage(
        parkingLotId,
        req.file.buffer,
        lprApiToken,
        lprApiUrl
      );

      return res.json(result);
    } catch (error: any) {
      console.error("[Camera Upload] Error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
