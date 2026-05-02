import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import designsRouter from "./designs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(designsRouter);

export default router;
