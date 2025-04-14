// src/integrations/directadmin/directadmin.service.ts
import { ServerConfig } from "../../interfaces/server.interface";
import { DirectAdminApi, DirectAdminError } from "./directadmin.api";

export class DirectAdminService {
  private api: DirectAdminApi;

  constructor(serverConfig: ServerConfig) {
    this.api = new DirectAdminApi({
      host: serverConfig.hostname,
      port: serverConfig.port || 2222,
      username: serverConfig.username,
      password: serverConfig.password,
      useSSL: serverConfig.useSSL !== false,
    });
  }

  // Package Management
  async listPackages(): Promise<Record<string, any>> {
    try {
      const result = await this.api.getPackages();
      return result;
    } catch (error) {
      if (error instanceof DirectAdminError) {
        throw new Error(`DirectAdmin error: ${error.message}`);
      }
      throw error;
    }
  }

  async getPackageDetails(name: string): Promise<Record<string, any>> {
    try {
      const result = await this.api.getPackageDetails(name);
      return result;
    } catch (error) {
      if (error instanceof DirectAdminError) {
        throw new Error(`DirectAdmin error: ${error.message}`);
      }
      throw error;
    }
  }

  async createPackage(packageData: Record<string, any>): Promise<boolean> {
    try {
      const result = await this.api.createPackage(packageData);
      return result;
    } catch (error) {
      if (error instanceof DirectAdminError) {
        throw new Error(`DirectAdmin error: ${error.message}`);
      }
      throw error;
    }
  }

  async updatePackage(
    name: string,
    packageData: Record<string, any>
  ): Promise<boolean> {
    try {
      const result = await this.api.updatePackage(name, packageData);
      return result;
    } catch (error) {
      if (error instanceof DirectAdminError) {
        throw new Error(`DirectAdmin error: ${error.message}`);
      }
      throw error;
    }
  }

  async deletePackage(name: string): Promise<boolean> {
    try {
      const result = await this.api.deletePackage(name);
      return result;
    } catch (error) {
      if (error instanceof DirectAdminError) {
        throw new Error(`DirectAdmin error: ${error.message}`);
      }
      throw error;
    }
  }

  // USER Management
  async listUsers(): Promise<{
    status: string;
    data: { users: string[]; error?: string };
  }> {
    try {
      const users = await this.api.getAllUsers();

      if (users.length === 0) {
        throw new Error("No users found - possible configuration issue");
      }

      return {
        status: "success",
        data: {
          users: users,
        },
      };
    } catch (error) {
      console.error("Error in listUsers:", error);
      return {
        status: "error",
        data: {
          users: [],
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  async getUserDetails(username: string): Promise<Record<string, any>> {
    try {
      const result = await this.api.getUserDetails(username);
      return result;
    } catch (error) {
      if (error instanceof DirectAdminError) {
        throw new Error(`DirectAdmin error: ${error.message}`);
      }
      throw error;
    }
  }

  async createUser(userData: Record<string, any>): Promise<boolean> {
    try {
     
      const exists = await this.api.userExists(userData.username);
      if (exists) {
        throw new Error(`User ${userData.username} already exists`);
      }

      const params = {
        action: "create",
        username: userData.username,
        email: userData.email,
        passwd: userData.passwd,
        passwd2: userData.passwd2 || userData.passwd,
        domain: userData.domain,
        package: userData.package,
        notify: userData.notify === "yes" ? "yes" : "no",
        dns: "ON",
        cgi: "ON",
        php: "ON",
        ssl: "ON",
      };

      await this.api.executeCommand("ACCOUNT_USER", params, "POST");

      return true;
    } catch (error) {
      console.error("DirectAdmin user creation error:", error);

      
      if (error instanceof DirectAdminError && error.message === "0") {
        console.log(
          `User ${userData.username} created successfully despite error`
        );
        return true;
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error("Unknown error during user creation");
    }
  }

  async updateUser(
    username: string,
    userData: Record<string, any>
  ): Promise<boolean> {
    try {
      await this.api.executeCommand("ACCOUNT_USER", {
        action: "modify",
        user: username,
        ...userData,
      });
      return true;
    } catch (error) {
      if (error instanceof DirectAdminError) {
        throw new Error(`DirectAdmin error: ${error.message}`);
      }
      throw error;
    }
  }

  async deleteUser(username: string): Promise<boolean> {
    try {
      
      await this.api.deleteUser(username);
      return true;
    } catch (error) {
      if (error instanceof DirectAdminError) {
        throw new Error(`DirectAdmin error: ${error.message}`);
      }
      throw error;
    }
  }

  async suspendUser(username: string): Promise<boolean> {
    try {
     
      await this.api.suspendUser(username);
      return true;
    } catch (error) {
      if (error instanceof DirectAdminError) {
        throw new Error(`DirectAdmin error: ${error.message}`);
      }
      throw error;
    }
  }

  async unsuspendUser(username: string): Promise<boolean> {
    try {
      
      await this.api.unsuspendUser(username);
      return true;
    } catch (error) {
      if (error instanceof DirectAdminError) {
        throw new Error(`DirectAdmin error: ${error.message}`);
      }
      throw error;
    }
  }

  async getServerUsage(): Promise<Record<string, any>> {
    try {
      const result = await this.api.executeCommand(
        "SHOW_USER_USAGE",
        {},
        "GET"
      );
      return result;
    } catch (error) {
      if (error instanceof DirectAdminError) {
        throw new Error(`DirectAdmin error: ${error.message}`);
      }
      throw error;
    }
  }
}