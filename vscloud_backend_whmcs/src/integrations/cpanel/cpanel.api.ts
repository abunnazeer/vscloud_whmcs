// src/integrations/cpanel/cpanel.api.ts
import axios from "axios";

export class CPanelApi {
  private baseUrl: string;
  private username: string;
  private password: string;

  constructor(serverIp: string, username: string, password: string) {
    this.baseUrl = `https://${serverIp}:2083`;
    this.username = username;
    this.password = password;
  }

  private async makeRequest(
    module: string,
    function_name: string,
    parameters: any = {}
  ) {
    try {
      const url = `${this.baseUrl}/execute/${module}/${function_name}`;
      const response = await axios({
        method: "POST",
        url,
        data: parameters,
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${this.username}:${this.password}`
          ).toString("base64")}`,
          "Content-Type": "application/json",
        },
        validateStatus: null,
      });

      if (response.data.status !== 1) {
        throw new Error(
          response.data.errors?.[0] || "cPanel API request failed"
        );
      }

      return response.data;
    } catch (error) {
      console.error("cPanel API Error:", error);
      throw error;
    }
  }

  // File Management
  async listFiles(directory: string = "/") {
    return this.makeRequest("Fileman", "list_files", {
      dir: directory,
    });
  }

  async uploadFile(path: string, content: string) {
    return this.makeRequest("Fileman", "upload_files", {
      dir: path,
      content: content,
    });
  }

  // Database Management
  async listDatabases() {
    return this.makeRequest("MysqlFE", "listdbs");
  }

  async createDatabase(name: string) {
    return this.makeRequest("MysqlFE", "createdb", {
      db: name,
    });
  }

  async createDatabaseUser(username: string, password: string) {
    return this.makeRequest("MysqlFE", "createdbuser", {
      dbuser: username,
      password: password,
    });
  }

  // Email Management
  async listEmailAccounts() {
    return this.makeRequest("Email", "list_pops");
  }

  async createEmailAccount(email: string, password: string, quota: number) {
    return this.makeRequest("Email", "add_pop", {
      email,
      password,
      quota,
    });
  }

  async createEmailForwarder(email: string, forward: string) {
    return this.makeRequest("Email", "add_forwarder", {
      domain: email.split("@")[1],
      email: email.split("@")[0],
      forward,
    });
  }

  // Domain Management
  async listDomains() {
    return this.makeRequest("DomainInfo", "list_domains");
  }

  async addSubdomain(subdomain: string, domain: string, dir: string) {
    return this.makeRequest("SubDomain", "addsubdomain", {
      domain: subdomain,
      rootdomain: domain,
      dir,
    });
  }

  // SSL Management
  async installSSL(certificate: string, key: string, domain: string) {
    return this.makeRequest("SSL", "install_ssl", {
      cert: certificate,
      key,
      domain,
    });
  }

  // Backup Management
  async createBackup(email: string, type: "home" | "mysql" | "email") {
    return this.makeRequest("Backup", "fullbackup_to_email", {
      email,
      type,
    });
  }

  // DNS Management
  async listDNSRecords(domain: string) {
    return this.makeRequest("DNS", "list_records", {
      domain,
    });
  }

  async addDNSRecord(
    domain: string,
    type: string,
    name: string,
    content: string,
    ttl: number = 14400
  ) {
    return this.makeRequest("DNS", "add_record", {
      domain,
      type,
      name,
      content,
      ttl,
    });
  }

  // Resource Usage
  async getBandwidthUsage() {
    return this.makeRequest("Stats", "get_bandwidth_data");
  }

  async getDiskUsage() {
    return this.makeRequest("Stats", "get_disk_usage");
  }

  // FTP Management
  async createFTPAccount(
    username: string,
    password: string,
    directory: string
  ) {
    return this.makeRequest("Ftp", "add_ftp", {
      user: username,
      pass: password,
      homedir: directory,
    });
  }

  async listFTPAccounts() {
    return this.makeRequest("Ftp", "list_ftp");
  }

  // Site Software
  async installWordPress(domain: string, directory: string) {
    return this.makeRequest("Sophie", "install", {
      app: "WordPress",
      domain,
      directory,
    });
  }
}
