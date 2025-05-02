// src/routes/index.ts
import { Application } from "express";
import domainRoutes from "./domain.routes";
import domainRegistrarRoutes from "./domain-registrar.routes";
import adminRoutes from "./admin.routes";

export default function registerRoutes(app: Application) {
  app.use("/api/domains", domainRoutes);
  app.use("/api/domain-registrar", domainRegistrarRoutes);
  app.use("/api/admin", adminRoutes);
}
