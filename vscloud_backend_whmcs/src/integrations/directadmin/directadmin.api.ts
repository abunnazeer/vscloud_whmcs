//src/integrations/directadmin/directadmin.api.ts
import axios from "axios";

interface DirectAdminConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  useSSL?: boolean;
}

export class DirectAdminApi {
  private host: string;
  private port: number;
  private username: string;
  private password: string;
  private protocol: string;
  client: any;

  constructor(config: DirectAdminConfig) {
    this.host = config.host;
    this.port = config.port || 2222;
    this.username = config.username;
    this.password = config.password;
    this.protocol = config.useSSL === false ? "http" : "https";

    this.client = axios.create({
      baseURL: `${this.protocol}://${this.host}:${this.port}`,
      auth: {
        username: this.username,
        password: this.password,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 10000,
    });
  }

  public getHost(): string {
    return this.host;
  }
  // Add this method to your DirectAdminApi class

  /**
   * Verify if the current credentials are valid
   * @returns Promise<boolean> True if credentials are valid
   */
  public async verifyCredentials(): Promise<boolean> {
    try {
      // Call a simple DirectAdmin endpoint to verify login works
      // For example, get user details or server status
      const response = await this.executeCommand(
        "CMD_API_SHOW_RESELLER_IPS",
        {},
        "GET"
      );

      // If we get here without exception, credentials are valid
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes("Not logged in")) {
        return false;
      }

      // For other errors, we'll need to decide if they indicate invalid credentials
      // You might need to adjust this logic based on DirectAdmin API behavior
      return false;
    }
  }
  async executeCommand(
    command: string,
    params: Record<string, any> = {},
    method: "GET" | "POST" = "POST"
  ): Promise<any> {
    try {
      const endpoint = `/CMD_API_${command.replace(/^CMD_API_/, "")}`;
      const url = `${this.protocol}://${this.host}:${this.port}${endpoint}`;
      let response;
      if (method === "GET") {
        response = await axios.get(url, {
          auth: {
            username: this.username,
            password: this.password,
          },
          params: params,
        });
      } else {
        const formData = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
          if (value !== undefined && value !== null) {
            formData.append(key, String(value));
          }
        }

        response = await axios.post(url, formData, {
          auth: {
            username: this.username,
            password: this.password,
          },
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });
      }

      return this.parseResponse(response.data);
    } catch (error) {
      console.error("DirectAdmin API Error:", error);

      if (
        axios.isAxiosError(error) &&
        error.code === "ECONNRESET" &&
        command === "ACCOUNT_USER" &&
        (params.action === "create" || params.action === "modify")
      ) {
        console.log(
          `Connection reset during user ${params.action} - will verify user exists`
        );
        await new Promise(resolve => setTimeout(resolve, 2000));

        return {
          connectionReset: true,
          command: "ACCOUNT_USER",
          action: params.action,
        };
      }
    }
  }
  private parseQueryString(queryString: string): Record<string, string> {
    if (!queryString || typeof queryString !== "string") {
      return {};
    }

    const result: Record<string, string> = {};
    const pairs = queryString.split("&");

    for (const pair of pairs) {
      const [key, value] = pair.split("=");
      if (key) {
        result[key] = value ? decodeURIComponent(value) : "";
      }
    }

    return result;
  }

  parseResponse(responseData: any, status?: number): any {
    if (typeof responseData !== "string") {
      return responseData;
    }

    const parsedData = this.parseQueryString(responseData);

    if (parsedData.error && parsedData.error !== "0") {
      throw new DirectAdminError(parsedData.text || parsedData.error, status);
    }

    return parsedData;
  }

  public async getPackages(): Promise<Record<string, any>> {
    try {
      console.log("Fetching packages from DirectAdmin");

      // Make a direct API call to get the raw response
      const rawResponse = await this.client.get("/CMD_API_PACKAGES_USER", {
        auth: {
          username: this.username,
          password: this.password,
        },
      });

      console.log("Raw API response:", rawResponse.data);

      // Handle different response formats
      const packages: Record<string, any> = {};
      const data = rawResponse.data;

      if (typeof data === "string") {
        // If it's a string response, check for list format or key-value format
        if (data.includes("list[]=")) {
          // Handle list[] format
          const packageNames = data.match(/list\[\]=([^&]+)/g) || [];
          packageNames.forEach((match, _index) => {
            const packageName = decodeURIComponent(
              match.replace("list[]=", "")
            );
            packages[packageName] = packageName;
          });
        } else {
          // Handle regular key=value format
          const pairs = data.split("&");
          for (const pair of pairs) {
            const [key, value] = pair.split("=");
            if (key && !["error", "text", "details", "result"].includes(key)) {
              packages[decodeURIComponent(key)] = value
                ? decodeURIComponent(value)
                : "";
            }
          }
        }
      } else if (typeof data === "object" && data !== null) {
        // Handle object response
        if (data["list[]"]) {
          // Single package in list[] format
          packages[data["list[]"]] = data["list[]"];
        } else if (Array.isArray(data.list)) {
          // Multiple packages in list array
          data.list.forEach((pkg: string) => {
            packages[pkg] = pkg;
          });
        } else {
          // Regular object with packages as keys
          Object.keys(data).forEach(key => {
            if (!["error", "text", "details", "result", "list"].includes(key)) {
              packages[key] = data[key];
            }
          });
        }
      }

      console.log("Parsed packages:", packages);
      return packages;
    } catch (error) {
      console.error("Error getting packages:", error);
      throw error;
    }
  }

  public async getPackageDetails(name: string): Promise<Record<string, any>> {
    try {
      console.log(`Fetching details for package: ${name}`);

      // First check if the package exists in the list
      const packages = await this.getPackages();
      if (!packages || !Object.keys(packages).includes(name)) {
        console.log(`Package ${name} not found in package list`);
        throw new Error(`Package ${name} not found`);
      }

      // Try a direct API call with specific parameters
      const params = new URLSearchParams();
      params.append("package", name);

      const response = await this.client.post(
        "/CMD_API_PACKAGES_USER",
        params,
        {
          auth: {
            username: this.username,
            password: this.password,
          },
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          params: {
            action: "view",
          },
        }
      );

      const data = response.data;
      console.log(
        `Raw API response for package ${name}:`,
        typeof data,
        data.substring
          ? data.substring(0, 100) + "..."
          : JSON.stringify(data).substring(0, 100)
      );

      // If we just got a blank/minimal response but know the package exists
      if (
        (!data ||
          data === "" ||
          (typeof data === "string" && data.trim() === "")) &&
        packages[name]
      ) {
        console.log(
          `Empty response for package ${name}, returning minimal info`
        );
        return {
          name,
          exists: true,
          package: name,
        };
      }

      // Handle the package details response
      let packageDetails: Record<string, any> = {};

      if (typeof data === "string") {
        // Handle HTML responses - very common with DirectAdmin
        if (data.includes("<!DOCTYPE") || data.includes("<html")) {
          console.log("Received HTML response, extracting package info");

          // Since we've already verified the package exists, return minimal info
          return {
            name,
            exists: true,
            package: name,
          };
        }

        // Parse string response (query string format)
        const pairs = data.split("&");
        for (const pair of pairs) {
          if (!pair.includes("=")) continue;
          const [key, value] = pair.split("=");
          if (key) {
            packageDetails[decodeURIComponent(key)] = value
              ? decodeURIComponent(value)
              : "";
          }
        }
      } else if (typeof data === "object" && data !== null) {
        packageDetails = data;
      }

      console.log(`Parsed details for package ${name}:`, packageDetails);

      // If we have an empty object but verified the package exists, return minimal info
      if (Object.keys(packageDetails).length === 0 && packages[name]) {
        return {
          name,
          exists: true,
          package: name,
        };
      }

      return packageDetails;
    } catch (error) {
      console.error(`Error getting package details for ${name}:`, error);

      // Check if the package exists in the list again as fallback
      try {
        const packages = await this.getPackages();
        if (packages && Object.keys(packages).includes(name)) {
          console.log(
            `Package ${name} exists in list despite detail fetch error`
          );
          return {
            name,
            exists: true,
            package: name,
          };
        }
      } catch (listError) {
        console.error("Failed fallback check:", listError);
      }

      throw error;
    }
  }

  public async createPackage(
    packageData: Record<string, any>
  ): Promise<boolean> {
    try {
      const packageName = packageData.name;
      console.log(`Creating package: ${packageName}`);

      // Prepare form data for the new endpoint
      const formData = new URLSearchParams();
      formData.append("json", "yes");
      formData.append("packagename", packageName);
      formData.append("add", "yes");

      // Add all package parameters
      const params = {
        bandwidth: packageData.bandwidth || "1000",
        quota: packageData.quota || "100",
        uinode: "yes",
        vdomains: packageData.domains || "1",
        nsubdomains: packageData.subDomains || "10",
        nemails: packageData.emailAccounts || "10",
        nemailf: packageData.emailForwarders || "0",
        nemailml: packageData.mailingLists || "0",
        nemailr: packageData.autoresponders || "10",
        mysql: packageData.mysqlDatabases || "5",
        domainptr: packageData.domainPointers || "0",
        ftp: packageData.ftpAccounts || "1",
        php: packageData.phpAccess ? "ON" : "OFF",
        spam: packageData.spamAssassin ? "ON" : "OFF",
        ssl: packageData.sslAccess ? "ON" : "OFF",
        cron: packageData.cronJobs ? "ON" : "OFF",
        sysinfo: packageData.systemInfo ? "ON" : "OFF",
        login_keys: packageData.loginKeys ? "ON" : "OFF",
        dnscontrol: packageData.dnsControl ? "ON" : "OFF",
        suspend_at_limit: packageData.suspendAtLimit ? "ON" : "OFF",
        language: packageData.language || "en",
        skin: packageData.skin || "evolution",
        feature_sets: "",
        plugins_allow: "[clear]",
        plugins_deny: "[clear]",
      };

      for (const [key, value] of Object.entries(params)) {
        formData.append(key, value);
      }

      const response = await this.client.post(
        "/CMD_MANAGE_USER_PACKAGES",
        formData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      console.log("Package creation response:", response.data);

      // Check for success
      if (response.data.success === "Saved") {
        return true;
      }

      throw new Error(response.data.result || "Package creation failed");
    } catch (error) {
      console.error("Error creating package:", error);
      throw error;
    }
  }

  public async updatePackage(
    name: string,
    packageData: Record<string, any>
  ): Promise<boolean> {
    try {
      console.log(`Updating package ${name} with:`, packageData);

      // Prepare form data exactly like the web UI does
      const formData = new URLSearchParams();
      formData.append("json", "yes");
      formData.append("packagename", name);
      formData.append("old_packagename", name);
      formData.append("add", "yes"); // This is crucial - same as web UI

      // Add all package parameters exactly as they appear in web UI
      const params = {
        bandwidth: packageData.bandwidth || "2000",
        quota: packageData.quota || "250",
        inode: packageData.inode || "",
        uinode: "yes",
        vdomains: packageData.vdomains || "1",
        nsubdomains: packageData.nsubdomains || "10",
        nemails: packageData.nemails || "10",
        nemailf: packageData.nemailf || "0",
        nemailml: packageData.nemailml || "0",
        nemailr: packageData.nemailr || "10",
        mysql: packageData.mysql || "5",
        domainptr: packageData.domainptr || "0",
        ftp: packageData.ftp || "1",
        php: packageData.php || "ON",
        spam: packageData.spam || "ON",
        ssl: packageData.ssl || "ON",
        cron: packageData.cron || "ON",
        sysinfo: packageData.sysinfo || "ON",
        login_keys: packageData.login_keys || "ON",
        dnscontrol: packageData.dnscontrol || "ON",
        suspend_at_limit: packageData.suspend_at_limit || "ON",
        language: packageData.language || "en",
        skin: packageData.skin || "evolution",
        feature_sets: "",
        plugins_allow: "[clear]",
        plugins_deny: "[clear]",
      };

      for (const [key, value] of Object.entries(params)) {
        formData.append(key, String(value));
      }

      // Use the exact same endpoint as web UI
      const response = await this.client.post(
        "/CMD_MANAGE_USER_PACKAGES",
        formData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      console.log("Update response:", response.data);

      // Check for success response
      if (response.data.success === "Saved") {
        return true;
      }

      // Some versions return error=0 on success
      if (response.data.error === "0") {
        return true;
      }

      throw new Error(response.data.text || "Package update failed");
    } catch (error) {
      console.error(`Update error for ${name}:`, error);
      throw new Error(
        `Failed to update package: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  public async renamePackage(
    oldName: string,
    newName: string,
    packageData: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      console.log(`Renaming package from ${oldName} to ${newName}`);

      // Prepare form data exactly like the web UI
      const formData = new URLSearchParams();
      formData.append("json", "yes");
      formData.append("packagename", newName);
      formData.append("old_packagename", oldName);
      formData.append("add", "yes");
      formData.append("rename", "yes"); // THIS IS THE KEY DIFFERENCE

      // Include all package parameters
      const params = {
        bandwidth: packageData.bandwidth || "10000",
        quota: packageData.quota || "10000",
        inode: packageData.inode || "",
        uinode: "yes",
        vdomains: packageData.vdomains || "1",
        nsubdomains: packageData.nsubdomains || "10",
        nemails: packageData.nemails || "10",
        nemailf: packageData.nemailf || "0",
        nemailml: packageData.nemailml || "0",
        nemailr: packageData.nemailr || "10",
        mysql: packageData.mysql || "5",
        domainptr: packageData.domainptr || "0",
        ftp: packageData.ftp || "1",
        php: packageData.php || "ON",
        spam: packageData.spam || "ON",
        ssl: packageData.ssl || "ON",
        cron: packageData.cron || "ON",
        sysinfo: packageData.sysinfo || "ON",
        login_keys: packageData.login_keys || "ON",
        dnscontrol: packageData.dnscontrol || "ON",
        suspend_at_limit: packageData.suspend_at_limit || "ON",
        language: packageData.language || "en",
        skin: packageData.skin || "evolution",
        feature_sets: "",
        plugins_allow: "[clear]",
        plugins_deny: "[clear]",
      };

      for (const [key, value] of Object.entries(params)) {
        formData.append(key, String(value));
      }

      // Make the API call
      const response = await this.client.post(
        "/CMD_MANAGE_USER_PACKAGES",
        formData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      console.log("Rename response:", response.data);

      // Check for success
      if (response.data.success === "Saved" || response.data.error === "0") {
        return true;
      }

      throw new Error(response.data.text || "Package rename failed");
    } catch (error) {
      console.error(`Rename error from ${oldName} to ${newName}:`, error);
      throw error;
    }
  }

  public async deletePackage(name: string): Promise<boolean> {
    try {
      console.log(`Deleting package: ${name}`);

      // Prepare form data EXACTLY as the web UI does
      const formData = new URLSearchParams();
      formData.append("json", "yes");
      formData.append("delete", "yes");
      formData.append("select0", name); // Package to delete
      formData.append("delete0", name); // Additional delete parameter

      // Make the API call to the exact same endpoint as web UI
      const response = await this.client.post(
        "/CMD_MANAGE_USER_PACKAGES",
        formData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          params: {
            json: "yes", // Also include as query parameter
          },
        }
      );

      console.log("Delete response:", response.data);

      // Handle different success responses
      if (
        response.data.error === "0" ||
        response.data.text?.includes("Deleted") ||
        response.data.success === "Deleted" ||
        response.data === ""
      ) {
        // Sometimes empty response means success
        return true;
      }

      throw new Error(response.data.text || "Package delete failed");
    } catch (error) {
      console.error(`Delete failed for package ${name}:`, error);

      // Special handling for error code "0" which sometimes means success
      if (error instanceof DirectAdminError && error.message === "0") {
        console.log(`Package ${name} deleted successfully despite error '0'`);
        return true;
      }

      throw error;
    }
  }

  public async getAllUsers(): Promise<string[]> {
    try {
      const response = await this.executeCommand("SHOW_USERS", {}, "GET");
      console.log("SHOW_USERS response:", response);

      const rawResponse = await this.client.get("/CMD_API_SHOW_USERS", {
        auth: {
          username: this.username,
          password: this.password,
        },
      });

      let users: string[] = [];
      const data = rawResponse.data;

      if (typeof data === "string") {
        const matches = data.match(/list\[\]=([^&]+)/g);
        if (matches) {
          users = matches.map(match =>
            decodeURIComponent(match.replace("list[]=", ""))
          );
        }
      } else if (Array.isArray(data)) {
        users = data.filter(user => typeof user === "string");
      } else if (typeof data === "object" && data !== null) {
        if (data.list && Array.isArray(data.list)) {
          users = data.list.filter((user: any) => typeof user === "string");
        } else {
          Object.keys(data).forEach(key => {
            if (
              !["error", "text", "details", "result", "suspended"].includes(key)
            ) {
              users.push(key);
            }
          });
        }
      }

      users = users.filter(
        user =>
          typeof user === "string" &&
          user.trim() !== "" &&
          user !== "0" &&
          !user.startsWith("_")
      );

      users = [...new Set(users)];

      console.log("Final users list:", users);
      return users;
    } catch (error) {
      console.error("Error getting users:", error);
      throw new DirectAdminError(
        `Failed to get users: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
  public async userExists(username: string): Promise<boolean> {
    try {
      const users = await this.getAllUsers();
      console.log(`Checking if user ${username} exists in:`, users);

      return users.some(user => user === username);
    } catch (error) {
      console.error(`Error checking if user ${username} exists:`, error);
      return false;
    }
  }

  public async getUserDetails(username: string): Promise<Record<string, any>> {
    const domains = await this.executeCommand(
      "SHOW_USER_DOMAINS",
      { user: username },
      "GET"
    );

    const config = await this.executeCommand(
      "SHOW_USER_CONFIG",
      { user: username },
      "GET"
    );

    return {
      domains,
      config,
    };
  }

  public async createUser(userData: {
    username: string;
    email: string;
    passwd: string;
    passwd2?: string;
    domain: string;
    package: string;
    notify?: string;
    [key: string]: any;
  }): Promise<boolean> {
    const exists = await this.userExists(userData.username);
    if (exists) {
      throw new DirectAdminError(`User ${userData.username} already exists`);
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

    await this.executeCommand("ACCOUNT_USER", params, "POST");
    return true;
  }

  public async deleteUser(username: string): Promise<boolean> {
    try {
      await this.executeCommand(
        "ACCOUNT_USER",
        {
          action: "delete",
          username: username,
          confirmed: "yes",
        },
        "POST"
      );
      return true;
    } catch (error) {
      console.error(`Error deleting user ${username}:`, error);
      throw error;
    }
  }

  public async suspendUser(username: string): Promise<boolean> {
    try {
      await this.executeCommand(
        "SELECT_USERS",
        {
          location: "suspend",
          select0: username,
          suspend: "Suspend",
        },
        "POST"
      );
      return true;
    } catch (error) {
      console.error(`Error suspending user ${username}:`, error);
      throw error;
    }
  }

  public async unsuspendUser(username: string): Promise<boolean> {
    try {
      await this.executeCommand(
        "SELECT_USERS",
        {
          location: "suspend",
          select0: username,
          suspend: "Unsuspend",
        },
        "POST"
      );
      return true;
    } catch (error) {
      console.error(`Error unsuspending user ${username}:`, error);
      throw error;
    }
  }

  public async updateUser(
    username: string,
    userData: Record<string, any>
  ): Promise<boolean> {
    try {
      const { email, passwd, passwd2, domain, package: packageName } = userData;

      if (passwd && passwd2) {
        await this.executeCommand(
          "CMD_API_MODIFY_USER",
          {
            action: "password",
            user: username,
            passwd,
            passwd2,
          },
          "POST"
        );
      }

      if (packageName) {
        await this.executeCommand(
          "CMD_API_MODIFY_USER",
          {
            action: "package",
            user: username,
            package: packageName,
          },
          "POST"
        );
      }

      if (email || domain) {
        const params: Record<string, any> = {
          action: "modify",
          user: username,
        };

        if (email) params.email = email;
        if (domain) params.domain = domain;

        await this.executeCommand("CMD_API_MODIFY_USER", params, "POST");
      }

      return true;
    } catch (error) {
      console.error(`Error updating user ${username}:`, error);
      throw error;
    }
  }

  // In directadmin.api.ts
  public async createEmailAccount(
    domain: string,
    email: string,
    password: string,
    quota: number,
    creatorUsername?: string
  ): Promise<boolean> {
    try {
      const [user, emailDomain] = email.split("@");

      // Validate domain matches
      if (emailDomain !== domain) {
        throw new Error("Email domain does not match specified domain");
      }

      const formData = new URLSearchParams();
      formData.append("json", "yes");
      formData.append("action", "create");
      formData.append("user", user);
      formData.append("domain", domain);
      formData.append("passwd", password);
      formData.append("passwd2", password);
      formData.append("quota", quota.toString());
      formData.append("limit", "5000");

      // If admin is creating for another user
      if (creatorUsername) {
        formData.append("creator", creatorUsername);
      }

      const response = await this.client.post("/CMD_EMAIL_POP", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        params: { json: "yes" },
      });

      // Handle different success responses
      if (response.data.error === "0" || response.data.success) {
        return true;
      }

      throw new Error(response.data.text || "Email creation failed");
    } catch (error) {
      console.error("Email creation error:", error);
      throw error;
    }
  }
  public async listEmailAccounts(domain: string): Promise<string[]> {
    try {
      console.log(`Listing email accounts for domain: ${domain}`);

      const params = {
        domain,
        action: "list",
      };

      const response = await this.executeCommand("EMAIL_POP", params, "GET");

      // Improved response handling
      if (!response) {
        console.log("No response received from DirectAdmin API");
        return [];
      }

      console.log("List emails response:", response);

      // Handle different response formats
      if (response.list && Array.isArray(response.list)) {
        return response.list;
      } else if (typeof response === "object") {
        // Extract email accounts from object keys (common DirectAdmin format)
        const emails: string[] = [];
        for (const key in response) {
          if (!["error", "text", "details", "result"].includes(key)) {
            emails.push(key);
          }
        }
        return emails;
      }

      return [];
    } catch (error) {
      console.error(`Failed to list email accounts for ${domain}:`, error);
      throw error;
    }
  }

  public async updateEmailPassword(
    email: string,
    newPassword: string
  ): Promise<boolean> {
    try {
      const [user, domain] = email.split("@") as [user: string, domain: string];
      console.log(`Updating password for email account: ${user}@${domain}`);

      const formData = new URLSearchParams();
      formData.append("action", "passwd");
      formData.append("domain", domain);
      formData.append("user", user);
      formData.append("passwd", newPassword);
      formData.append("passwd2", newPassword);

      const response = await this.executeCommand("EMAIL_POP", formData, "POST");

      // Improved response handling
      if (!response) {
        console.log("No response received from DirectAdmin API");
        return false;
      }

      console.log("Update email password response:", response);

      if (
        response.error === "0" ||
        response.success ||
        response.result === "success"
      ) {
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Failed to update email password for ${email}:`, error);
      throw error;
    }
  }

  public async deleteEmailAccount(email: string): Promise<boolean> {
    try {
      const [user, domain] = email.split("@") as [user: string, domain: string];
      console.log(`Deleting email account: ${user}@${domain}`);

      const formData = new URLSearchParams();
      formData.append("action", "delete");
      formData.append("domain", domain);
      formData.append("user", user);

      const response = await this.executeCommand("EMAIL_POP", formData, "POST");

      // Improved response handling
      if (!response) {
        console.log("No response received from DirectAdmin API");
        return false;
      }

      console.log("Delete email response:", response);

      if (
        response.error === "0" ||
        response.success ||
        response.result === "success"
      ) {
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Failed to delete email account ${email}:`, error);
      throw error;
    }
  }
}
// export class DirectAdminError extends Error {
//   constructor(message: string, public readonly statusCode?: number) {
//     super(message);
//     this.name = "DirectAdminError";
//   }

// In directadmin.api.ts
export class DirectAdminError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = "DirectAdminError";

    // Email-specific error messages
    if (message.includes("already exists")) {
      this.message = "Email account already exists";
    } else if (message.includes("Invalid password")) {
      this.message = "Password does not meet requirements";
    } else if (message.includes("No such user")) {
      this.message = "Email account not found";
    }
  }
}