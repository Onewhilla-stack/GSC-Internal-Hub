import type { Request, Response, NextFunction } from "express";

export function requireDirector(req: Request, res: Response, next: NextFunction): void {
  if (req.session.role !== "director") {
    res.status(403).json({ error: "Director access required" });
    return;
  }
  next();
}
