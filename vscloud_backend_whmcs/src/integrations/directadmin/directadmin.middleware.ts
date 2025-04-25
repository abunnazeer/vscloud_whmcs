import { Request, Response, NextFunction } from "express";
import { DirectAdminService } from "../integrations/directadmin/directadmin.service";
import { ServerService } from "../services/server.service";

export class DirectAdminAuthMiddleware {
  private serverService: ServerService;

  constructor() {
    this.serverService = new ServerService();
  }

  public authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { serverId, daUsername, daPassword } = req.body;

      if (!serverId || !daUsername || !daPassword) {
        return res.status(400).json({
          status: "error",
          message: "Server ID and DirectAdmin credentials are required",
        });
      }

      const server = await this.serverService.getServer(serverId);
      if (!server) {
        return res.status(404).json({
          status: "error",
          message: "Server not found",
        });
      }

      // Verify credentials
      const daService = new DirectAdminService({
        hostname: server.hostname,
        port: server.port,
        username: daUsername.trim(),
        password: daPassword,
        useSSL: server.useSSL !== false,
      });

      const userDetails = await daService.getUserDetails(daUsername.trim());

      // Attach user to request
      req.user = {
        daUsername: daUsername.trim(),
        daPassword: daPassword, // Note: In production, use sessions/tokens instead
        domains: userDetails.domains || [],
      };

      next();
    } catch (error) {
      console.error("DirectAdmin authentication error:", error);
      res.status(401).json({
        status: "error",
        message: "Invalid DirectAdmin credentials",
      });
    }
  };
}
