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

  // This should replace the existing listPackages method
  async listPackages(): Promise<Record<string, any>> {
    try {
      console.log("DirectAdminService: Listing packages");
      const packages = await this.api.getPackages();

      if (!packages || Object.keys(packages).length === 0) {
        console.log("No packages found or empty response from DirectAdmin");
        return {};
      }

      console.log("DirectAdminService: Found packages:", Object.keys(packages));
      return packages;
    } catch (error) {
      console.error("DirectAdminService error listing packages:", error);
      if (error instanceof DirectAdminError) {
        throw new Error(`DirectAdmin error: ${error.message}`);
      }
      throw error;
    }
  }

  // This should replace the existing getPackageDetails method
  async getPackageDetails(name: string): Promise<Record<string, any>> {
    try {
      console.log(`DirectAdminService: Getting details for package ${name}`);
      const packageDetails = await this.api.getPackageDetails(name);

      if (!packageDetails || Object.keys(packageDetails).length === 0) {
        throw new Error(`Package ${name} not found or empty details returned`);
      }

      return packageDetails;
    } catch (error) {
      console.error(
        `DirectAdminService error getting package details for ${name}:`,
        error
      );
      if (error instanceof DirectAdminError) {
        throw new Error(`DirectAdmin error: ${error.message}`);
      }
      throw error;
    }
  }

  async createPackage(packageData: Record<string, any>): Promise<boolean> {
    try {
      console.log("DirectAdminService: Creating package:", packageData.name);

      if (!packageData.name) {
        throw new Error("Package name is required");
      }

      // Try with retries
      const maxAttempts = 3;
      let lastError = null;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`Retry attempt ${attempt + 1}`);
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          }

          const result = await this.api.createPackage(packageData);
          return true;
        } catch (error) {
          lastError = error;
          console.error(`Attempt ${attempt + 1} failed:`, error);
        }
      }

      throw (
        lastError ||
        new Error("Failed to create package after multiple attempts")
      );
    } catch (error) {
      console.error("Final create package error:", error);
      throw error;
    }
  }

  async updatePackage(
    name: string,
    packageData: Record<string, any>
  ): Promise<boolean> {
    try {
      console.log(`Service: Updating package ${name}`);

      // Validate input
      if (!name) throw new Error("Package name is required");
      if (!packageData || Object.keys(packageData).length === 0) {
        throw new Error("No update parameters provided");
      }

      // Try with progressive backoff
      const delays = [1000, 3000, 5000]; // 1s, 3s, 5s
      let lastError = null;

      for (let attempt = 0; attempt < delays.length; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`Retry ${attempt} after ${delays[attempt - 1]}ms`);
            await new Promise(resolve =>
              setTimeout(resolve, delays[attempt - 1])
            );
          }

          const result = await this.api.updatePackage(name, packageData);
          return true;
        } catch (error) {
          lastError = error;
          if (error instanceof Error) {
            console.error(`Attempt ${attempt + 1} failed:`, error.message);
          } else {
            console.error(`Attempt ${attempt + 1} failed:`, error);
          }
        }
      }

      throw lastError || new Error(`Failed after ${delays.length} attempts`);
    } catch (error) {
      console.error(`Final update error for ${name}:`, error);
      throw error;
    }
  }

  async renamePackage(
    oldName: string,
    newName: string,
    packageData: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      console.log(`Service: Renaming package ${oldName} to ${newName}`);

      // Try with progressive backoff
      const delays = [1000, 3000, 5000]; // 1s, 3s, 5s
      let lastError = null;

      for (let attempt = 0; attempt < delays.length; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`Retry ${attempt} after ${delays[attempt - 1]}ms`);
            await new Promise(resolve =>
              setTimeout(resolve, delays[attempt - 1])
            );
          }

          const result = await this.api.renamePackage(
            oldName,
            newName,
            packageData
          );
          return true;
        } catch (error) {
          lastError = error;
          if (error instanceof Error) {
            console.error(`Attempt ${attempt + 1} failed:`, error.message);
          } else {
            console.error(`Attempt ${attempt + 1} failed:`, error);
          }
        }
      }

      throw lastError || new Error(`Failed after ${delays.length} attempts`);
    } catch (error) {
      console.error(`Final rename error for ${oldName}:`, error);
      throw error;
    }
  }

  async deletePackage(name: string): Promise<boolean> {
    // Retry logic with progressive backoff
    const delays = [1000, 3000, 5000];
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < delays.length; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise(resolve =>
            setTimeout(resolve, delays[attempt - 1])
          );
        }

        // Attempt deletion
        await this.api.deletePackage(name);

        // Verify package is actually deleted
        try {
          await this.api.getPackageDetails(name);
          throw new Error(`Package ${name} still exists after deletion`);
        } catch (verifyError) {
          if (verifyError instanceof Error) {
            if (verifyError.message.includes("not found")) {
              return true; // Success - package is gone
            }
            if (verifyError.message.includes("still exists")) {
              lastError = verifyError;
              continue; // Will trigger retry
            }
          }
          throw verifyError;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Delete attempt ${attempt + 1} failed:`, error);
      }
    }

    throw (
      lastError ||
      new Error(`Failed to delete package after ${delays.length} attempts`)
    );
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

      const result = await this.api.executeCommand(
        "ACCOUNT_USER",
        params,
        "POST"
      );

      if (result && result.connectionReset === true) {
        console.log(
          "Connection was reset during user creation - verifying user exists"
        );

        await new Promise(resolve => setTimeout(resolve, 3000));

        const userExists = await this.api.userExists(userData.username);
        if (userExists) {
          console.log(
            `Verified user ${userData.username} was created successfully despite connection reset`
          );
          return true;
        } else {
          throw new Error(
            `User creation may have failed - user ${userData.username} not found after reset`
          );
        }
      }

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
      console.log(
        `DirectAdminService: Updating user ${username} with:`,
        userData
      );

      const result = await this.api.updateUser(username, userData);
      console.log("Update API response:", result);
      return true;
    } catch (error) {
      console.error(`DirectAdmin user update error for ${username}:`, error);

      // Only treat "0" as success, all other errors should be thrown
      if (error instanceof DirectAdminError && error.message === "0") {
        console.log(
          `User ${username} updated successfully despite error code 0`
        );
        return true;
      }

      // Throw all other errors
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
  // These are improved methods for the DirectAdminService class

  async createEmailAccount(
    domain: string,
    email: string,
    password: string,
    quota: number,
    targetUsername: any
  ): Promise<boolean> {
    try {
      console.log(`Creating email account ${email} on domain ${domain}`);

      // Basic validation
      if (!domain || !email || !email.includes("@") || !password) {
        throw new Error(
          "Invalid email parameters: domain, email and password are required"
        );
      }

      // Check if domain exists (optional, but useful)
      // You could implement a domain check here if needed

      // Try with retries
      const maxAttempts = 3;
      let lastError = null;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          if (attempt > 0) {
            console.log(
              `Retry attempt ${attempt + 1} for creating email ${email}`
            );
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          }

          const result = await this.api.createEmailAccount(
            domain,
            email,
            password,
            quota
          );
          if (result) {
            console.log(`Successfully created email account ${email}`);
            return true;
          } else {
            console.log(
              `Failed to create email account ${email} (no error thrown)`
            );
            continue; // Try again
          }
        } catch (error) {
          lastError = error;
          console.error(`Attempt ${attempt + 1} failed:`, error);
        }
      }

      throw (
        lastError ||
        new Error(
          `Failed to create email account ${email} after multiple attempts`
        )
      );
    } catch (error) {
      console.error(`Error creating email account ${email}:`, error);
      throw error;
    }
  }

  async listEmailAccounts(domain: string): Promise<string[]> {
    try {
      console.log(`Listing email accounts for domain ${domain}`);

      if (!domain) {
        throw new Error("Domain is required to list email accounts");
      }

      // Try with retries
      const maxAttempts = 2;
      let lastError = null;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          if (attempt > 0) {
            console.log(
              `Retry attempt ${attempt + 1} for listing emails on ${domain}`
            );
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }

          const emails = await this.api.listEmailAccounts(domain);
          console.log(
            `Found ${emails.length} email accounts for domain ${domain}`
          );
          return emails;
        } catch (error) {
          lastError = error;
          console.error(`Attempt ${attempt + 1} failed:`, error);
        }
      }

      // If all attempts failed but no exception was thrown
      console.log(
        `All attempts to list emails for ${domain} failed, returning empty array`
      );
      return [];
    } catch (error) {
      console.error(`Error listing email accounts for ${domain}:`, error);
      throw error;
    }
  }

  async updateEmailPassword(
    email: string,
    newPassword: string
  ): Promise<boolean> {
    try {
      console.log(`Updating password for email account ${email}`);

      if (!email || !email.includes("@") || !newPassword) {
        throw new Error("Email address and new password are required");
      }

      // Try with retries
      const maxAttempts = 2;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          if (attempt > 0) {
            console.log(
              `Retry attempt ${attempt + 1} for updating password of ${email}`
            );
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }

          const result = await this.api.updateEmailPassword(email, newPassword);
          if (result) {
            console.log(`Successfully updated password for ${email}`);
            return true;
          }
        } catch (error) {
          console.error(`Attempt ${attempt + 1} failed:`, error);
        }
      }

      throw new Error(
        `Failed to update email password for ${email} after multiple attempts`
      );
    } catch (error) {
      console.error(`Error updating email password for ${email}:`, error);
      throw error;
    }
  }

  async deleteEmailAccount(email: string): Promise<boolean> {
    try {
      console.log(`Deleting email account ${email}`);

      if (!email || !email.includes("@")) {
        throw new Error("Valid email address is required");
      }

      // Try with retries
      const maxAttempts = 2;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`Retry attempt ${attempt + 1} for deleting ${email}`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }

          const result = await this.api.deleteEmailAccount(email);
          if (result) {
            console.log(`Successfully deleted email account ${email}`);
            return true;
          }
        } catch (error) {
          console.error(`Attempt ${attempt + 1} failed:`, error);
        }
      }

      throw new Error(
        `Failed to delete email account ${email} after multiple attempts`
      );
    } catch (error) {
      console.error(`Error deleting email account ${email}:`, error);
      throw error;
    }
  }
}