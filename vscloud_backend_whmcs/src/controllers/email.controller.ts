// src/controllers/email.controller.ts
import { Request, Response } from "express";
import { DirectAdminService } from "../integrations/directadmin/directadmin.service";
import { ServerService } from "../services/server.service";

export class EmailController {
  private serverService: ServerService;

  constructor() {
    this.serverService = new ServerService();
  }

  // In your email.controller.ts
  public login = async (req: Request, res: Response) => {
    try {
      const { serverId, username, password } = req.body;

      if (!serverId || !username || !password) {
        return res.status(400).json({
          status: "error",
          message: "Server ID, username and password are required",
        });
      }

      const server = await this.serverService.getServer(serverId);
      if (!server) {
        return res.status(404).json({
          status: "error",
          message: "Server not found",
        });
      }

      // Test credentials by making a simple API call
      const daService = new DirectAdminService({
        hostname: server.hostname,
        port: server.port,
        username: username.trim(),
        password: password,
        useSSL: server.useSSL !== false,
      });

      // Try to get user details to verify credentials
      const userDetails = await daService.getUserDetails(username.trim());

      // If we get here, credentials are valid
      // In a real app, you'd create a session token here
      res.json({
        status: "success",
        data: {
          username: username.trim(),
          domains: userDetails.domains || [],
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(401).json({
        status: "error",
        message: "Invalid DirectAdmin credentials",
      });
    }
  };
  public createEmail = async (req: Request, res: Response) => {
    try {
      const { serverId, domain, email, password, quota } = req.body;
      const authUser = req.user; // Assuming you've added authentication middleware

      if (!authUser || !authUser.daUsername || !authUser.daPassword) {
        return res.status(401).json({
          status: "error",
          message: "DirectAdmin authentication required",
        });
      }

      // Validate inputs
      if (!serverId || !domain || !email || !password) {
        return res.status(400).json({
          status: "error",
          message: "Missing required fields",
        });
      }

      const server = await this.serverService.getServer(serverId);
      if (!server) {
        return res.status(404).json({
          status: "error",
          message: "Server not found",
        });
      }

      // Initialize service with user's DA credentials
      const daService = new DirectAdminService({
        hostname: server.hostname,
        port: server.port,
        username: authUser.daUsername,
        password: authUser.daPassword,
        useSSL: server.useSSL !== false,
      });

      // Verify user owns the domain
      const userDetails = await daService.getUserDetails(authUser.daUsername);
      if (!userDetails.domains || !userDetails.domains.includes(domain)) {
        return res.status(403).json({
          status: "error",
          message:
            "You do not have permission to create emails for this domain",
        });
      }

      // Create the email
      const success = await daService.createEmailAccount(
        domain,
        email,
        password,
        quota
      );

      if (!success) {
        return res.status(400).json({
          status: "error",
          message: "Failed to create email account",
        });
      }

      res.status(201).json({
        status: "success",
        data: { email, domain },
      });
    } catch (error) {
      console.error("Email creation error:", error);
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Email creation failed",
      });
    }
  };

  public listEmails = async (req: Request, res: Response) => {
    try {
      const { serverId, domain } = req.query;

      // Validate required fields
      if (!serverId) {
        return res.status(400).json({
          status: "error",
          message: "Server ID is required",
        });
      }

      if (!domain) {
        return res.status(400).json({
          status: "error",
          message: "Domain is required",
        });
      }

      try {
        const server = await this.serverService.getServer(serverId as string);
        if (!server) {
          return res.status(404).json({
            status: "error",
            message: "Server not found",
          });
        }

        const daService = new DirectAdminService(server);
        console.log(`Listing email accounts for domain ${domain}`);

        const emails = await daService.listEmailAccounts(domain as string);

        res.json({
          status: "success",
          data: { emails },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to list emails";
        console.error(`Error listing emails for domain ${domain}:`, message);

        res.status(400).json({
          status: "error",
          message,
        });
      }
    } catch (error) {
      console.error("Unhandled error in listEmails:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  };

  public updateEmail = async (req: Request, res: Response) => {
    try {
      const { serverId, email, password } = req.body;

      // Validate required fields
      if (!serverId) {
        return res.status(400).json({
          status: "error",
          message: "Server ID is required",
        });
      }

      if (!email || !password) {
        return res.status(400).json({
          status: "error",
          message: "Email and password are required",
        });
      }

      try {
        const server = await this.serverService.getServer(serverId);
        if (!server) {
          return res.status(404).json({
            status: "error",
            message: "Server not found",
          });
        }

        const daService = new DirectAdminService(server);
        const success = await daService.updateEmailPassword(email, password);

        if (!success) {
          return res.status(400).json({
            status: "error",
            message: "Failed to update email password",
          });
        }

        res.json({
          status: "success",
          message: "Email password updated successfully",
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Email update failed";
        console.error(`Error updating email ${email}:`, message);

        res.status(400).json({
          status: "error",
          message,
        });
      }
    } catch (error) {
      console.error("Unhandled error in updateEmail:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  };

  public deleteEmail = async (req: Request, res: Response) => {
    try {
      const { serverId } = req.query;
      const { email } = req.params;

      // Validate required fields
      if (!serverId) {
        return res.status(400).json({
          status: "error",
          message: "Server ID is required",
        });
      }

      if (!email) {
        return res.status(400).json({
          status: "error",
          message: "Email is required",
        });
      }

      try {
        const server = await this.serverService.getServer(serverId as string);
        if (!server) {
          return res.status(404).json({
            status: "error",
            message: "Server not found",
          });
        }

        const daService = new DirectAdminService(server);
        const success = await daService.deleteEmailAccount(email);

        if (!success) {
          return res.status(400).json({
            status: "error",
            message: "Failed to delete email account",
          });
        }

        res.json({
          status: "success",
          message: "Email deleted successfully",
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Email deletion failed";
        console.error(`Error deleting email ${email}:`, message);

        res.status(400).json({
          status: "error",
          message,
        });
      }
    } catch (error) {
      console.error("Unhandled error in deleteEmail:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  };

  // Commented out method remains unchanged
  //   public createForwarder = async (req: Request, res: Response) => { ... }

  //   public createForwarder = async (req: Request, res: Response) => {
  //     try {
  //       const { serverId, email, forwardTo } = req.body;

  //       // Validate required fields
  //       if (!serverId) {
  //         return res.status(400).json({
  //           status: "error",
  //           message: "Server ID is required",
  //         });
  //       }

  //       if (!email || !forwardTo) {
  //         return res.status(400).json({
  //           status: "error",
  //           message: "Email and forwardTo addresses are required",
  //         });
  //       }

  //       if (!Array.isArray(forwardTo) || forwardTo.length === 0) {
  //         return res.status(400).json({
  //           status: "error",
  //           message: "forwardTo must be a non-empty array of email addresses",
  //         });
  //       }

  //       try {
  //         const server = await this.serverService.getServer(serverId);
  //         if (!server) {
  //           return res.status(404).json({
  //             status: "error",
  //             message: "Server not found",
  //           });
  //         }

  //         const daService = new DirectAdminService(server);
  //         const success = await daService.createForwarder(email, forwardTo);

  //         if (!success) {
  //           return res.status(400).json({
  //             status: "error",
  //             message: "Failed to create forwarder",
  //           });
  //         }

  //         res.status(201).json({
  //           status: "success",
  //           data: { email, forwardTo },
  //         });
  //       } catch (error) {
  //         const message =
  //           error instanceof Error ? error.message : "Forwarder creation failed";
  //         console.error(`Error creating forwarder for ${email}:`, message);

  //         res.status(400).json({
  //           status: "error",
  //           message,
  //         });
  //       }
  //     } catch (error) {
  //       console.error("Unhandled error in createForwarder:", error);
  //       res.status(500).json({
  //         status: "error",
  //         message: "Internal server error",
  //       });
  //     }
  //   };
}
