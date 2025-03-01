// src/services/domain-registrar.service.ts
import { NamecheapAPI } from "../integrations/namecheap/api";
import { prisma } from "../config/database";

export class DomainRegistrarService {
  private namecheapApi: NamecheapAPI;

  constructor() {
    this.namecheapApi = new NamecheapAPI();
  }

  async checkDomainAvailability(domainName: string) {
    try {
      const result = await this.namecheapApi.checkDomainAvailability(
        domainName
      );
      return {
        ...result,
        domain: result.domain || domainName, // Avoid duplication error
      };
    } catch (error) {
      console.error("Domain availability check failed:", error);
      throw new Error("Failed to check domain availability");
    }
  }

  async registerDomain(
    userId: string,
    domainName: string,
    options: {
      years?: number;
      nameservers?: string[];
      privacyProtection?: boolean;
      autoRenew?: boolean;
    }
  ) {
    try {
      // Register domain with registrar
      const registrationResult = await this.namecheapApi.registerDomain(
        domainName,
        options.years || 1,
        {
          nameservers: options.nameservers,
          whoisGuard: options.privacyProtection,
        }
      );

      if (!registrationResult.success) {
        throw new Error("Domain registration failed");
      }

      // Create domain record in database
      const domain = await prisma.domain.create({
        data: {
          name: domainName,
          userId,
          registrar: "namecheap",
          registrationDate: new Date(),
          expiryDate: new Date(
            Date.now() + (options.years || 1) * 365 * 24 * 60 * 60 * 1000
          ),
          autoRenew: options.autoRenew ?? true,
          privacyProtection: options.privacyProtection ?? true,
          nameservers: {
            create:
              options.nameservers?.map((hostname, index) => ({
                hostname,
                order: index + 1,
              })) || [],
          },
        },
        include: {
          nameservers: true,
        },
      });

      return {
        domain,
        registrationDetails: registrationResult,
      };
    } catch (error) {
      console.error("Domain registration failed:", error);
      throw new Error("Failed to register domain");
    }
  }

  async transferDomain(
    userId: string,
    domainName: string,
    authCode: string,
    options: {
      nameservers?: string[];
      privacyProtection?: boolean;
      autoRenew?: boolean;
    }
  ) {
    // Implement domain transfer logic here
    throw new Error("Domain transfer not implemented yet");
  }

  async renewDomain(domainId: string, userId: string, years: number = 1) {
    // Implement domain renewal logic here
    throw new Error("Domain renewal not implemented yet");
  }

  async updateDomainNameservers(
    domainId: string,
    userId: string,
    nameservers: string[]
  ) {
    try {
      const domain = await prisma.domain.findFirst({
        where: {
          id: domainId,
          userId,
        },
      });

      if (!domain) {
        throw new Error("Domain not found");
      }

      // Update nameservers with registrar
      const updated = await this.namecheapApi.updateNameservers(
        domain.name,
        nameservers
      );

      if (!updated) {
        throw new Error("Failed to update nameservers with registrar");
      }

      // Update nameservers in database
      await prisma.$transaction([
        prisma.nameserver.deleteMany({
          where: { domainId },
        }),
        prisma.nameserver.createMany({
          data: nameservers.map((hostname, index) => ({
            domainId,
            hostname,
            order: index + 1,
          })),
        }),
      ]);

      return await prisma.domain.findUnique({
        where: { id: domainId },
        include: { nameservers: true },
      });
    } catch (error) {
      console.error("Failed to update nameservers:", error);
      throw error;
    }
  }

  async getDomainInfo(domainId: string, userId: string) {
    try {
      const domain = await prisma.domain.findFirst({
        where: {
          id: domainId,
          userId,
        },
        include: {
          nameservers: true,
          dnsRecords: true,
        },
      });

      if (!domain) {
        throw new Error("Domain not found");
      }

      // Get fresh information from registrar
      const registrarInfo = await this.namecheapApi.getDomainInfo(domain.name);

      return {
        ...domain,
        registrarStatus: registrarInfo.status,
        registrarNameservers: registrarInfo.nameservers,
        whoisGuard: registrarInfo.whoisGuard,
      };
    } catch (error) {
      console.error("Failed to get domain info:", error);
      throw error;
    }
  }
}
