import { Router, type IRouter } from "express";
import healthRouter from "./health";
import packRouter from "./pack";
import analysisRouter from "./analysis";
import trucksRouter from "./trucks";
import sitesRouter from "./sites";

const router: IRouter = Router();

router.use(healthRouter);
router.use(packRouter);
router.use(analysisRouter);
router.use(trucksRouter);
router.use(sitesRouter);

export default router;
