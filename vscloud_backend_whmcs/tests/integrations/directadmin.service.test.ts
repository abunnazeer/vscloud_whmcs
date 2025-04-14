// tests/integrations/directadmin.service.test.ts
import { describe, it } from "node:test";
import { DirectAdminApi } from "../../src/integrations/directadmin/directadmin.api";
import { DirectAdminService } from "../../src/services/directadmin.service";

// Mock configuration - use environment variables in real implementation
const TEST_CONFIG = {
  host: process.env.DIRECTADMIN_HOST || "localhost",
  port: parseInt(process.env.DIRECTADMIN_PORT || "2222"),
  username: process.env.DIRECTADMIN_USERNAME || "admin",
  password: process.env.DIRECTADMIN_PASSWORD || "admin_password",
  useSSL: process.env.DIRECTADMIN_USE_SSL !== "false",
};

describe("DirectAdminService", () => {
  let api: DirectAdminApi;
  let service: DirectAdminService;
  let testUser: string;

  beforeAll(() => {
    api = new DirectAdminApi(TEST_CONFIG);
    service = new DirectAdminService(api);
    testUser = `testuser_${Date.now()}`;
  });

  it("should create a new user", async () => {
    await service.createUser(
      testUser,
      `${testUser}@example.com`,
      "TestPassword123!",
      "default",
      "example.com"
    );

    const user = await service.getUserInfo(testUser);
    expect(user.username).toBe(testUser);
    expect(user.status).toBe("active");
  });

  it("should suspend and unsuspend user", async () => {
    await service.suspendUser(testUser, "Test suspension");
    let user = await service.getUserInfo(testUser);
    expect(user.status).toBe("suspended");

    await service.unsuspendUser(testUser);
    user = await service.getUserInfo(testUser);
    expect(user.status).toBe("active");
  });

  it("should list users", async () => {
    const users = await service.listUsers();
    expect(Array.isArray(users)).toBe(true);
    expect(users.some(u => u.username === testUser)).toBe(true);
  });

  afterAll(async () => {
    try {
      await api.executeCommand("DELETE_USER", {
        user: testUser,
        confirmed: "yes",
      });
    } catch (error) {
      console.error("Failed to clean up test user:", error);
    }
  });
});
