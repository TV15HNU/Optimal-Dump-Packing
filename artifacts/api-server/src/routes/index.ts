import { Router, type IRouter } from "express";
import healthRouter from "./health";
import packRouter from "./pack";
import analysisRouter from "./analysis";

const router: IRouter = Router();

router.use(healthRouter);
router.use(packRouter);
router.use(analysisRouter);

export default router;
