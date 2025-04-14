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

  async executeCommand(
    command: string,
    params: Record<string, any> = {},
    method: "GET" | "POST" = "POST"
  ): Promise<any> {
    try {
      const endpoint = `/CMD_API_${command.replace(/^CMD_API_/, "")}`;
      const url = `${this.protocol}://${this.host}:${this.port}${endpoint}`;

      console.log(`DirectAdmin API Request: ${method} ${url}`);
      console.log("Params:", params);

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

      console.log("DirectAdmin API Response Status:", response.status);
      console.log(
        "DirectAdmin API Response Data:",
        typeof response.data === "string"
          ? response.data.substring(0, 200)
          : response.data
      );

      return this.parseResponse(response.data);
    } catch (error) {
      console.error("DirectAdmin API Error:", error);

     
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const responseData = error.response?.data;

        console.error(`Status Code: ${statusCode}`);
        console.error(`Response Data:`, responseData);

        throw new DirectAdminError(
          `Request failed with status code ${statusCode}: ${
            responseData || error.message
          }`,
          statusCode
        );
      } else if (error instanceof Error) {
        throw new DirectAdminError(error.message);
      } else {
        throw new DirectAdminError(
          "Unknown error during DirectAdmin API request"
        );
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
    return this.executeCommand("PACKAGES_USER");
  }

  public async getPackageDetails(name: string): Promise<Record<string, any>> {
    return this.executeCommand("PACKAGES_USER_SHOW", { package: name });
  }

  public async createPackage(
    packageData: Record<string, any>
  ): Promise<boolean> {
    await this.executeCommand("PACKAGES_USER", {
      action: "create",
      ...packageData,
    });
    return true;
  }

  public async updatePackage(
    name: string,
    packageData: Record<string, any>
  ): Promise<boolean> {
    await this.executeCommand("PACKAGES_USER", {
      action: "modify",
      package: name,
      ...packageData,
    });
    return true;
  }

  public async deletePackage(name: string): Promise<boolean> {
    await this.executeCommand("PACKAGES_USER", {
      action: "delete",
      package: name,
    });
    return true;
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
      // Get all users
      const users = await this.getAllUsers();
      console.log(`Checking if user ${username} exists in:`, users);

      // Look for exact username match (case sensitive in DirectAdmin)
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

}
export class DirectAdminError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = "DirectAdminError";
  }
}