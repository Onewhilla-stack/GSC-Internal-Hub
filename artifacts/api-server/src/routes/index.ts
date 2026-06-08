import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import jobsRouter from "./jobs";
import expensesRouter from "./expenses";
import clientsRouter from "./clients";
import receiptsRouter from "./receipts";
import quotationsRouter from "./quotations";
import analyticsRouter from "./analytics";
import settingsRouter from "./settings";
import auditLogRouter from "./audit-log";
import workerRouter from "./worker";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(jobsRouter);
router.use(expensesRouter);
router.use(clientsRouter);
router.use(receiptsRouter);
router.use(quotationsRouter);
router.use(analyticsRouter);
router.use(settingsRouter);
router.use(auditLogRouter);
router.use(workerRouter);

export default router;
