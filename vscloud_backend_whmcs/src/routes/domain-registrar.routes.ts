// src/routes/domain-registrar.routes.ts
import { Router } from "express";
import { DomainRegistrarController } from "../controllers/domain-registrar.controller";

const router = Router();

router.post(
  "/check-availability",
  DomainRegistrarController.checkDomainAvailability
);
router.post("/register", DomainRegistrarController.registerDomain);
router.put("/update-nameservers", DomainRegistrarController.updateNameservers);
router.get("/:domainId/:userId", DomainRegistrarController.getDomainInfo);

export default router;
