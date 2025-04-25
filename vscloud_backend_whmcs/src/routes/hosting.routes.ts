// src/routes/hosting.routes.ts
import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validate.middleware";
import { HostingController } from "../controllers/hosting.controller";
import { ServerController } from "../controllers/server.controller";
import { HostingPackageController } from "../controllers/hosting-package.controller";
import { DirectAdminUserController } from "../controllers/directadmin-user.controller";
import {
  HostingPackageInputSchema,
  UpdateHostingPackageInputSchema,
} from "../models/schemas/hosting-package.schema";

const router = Router();
const hostingController = new HostingController();
const serverController = new ServerController();
const packageController = new HostingPackageController();
const daUserController = new DirectAdminUserController();

// DirectAdmin Package Routes
router.get(
  "/packages/da",
  authenticate,
  packageController.listDirectAdminPackages
);
router.get(
  "/packages/da/:name",
  authenticate,
  packageController.getDirectAdminPackage
);
router.post(
  "/packages/da",
  authenticate,
  packageController.createDirectAdminPackage
);
router.patch(
  "/packages/da/:name",
  authenticate,
  packageController.updateDirectAdminPackage
);
router.patch(
  "/packages/da/rename/:oldName",
  authenticate,
  packageController.renameDirectAdminPackage
);
router.delete(
  "/packages/da/:name",
  authenticate,
  packageController.deleteDirectAdminPackage
);

// DirectAdmin User Routes
router.get("/users/da", authenticate, daUserController.listUsers);
router.get("/users/da/:username", authenticate, daUserController.getUser);
router.post("/users/da", authenticate, daUserController.createUser);
router.patch("/users/da/:username", authenticate, daUserController.updateUser);
router.put("/users/da/:username", authenticate, daUserController.updateUser);
router.delete("/users/da/:username", authenticate, daUserController.deleteUser);
router.post(
  "/users/da/:username/suspend",
  authenticate,
  daUserController.suspendUser
);
router.post(
  "/users/da/:username/unsuspend",
  authenticate,
  daUserController.unsuspendUser
);

// Hosting Account Routes
router.post("/accounts", authenticate, hostingController.createHostingAccount);
router.get("/accounts", authenticate, hostingController.listHostingAccounts);
router.get("/accounts/:id", authenticate, hostingController.getHostingAccount);
router.post(
  "/accounts/:id/suspend",
  authenticate,
  hostingController.suspendAccount
);
router.post(
  "/accounts/:id/unsuspend",
  authenticate,
  hostingController.unsuspendAccount
);
router.delete("/accounts/:id", authenticate, hostingController.deleteAccount);

// Database Routes
router.post(
  "/accounts/:hostingAccountId/databases",
  authenticate,
  hostingController.createDatabase
);

// Email Account Routes
router.post(
  "/accounts/:hostingAccountId/emails",
  authenticate,
  hostingController.createEmailAccount
);

// FTP Account Routes
router.post(
  "/accounts/:hostingAccountId/ftp",
  authenticate,
  hostingController.createFTPAccount
);

// Server Routes
router.post("/servers", authenticate, serverController.createServer);
router.get("/servers", authenticate, serverController.listServers);
router.get("/servers/:id", authenticate, serverController.getServer);
router.patch("/servers/:id", authenticate, serverController.updateServer);
router.patch(
  "/servers/:id/status",
  authenticate,
  serverController.updateServerStatus
);
router.post(
  "/servers/:serverId/maintenance",
  authenticate,
  serverController.scheduleMaintenance
);
router.get(
  "/servers/:id/metrics",
  authenticate,
  serverController.getServerMetrics
);
router.delete("/servers/:id", authenticate, serverController.deleteServer);
router.post(
  "/servers/test-connection",
  authenticate,
  serverController.testConnection
);


// Hosting Package Routes
router.post(
  "/packages",
  authenticate,
  validateRequest(HostingPackageInputSchema),
  packageController.createPackage
);

router.get("/packages", packageController.listPackages);

router.get("/packages/:id", packageController.getPackage);

router.patch(
  "/packages/:id",
  authenticate,
  validateRequest(UpdateHostingPackageInputSchema),
  packageController.updatePackage
);

router.delete("/packages/:id", authenticate, packageController.deletePackage);

// router.get(
//   "/packages/:id/stats",
//   authenticate,
//   packageController.getPackageUsageStats
// );

export default router;
