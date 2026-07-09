import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { isPostgresEnabled } from "@/lib/db/config";
import { pingDatabase } from "@/lib/db/client";

/** Santé de la plateforme (monitoring / load balancer). */
export const GET = async (): Promise<NextResponse> => {
  const storePath = path.join(process.cwd(), "data", "admin", "store.json");
  const videosPath = path.join(process.cwd(), "data", "videos");

  let jsonStoreOk = false;
  let jsonStoreSize = 0;

  try {
    const stat = await fs.stat(storePath);
    jsonStoreOk = stat.isFile();
    jsonStoreSize = stat.size;
  } catch {
    jsonStoreOk = false;
  }

  let videosCount = 0;
  try {
    const files = await fs.readdir(videosPath);
    videosCount = files.filter((name) => name.endsWith(".mp4")).length;
  } catch {
    videosCount = 0;
  }

  const postgresEnabled = isPostgresEnabled();
  const postgresOk = postgresEnabled ? await pingDatabase() : null;

  const healthy = jsonStoreOk && (!postgresEnabled || postgresOk === true);

  return NextResponse.json(
    {
      error: false,
      data: {
        status: healthy ? "ok" : "degraded",
        uptime_sec: Math.round(process.uptime()),
        data_store: postgresEnabled ? "postgres" : "json",
        postgres: {
          enabled: postgresEnabled,
          connected: postgresOk,
        },
        json_store: {
          exists: jsonStoreOk,
          size_bytes: jsonStoreSize,
        },
        videos: {
          count: videosCount,
        },
        version: process.env.NEXT_PUBLIC_WEB_VERSION ?? "unknown",
      },
    },
    { status: healthy ? 200 : 503 }
  );
};
