// src/routes/domain-registrar.routes.ts
import { Router } from "express";
import { DomainRegistrarController } from "../controllers/domain-registrar.controller";
import { authenticate } from "../middleware/auth.middleware"; // Assuming you have an auth middleware

const router = Router();

/**
 * @swagger
 * /check-availability:
 *   post:
 *     summary: Check domain availability
 *     description: Checks domain availability across supported registrars
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               domainName:
 *                 type: string
 *                 example: example.com
 *               registrar:
 *                 type: string
 *                 description: Optional specific registrar to check
 *                 example: namecheap
 *     responses:
 *       200:
 *         description: Domain availability results
 */
router.post(
  "/check-availability",
  DomainRegistrarController.checkDomainAvailability
);

// Domain listing (both GET and POST for backward compatibility)
router.get("/domains", DomainRegistrarController.getAllDomains);
router.post("/get-all", DomainRegistrarController.getAllDomains); // Legacy support

// Domain registration
router.post(
  "/register",
  authenticate,
  DomainRegistrarController.registerDomain
);

// Domain info
router.get(
  "/domains/:domainId",
  authenticate,
  DomainRegistrarController.getDomainInfo
);
router.get("/:domainId/:userId", DomainRegistrarController.getDomainInfo); // Legacy support

// Domain nameservers
router.put(
  "/domains/:domainId/nameservers",
  authenticate,
  DomainRegistrarController.updateNameservers
);
router.put(
  "/update-nameservers",
  authenticate,
  DomainRegistrarController.updateNameservers
); // Legacy support

// DNS records management
router.get(
  "/domains/:domainId/dns",
  authenticate,
  DomainRegistrarController.getDnsRecords
);
router.post(
  "/domains/:domainId/dns",
  authenticate,
  DomainRegistrarController.setDnsRecords
);
router.put(
  "/domains/:domainId/dns/:recordId",
  authenticate,
  DomainRegistrarController.updateDnsRecord
);
router.delete(
  "/domains/:domainId/dns/:recordId",
  authenticate,
  DomainRegistrarController.deleteDnsRecord
);

// Domain transfers
router.post(
  "/transfer",
  authenticate,
  DomainRegistrarController.transferDomain
);
router.get(
  "/transfer/:transferId/status",
  authenticate,
  DomainRegistrarController.getTransferStatus
);

// Domain renewal
router.post(
  "/domains/:domainId/renew",
  authenticate,
  DomainRegistrarController.renewDomain
);

// Domain privacy protection
router.put(
  "/domains/:domainId/privacy",
  authenticate,
  DomainRegistrarController.updatePrivacyProtection
);

// Domain auto-renew settings
router.put(
  "/domains/:domainId/auto-renew",
  authenticate,
  DomainRegistrarController.updateAutoRenew
);

// Domain locks (prevent unauthorized transfers)
router.put(
  "/domains/:domainId/lock",
  authenticate,
  DomainRegistrarController.setDomainLock
);

export default router;
