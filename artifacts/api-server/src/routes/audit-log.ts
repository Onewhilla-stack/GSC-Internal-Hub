import { Router } from "express";
import { db, activityLogTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireDirector } from "../middlewares/requireDirector";

const router = Router();

router.get("/audit-log", requireAuth, requireDirector, async (req, res): Promise<void> => {
  const limit = Math.min(parseInt(String(req.query.limit ?? "100")), 500);
  const offset = parseInt(String(req.query.offset ?? "0"));

  const rows = await db.select().from(activityLogTable)
    .orderBy(sql`${activityLogTable.timestamp} DESC`)
    .limit(limit)
    .offset(offset);

  res.json(rows.map(r => ({
    ...r,
    timestamp: r.timestamp.toISOString(),
  })));
});

export default router;
