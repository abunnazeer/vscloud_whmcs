// src/routes/email.routes.ts
import express from "express";
import { EmailController } from "../controllers/email.controller";

const router = express.Router();
const emailController = new EmailController();

router.post("/", emailController.createEmail);
router.get("/", emailController.listEmails);
router.put("/emails", emailController.updateEmail);
router.delete("/emails/:email", emailController.deleteEmail);
// router.post("/emails/forwarders", emailController.createForwarder);

export default router;
