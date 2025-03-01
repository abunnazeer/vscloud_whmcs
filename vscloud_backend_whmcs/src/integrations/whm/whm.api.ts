// src/integrations/whm/whm.api.ts
import axios from "axios";
import crypto from "crypto";

export class WHMApi {
  private baseUrl: string;
  private username: string;
  private authToken: string;

  constructor() {
    this.baseUrl = process.env.WHM_API_URL || "";
    this.username = process.env.WHM_USERNAME || "root";
    this.authToken = process.env.WHM_AUTH_TOKEN || "";
  }

  private async makeRequest(
    endpoint: string,
    method: string = "GET",
    data?: any
  ) {
    try {
      const url = `${this.baseUrl}/json-api/${endpoint}`;
      const response = await axios({
        method,
        url,
        data,
        headers: {
          Authorization: `WHM ${this.username}:${this.authToken}`,
          "Content-Type": "application/json",
        },
        validateStatus: null,
      });

      if (response.data.metadata?.result === 0) {
        throw new Error(
          response.data.metadata?.reason || "WHM API request failed"
        );
      }

      return response.data;
    } catch (error) {
      console.error("WHM API Error:", error);
      throw error;
    }
  }

  // Account Management
  async createAccount(data: {
    username: string;
    domain: string;
    plan: string;
    password: string;
    email: string;
  }) {
    const params = {
      username: data.username,
      domain: data.domain,
      plan: data.plan,
      password: data.password,
      contactemail: data.email,
      reseller: 0,
    };

    return this.makeRequest("createacct", "POST", params);
  }

  async suspendAccount(username: string, reason: string) {
    return this.makeRequest("suspendacct", "POST", {
      user: username,
      reason: reason,
    });
  }

  async unsuspendAccount(username: string) {
    return this.makeRequest("unsuspendacct", "POST", {
      user: username,
    });
  }

  async terminateAccount(username: string) {
    return this.makeRequest("removeacct", "POST", {
      user: username,
    });
  }

  // Resource Usage
  async getAccountResourceUsage(username: string) {
    const response = await this.makeRequest("showbw", "GET", {
      search: username,
      searchtype: "user",
    });

    return response.data;
  }

  // Server Status and Information
  async getServerLoad() {
    return this.makeRequest("systemloadavg");
  }

  async getServerStatus() {
    return this.makeRequest("getsysteminfo");
  }

  async getDiskUsage() {
    return this.makeRequest("getdiskusage");
  }

  // Service Management
  async restartService(service: string) {
    return this.makeRequest("restartservice", "POST", {
      service: service,
    });
  }

  // Package Management
  async listPackages() {
    return this.makeRequest("listpkgs");
  }

  async createPackage(data: {
    name: string;
    diskQuota: number;
    bandwidth: number;
    maxDomains: number;
    maxDatabases: number;
    maxEmailAccounts: number;
  }) {
    return this.makeRequest("addpkg", "POST", {
      name: data.name,
      quota: data.diskQuota,
      bwlimit: data.bandwidth,
      maxdomains: data.maxDomains,
      maxsql: data.maxDatabases,
      maxpop: data.maxEmailAccounts,
    });
  }

  // SSL Management
  async installSSL(
    domain: string,
    certificate: string,
    key: string,
    cabundle?: string
  ) {
    return this.makeRequest("installssl", "POST", {
      domain: domain,
      crt: certificate,
      key: key,
      cabundle: cabundle,
    });
  }

  // Backup Management
  async createBackup(username: string) {
    return this.makeRequest("backup_user_account", "POST", {
      user: username,
    });
  }

  // Domain Management
  async addDomain(username: string, domain: string) {
    return this.makeRequest("adddomainzone", "POST", {
      user: username,
      domain: domain,
    });
  }

  async removeDomain(username: string, domain: string) {
    return this.makeRequest("deldomainzone", "POST", {
      user: username,
      domain: domain,
    });
  }

  // Database Management
  async createDatabase(username: string, database: string) {
    return this.makeRequest("create_database", "POST", {
      user: username,
      name: database,
    });
  }

  // Email Management
  async createEmailAccount(
    username: string,
    email: string,
    password: string,
    quota: number
  ) {
    return this.makeRequest("create_pop", "POST", {
      user: username,
      email: email,
      password: password,
      quota: quota,
    });
  }

  // Server Monitoring
  async getServerStats() {
    const [loadAvg, sysInfo, diskUsage] = await Promise.all([
      this.getServerLoad(),
      this.getServerStatus(),
      this.getDiskUsage(),
    ]);

    return {
      load: loadAvg,
      system: sysInfo,
      disk: diskUsage,
    };
  }
}
