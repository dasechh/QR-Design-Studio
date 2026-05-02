import { Router } from "express";
import { db, designsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateDesignBody, UpdateDesignBody, GetDesignParams, UpdateDesignParams, DeleteDesignParams } from "@workspace/api-zod";

const router = Router();

router.get("/designs", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const designs = await db
    .select()
    .from(designsTable)
    .where(eq(designsTable.userId, req.user.id))
    .orderBy(designsTable.updatedAt);
  res.json(designs);
});

router.post("/designs", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = CreateDesignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [design] = await db
    .insert(designsTable)
    .values({
      userId: req.user.id,
      title: parsed.data.title,
      canvasData: parsed.data.canvasData,
      thumbnail: parsed.data.thumbnail ?? null,
    })
    .returning();
  res.status(201).json(design);
});

router.get("/designs/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = GetDesignParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [design] = await db
    .select()
    .from(designsTable)
    .where(and(eq(designsTable.id, parsed.data.id), eq(designsTable.userId, req.user.id)));
  if (!design) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(design);
});

router.put("/designs/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const paramsParsed = UpdateDesignParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyParsed = UpdateDesignBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }
  const updates: Partial<{ title: string; canvasData: Record<string, unknown>; thumbnail: string | null }> = {};
  if (bodyParsed.data.title !== undefined) updates.title = bodyParsed.data.title;
  if (bodyParsed.data.canvasData !== undefined) updates.canvasData = bodyParsed.data.canvasData;
  if (bodyParsed.data.thumbnail !== undefined) updates.thumbnail = bodyParsed.data.thumbnail ?? null;

  const [design] = await db
    .update(designsTable)
    .set(updates)
    .where(and(eq(designsTable.id, paramsParsed.data.id), eq(designsTable.userId, req.user.id)))
    .returning();
  if (!design) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(design);
});

router.delete("/designs/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = DeleteDesignParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [deleted] = await db
    .delete(designsTable)
    .where(and(eq(designsTable.id, parsed.data.id), eq(designsTable.userId, req.user.id)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ success: true });
});

export default router;
