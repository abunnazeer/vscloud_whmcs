// // src/services/domain-registrar.service.ts
// import { NamecheapAPI } from "../integrations/namecheap/api";
// import { prisma } from "../config/database";

// export class DomainRegistrarService {
//   private namecheapApi: NamecheapAPI;

//   constructor() {
//     this.namecheapApi = new NamecheapAPI();
//   }

//   async checkDomainAvailability(domainName: string) {
//     try {
//       const result = await this.namecheapApi.checkDomainAvailability(
//         domainName
//       );
//       return {
//         ...result,
//         domain: result.domain || domainName,
//       };
//     } catch (error) {
//       console.error("Domain availability check failed:", error);
//       throw new Error("Failed to check domain availability");
//     }
//   }

//   async getAllDomains(page: number = 1, pageSize: number = 100) {
//     try {
//       // First check if API credentials are configured
//       if (!process.env.NAMECHEAP_API_KEY || !process.env.NAMECHEAP_API_USER) {
//         throw new Error(
//           "Namecheap API credentials are not properly configured"
//         );
//       }

//       console.log(
//         "Making request to Namecheap API with the following credentials:"
//       );
//       console.log(`- API User: ${process.env.NAMECHEAP_API_USER}`);
//       console.log(`- Username: ${process.env.NAMECHEAP_USERNAME}`);
//       console.log(`- Using sandbox: ${process.env.NODE_ENV !== "production"}`);

//       const result = await this.namecheapApi.getAllDomains(pageSize, page);
//       return result;
//     } catch (error) {
//       console.error("Failed to get all domains:", error);

//       if (error instanceof Error) {
//         if (error.message.includes("API Key is invalid")) {
//           throw new Error(
//             "Namecheap API authentication failed: Please check your API credentials and ensure API access is enabled"
//           );
//         }
//       }

//       throw new Error("Failed to fetch all domains from registrar");
//     }
//   }

//   async registerDomain(
//     userId: string,
//     domainName: string,
//     options: {
//       years?: number;
//       nameservers?: string[];
//       privacyProtection?: boolean;
//       autoRenew?: boolean;
//     }
//   ) {
//     try {
//       // Register domain with registrar
//       const registrationResult = await this.namecheapApi.registerDomain(
//         domainName,
//         options.years || 1,
//         {
//           nameservers: options.nameservers,
//           whoisGuard: options.privacyProtection,
//         }
//       );

//       if (!registrationResult.success) {
//         throw new Error("Domain registration failed");
//       }

//       // Create domain record in database
//       const domain = await prisma.domain.create({
//         data: {
//           name: domainName,
//           userId,
//           registrar: "namecheap",
//           registrationDate: new Date(),
//           expiryDate: new Date(
//             Date.now() + (options.years || 1) * 365 * 24 * 60 * 60 * 1000
//           ),
//           autoRenew: options.autoRenew ?? true,
//           privacyProtection: options.privacyProtection ?? true,
//           nameservers: {
//             create:
//               options.nameservers?.map((hostname, index) => ({
//                 hostname,
//                 order: index + 1,
//               })) || [],
//           },
//         },
//         include: {
//           nameservers: true,
//         },
//       });

//       return {
//         domain,
//         registrationDetails: registrationResult,
//       };
//     } catch (error) {
//       console.error("Domain registration failed:", error);
//       throw new Error("Failed to register domain");
//     }
//   }

//   async getDomainInfo(domainId: string, userId: string) {
//     try {
//       const domain = await prisma.domain.findFirst({
//         where: {
//           id: domainId,
//           userId,
//         },
//         include: {
//           nameservers: true,
//           dnsRecords: true,
//         },
//       });

//       if (!domain) {
//         throw new Error("Domain not found");
//       }

//       // Get fresh information from registrar
//       const registrarInfo = await this.namecheapApi.getDomainInfo(domain.name);

//       return {
//         ...domain,
//         registrarStatus: registrarInfo.status,
//         registrarNameservers: registrarInfo.nameservers,
//         whoisGuard: registrarInfo.whoisGuard,
//       };
//     } catch (error) {
//       console.error("Failed to get domain info:", error);
//       throw error;
//     }
//   }

//   async updateDomainNameservers(
//     domainId: string,
//     userId: string,
//     nameservers: string[]
//   ) {
//     try {
//       const domain = await prisma.domain.findFirst({
//         where: {
//           id: domainId,
//           userId,
//         },
//       });

//       if (!domain) {
//         throw new Error("Domain not found");
//       }

//       // Update nameservers with registrar
//       const updateResult = await this.namecheapApi.updateNameservers(
//         domain.name,
//         nameservers
//       );

//       if (!updateResult.success) {
//         throw new Error(
//           updateResult.message || "Failed to update nameservers with registrar"
//         );
//       }

//       // Update nameservers in database
//       await prisma.$transaction([
//         prisma.nameserver.deleteMany({
//           where: { domainId },
//         }),
//         prisma.nameserver.createMany({
//           data: nameservers.map((hostname, index) => ({
//             domainId,
//             hostname,
//             order: index + 1,
//           })),
//         }),
//       ]);

//       return await prisma.domain.findUnique({
//         where: { id: domainId },
//         include: { nameservers: true },
//       });
//     } catch (error) {
//       console.error("Failed to update nameservers:", error);
//       throw error;
//     }
//   }

//   // Update the transferDomain method
//   async transferDomain(
//     userId: string,
//     domainName: string,
//     authCode: string,
//     options: {
//       nameservers?: string[];
//       privacyProtection?: boolean;
//       autoRenew?: boolean;
//       years?: number;
//     }
//   ) {
//     try {
//       // Initiate transfer with registrar
//       const transferResult = await this.namecheapApi.transferDomain(
//         domainName,
//         authCode,
//         options.years || 1,
//         {
//           nameservers: options.nameservers,
//           whoisGuard: options.privacyProtection,
//         }
//       );

//       if (!transferResult.success) {
//         throw new Error(transferResult.message || "Domain transfer failed");
//       }

//       // Create domain record in database
//       const domain = await prisma.domain.create({
//         data: {
//           name: domainName,
//           userId,
//           registrar: "namecheap",
//           registrationDate: new Date(),
//           expiryDate: new Date(
//             Date.now() + (options.years || 1) * 365 * 24 * 60 * 60 * 1000
//           ),
//           autoRenew: options.autoRenew ?? true,
//           privacyProtection: options.privacyProtection ?? true,
//           transferStatus: "pending",
//           nameservers: {
//             create:
//               options.nameservers?.map((hostname, index) => ({
//                 hostname,
//                 order: index + 1,
//               })) || [],
//           },
//           // Store transfer details for status tracking
//           transferDetails: JSON.stringify({
//             orderId: transferResult.orderId,
//             transactionId: transferResult.transactionId,
//             initiatedAt: new Date(),
//           }),
//         },
//         include: {
//           nameservers: true,
//         },
//       });

//       return {
//         domain,
//         transferDetails: transferResult,
//       };
//     } catch (error) {
//       console.error("Domain transfer failed:", error);
//       if (error instanceof Error) {
//         throw error;
//       }
//       throw new Error("Failed to initiate domain transfer");
//     }
//   }

//   // Update the getTransferStatus method
//   async getTransferStatus(transferId: string) {
//     try {
//       // Find domain with this transfer ID
//       const domain = await prisma.domain.findFirst({
//         where: {
//           transferDetails: {
//             contains: transferId,
//           },
//         },
//       });

//       if (!domain) {
//         throw new Error("Domain transfer not found");
//       }

//       // Get transfer details from JSON
//       const transferDetails = JSON.parse(domain.transferDetails || "{}");

//       // Check status with registrar
//       const statusResult = await this.namecheapApi.getTransferStatus(
//         transferId
//       );

//       // Update domain status if needed
//       if (statusResult.status !== domain.transferStatus) {
//         await prisma.domain.update({
//           where: { id: domain.id },
//           data: { transferStatus: statusResult.status },
//         });
//       }

//       return {
//         domain: domain.name,
//         status: statusResult.status,
//         statusDescription: statusResult.statusDescription,
//         transferDetails: {
//           ...transferDetails,
//           currentStatus: statusResult.status,
//         },
//       };
//     } catch (error) {
//       console.error("Failed to get transfer status:", error);
//       throw new Error("Failed to check domain transfer status");
//     }
//   }

//   // Update the renewDomain method
//   async renewDomain(domainId: string, userId: string, years: number = 1) {
//     try {
//       const domain = await prisma.domain.findFirst({
//         where: {
//           id: domainId,
//           userId,
//         },
//       });

//       if (!domain) {
//         throw new Error("Domain not found");
//       }

//       // Renew domain with registrar
//       const renewalResult = await this.namecheapApi.renewDomain(
//         domain.name,
//         years
//       );

//       if (!renewalResult.success) {
//         throw new Error(
//           renewalResult.message || "Failed to renew domain with registrar"
//         );
//       }

//       // Update expiry date in database
//       const currentExpiryDate = new Date(domain.expiryDate);
//       const newExpiryDate = new Date(currentExpiryDate);
//       newExpiryDate.setFullYear(currentExpiryDate.getFullYear() + years);

//       const updatedDomain = await prisma.domain.update({
//         where: { id: domainId },
//         data: {
//           expiryDate: renewalResult.expiryDate
//             ? new Date(renewalResult.expiryDate)
//             : newExpiryDate,
//           renewalDetails: JSON.stringify({
//             orderId: renewalResult.orderId,
//             transactionId: renewalResult.transactionId,
//             renewedAt: new Date(),
//             renewedForYears: years,
//           }),
//         },
//       });

//       return {
//         domain: updatedDomain,
//         renewalDetails: renewalResult,
//       };
//     } catch (error) {
//       console.error("Domain renewal failed:", error);
//       if (error instanceof Error) {
//         throw error;
//       }
//       throw new Error("Failed to renew domain");
//     }
//   }

//   // Update the setDnsRecords method similarly
//   async setDnsRecords(
//     domainId: string,
//     userId: string,
//     records: Array<{
//       type: string;
//       hostname: string;
//       address: string;
//       ttl?: number;
//       mxPref?: number;
//     }>
//   ) {
//     try {
//       const domain = await prisma.domain.findFirst({
//         where: {
//           id: domainId,
//           userId,
//         },
//       });

//       if (!domain) {
//         throw new Error("Domain not found");
//       }

//       // Update DNS records with registrar
//       const success = await this.namecheapApi.setDnsRecords(
//         domain.name,
//         records
//       );

//       if (!success) {
//         throw new Error("Failed to update DNS records with registrar");
//       }

//       // Update records in database
//       await prisma.$transaction([
//         prisma.dnsRecord.deleteMany({
//           where: { domainId },
//         }),
//         prisma.dnsRecord.createMany({
//           data: records.map(record => ({
//             domainId,
//             name: record.hostname, // Map hostname to name
//             type: record.type,
//             content: record.address, // Map address to content
//             ttl: record.ttl || 1800,
//             priority: record.type === "MX" ? record.mxPref : null,
//           })),
//         }),
//       ]);

//       return await prisma.domain.findUnique({
//         where: { id: domainId },
//         include: { dnsRecords: true },
//       });
//     } catch (error) {
//       console.error("Failed to set DNS records:", error);
//       throw new Error("Failed to update DNS records");
//     }
//   }
//   // Update other methods similarly to use the correct field names
//   async getDnsRecords(domainId: string, userId: string) {
//     try {
//       const domain = await prisma.domain.findFirst({
//         where: {
//           id: domainId,
//           userId,
//         },
//         include: {
//           dnsRecords: true,
//         },
//       });

//       if (!domain) {
//         throw new Error("Domain not found");
//       }

//       return {
//         domain: domain.name,
//         records: domain.dnsRecords,
//       };
//     } catch (error) {
//       console.error("Failed to fetch DNS records:", error);
//       throw new Error("Failed to retrieve DNS records");
//     }
//   }

//   async updateDnsRecord(
//     domainId: string,
//     recordId: string,
//     userId: string,
//     recordData: {
//       type?: string;
//       name?: string; // Changed from hostname to name
//       content?: string; // Changed from address to content
//       ttl?: number;
//       mxPref?: number;
//     }
//   ) {
//     try {
//       // Check domain ownership
//       const domain = await prisma.domain.findFirst({
//         where: {
//           id: domainId,
//           userId,
//         },
//         include: {
//           dnsRecords: true,
//         },
//       });

//       if (!domain) {
//         throw new Error("Domain not found");
//       }

//       // Find the record to update
//       const recordToUpdate = domain.dnsRecords.find(r => r.id === recordId);
//       if (!recordToUpdate) {
//         throw new Error("DNS record not found");
//       }

//       // Update the record
//       const updatedRecord = await prisma.dnsRecord.update({
//         where: { id: recordId },
//         data: {
//           type: recordData.type || recordToUpdate.type,
//           name: recordData.name || recordToUpdate.name, // Changed from hostname to name
//           content: recordData.content || recordToUpdate.content, // Changed from address to content
//           ttl: recordData.ttl || recordToUpdate.ttl,
//           priority: recordData.type === "MX" ? recordData.mxPref : null,
//         },
//       });

//       // Get all records for this domain
//       const allRecords = await prisma.dnsRecord.findMany({
//         where: { domainId },
//       });

//       // Format records for Namecheap API
//       const formattedRecords = allRecords.map(record => ({
//         type: record.type,
//         hostname: record.name, // Map name to hostname for API
//         address: record.content, // Map content to address for API
//         ttl: record.ttl,
//         mxPref: record.priority,
//       }));

//       // Update all records with registrar (Namecheap requires setting all records at once)
//       const success = await this.namecheapApi.setDnsRecords(
//         domain.name,
//         formattedRecords
//       );

//       if (!success) {
//         // Revert the database change if API call fails
//         await prisma.dnsRecord.update({
//           where: { id: recordId },
//           data: recordToUpdate,
//         });
//         throw new Error("Failed to update DNS record with registrar");
//       }

//       return updatedRecord;
//     } catch (error) {
//       console.error("Failed to update DNS record:", error);
//       if (error instanceof Error) {
//         throw error;
//       }
//       throw new Error("Failed to update DNS record");
//     }
//   }

//   // Update the deleteDnsRecord method
//   async deleteDnsRecord(domainId: string, recordId: string, userId: string) {
//     try {
//       // Check domain ownership
//       const domain = await prisma.domain.findFirst({
//         where: {
//           id: domainId,
//           userId,
//         },
//         include: {
//           dnsRecords: true,
//         },
//       });

//       if (!domain) {
//         throw new Error("Domain not found");
//       }

//       // Find the record to delete
//       const recordToDelete = domain.dnsRecords.find(r => r.id === recordId);
//       if (!recordToDelete) {
//         throw new Error("DNS record not found");
//       }

//       // Delete the record
//       await prisma.dnsRecord.delete({
//         where: { id: recordId },
//       });

//       // Get remaining records for this domain
//       const remainingRecords = await prisma.dnsRecord.findMany({
//         where: { domainId },
//       });

//       // Format records for Namecheap API
//       const formattedRecords = remainingRecords.map(record => ({
//         type: record.type,
//         hostname: record.name,
//         address: record.content,
//         ttl: record.ttl,
//         mxPref: record.priority !== null ? record.priority : undefined,
//       }));

//       // Update all records with registrar
//       const success = await this.namecheapApi.setDnsRecords(
//         domain.name,
//         formattedRecords
//       );

//       if (!success) {
//         // Restore the deleted record if API call fails
//         await prisma.dnsRecord.create({
//           data: {
//             domainId,
//             name: recordToDelete.name,
//             type: recordToDelete.type,
//             content: recordToDelete.content,
//             ttl: recordToDelete.ttl,
//             priority: recordToDelete.priority,
//           },
//         });
//         throw new Error("Failed to delete DNS record with registrar");
//       }

//       return { success: true, message: "DNS record deleted successfully" };
//     } catch (error) {
//       console.error("Failed to delete DNS record:", error);
//       if (error instanceof Error) {
//         throw error;
//       }
//       throw new Error("Failed to delete DNS record");
//     }
//   }

//   async updatePrivacyProtection(
//     domainId: string,
//     userId: string,
//     enabled: boolean
//   ) {
//     try {
//       // Check domain ownership
//       const domain = await prisma.domain.findFirst({
//         where: {
//           id: domainId,
//           userId,
//         },
//       });

//       if (!domain) {
//         throw new Error("Domain not found");
//       }

//       // Implement API call to update privacy protection with registrar
//       // Note: This is a placeholder as Namecheap API implementation for this isn't provided
//       // You would need to extend the NamecheapAPI class with this functionality
//       // const updateResult = await this.namecheapApi.updatePrivacyProtection(domain.name, enabled);

//       // For now, we'll assume it's successful
//       const updateResult = { success: true };

//       if (!updateResult.success) {
//         throw new Error("Failed to update privacy protection with registrar");
//       }

//       // Update in database
//       const updatedDomain = await prisma.domain.update({
//         where: { id: domainId },
//         data: {
//           privacyProtection: enabled,
//           lastUpdated: new Date(),
//         },
//       });

//       return {
//         domain: updatedDomain,
//         privacyProtection: enabled,
//       };
//     } catch (error) {
//       console.error("Failed to update privacy protection:", error);
//       if (error instanceof Error) {
//         throw error;
//       }
//       throw new Error("Failed to update privacy protection");
//     }
//   }

//   async updateAutoRenew(domainId: string, userId: string, enabled: boolean) {
//     try {
//       // Check domain ownership
//       const domain = await prisma.domain.findFirst({
//         where: {
//           id: domainId,
//           userId,
//         },
//       });

//       if (!domain) {
//         throw new Error("Domain not found");
//       }

//       // Implement API call to update auto-renew with registrar
//       // Note: This is a placeholder as Namecheap API implementation for this isn't provided
//       // You would need to extend the NamecheapAPI class with this functionality
//       // const updateResult = await this.namecheapApi.updateAutoRenew(domain.name, enabled);

//       // For now, we'll assume it's successful
//       const updateResult = { success: true };

//       if (!updateResult.success) {
//         throw new Error("Failed to update auto-renew setting with registrar");
//       }

//       // Update in database
//       const updatedDomain = await prisma.domain.update({
//         where: { id: domainId },
//         data: {
//           autoRenew: enabled,
//           lastUpdated: new Date(),
//         },
//       });

//       return {
//         domain: updatedDomain,
//         autoRenew: enabled,
//       };
//     } catch (error) {
//       console.error("Failed to update auto-renew setting:", error);
//       if (error instanceof Error) {
//         throw error;
//       }
//       throw new Error("Failed to update auto-renew setting");
//     }
//   }

//   async setDomainLock(domainId: string, userId: string, locked: boolean) {
//     try {
//       // Check domain ownership
//       const domain = await prisma.domain.findFirst({
//         where: {
//           id: domainId,
//           userId,
//         },
//       });

//       if (!domain) {
//         throw new Error("Domain not found");
//       }

//       // Implement API call to update domain lock with registrar
//       // Note: This is a placeholder as Namecheap API implementation for this isn't provided
//       // You would need to extend the NamecheapAPI class with this functionality
//       // const updateResult = await this.namecheapApi.setDomainLock(domain.name, locked);

//       // For now, we'll assume it's successful
//       const updateResult = { success: true };

//       if (!updateResult.success) {
//         throw new Error("Failed to update domain lock status with registrar");
//       }

//       // Update in database
//       const updatedDomain = await prisma.domain.update({
//         where: { id: domainId },
//         data: {
//           isLocked: locked,
//           lastUpdated: new Date(),
//         },
//       });

//       return {
//         domain: updatedDomain,
//         isLocked: locked,
//       };
//     } catch (error) {
//       console.error("Failed to update domain lock status:", error);
//       if (error instanceof Error) {
//         throw error;
//       }
//       throw new Error("Failed to update domain lock status");
//     }
//   }
// }

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
        domain: result.domain || domainName,
      };
    } catch (error) {
      console.error("Domain availability check failed:", error);
      throw new Error("Failed to check domain availability");
    }
  }

  async getAllDomains(page: number = 1, pageSize: number = 100) {
    try {
      // First check if API credentials are configured
      if (!process.env.NAMECHEAP_API_KEY || !process.env.NAMECHEAP_API_USER) {
        throw new Error(
          "Namecheap API credentials are not properly configured"
        );
      }

      console.log(
        "Making request to Namecheap API with the following credentials:"
      );
      console.log(`- API User: ${process.env.NAMECHEAP_API_USER}`);
      console.log(`- Username: ${process.env.NAMECHEAP_USERNAME}`);
      console.log(`- Using sandbox: ${process.env.NODE_ENV !== "production"}`);

      const result = await this.namecheapApi.getAllDomains(pageSize, page);
      return result;
    } catch (error) {
      console.error("Failed to get all domains:", error);

      if (error instanceof Error) {
        if (error.message.includes("API Key is invalid")) {
          throw new Error(
            "Namecheap API authentication failed: Please check your API credentials and ensure API access is enabled"
          );
        }
      }

      throw new Error("Failed to fetch all domains from registrar");
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
      const updateResult = await this.namecheapApi.updateNameservers(
        domain.name,
        nameservers
      );

      if (!updateResult.success) {
        throw new Error(
          updateResult.message || "Failed to update nameservers with registrar"
        );
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

  // Update the transferDomain method
  async transferDomain(
    userId: string,
    domainName: string,
    authCode: string,
    options: {
      nameservers?: string[];
      privacyProtection?: boolean;
      autoRenew?: boolean;
      years?: number;
    }
  ) {
    try {
      // Initiate transfer with registrar
      const transferResult = await this.namecheapApi.transferDomain(
        domainName,
        authCode,
        options.years || 1,
        {
          nameservers: options.nameservers,
          whoisGuard: options.privacyProtection,
        }
      );

      if (!transferResult.success) {
        throw new Error(transferResult.message || "Domain transfer failed");
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
          transferStatus: "pending",
          nameservers: {
            create:
              options.nameservers?.map((hostname, index) => ({
                hostname,
                order: index + 1,
              })) || [],
          },
          // Store transfer details for status tracking
          transferDetails: JSON.stringify({
            orderId: transferResult.orderId,
            transactionId: transferResult.transactionId,
            initiatedAt: new Date(),
          }),
        },
        include: {
          nameservers: true,
        },
      });

      return {
        domain,
        transferDetails: transferResult,
      };
    } catch (error) {
      console.error("Domain transfer failed:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to initiate domain transfer");
    }
  }

  // Update the getTransferStatus method
  async getTransferStatus(transferId: string) {
    try {
      // Find domain with this transfer ID
      const domain = await prisma.domain.findFirst({
        where: {
          transferDetails: {
            contains: transferId,
          },
        },
      });

      if (!domain) {
        throw new Error("Domain transfer not found");
      }

      // Get transfer details from JSON
      const transferDetails = JSON.parse(domain.transferDetails || "{}");

      // Check status with registrar
      const statusResult = await this.namecheapApi.getTransferStatus(
        transferId
      );

      // Update domain status if needed
      if (statusResult.status !== domain.transferStatus) {
        await prisma.domain.update({
          where: { id: domain.id },
          data: { transferStatus: statusResult.status },
        });
      }

      return {
        domain: domain.name,
        status: statusResult.status,
        statusDescription: statusResult.statusDescription,
        transferDetails: {
          ...transferDetails,
          currentStatus: statusResult.status,
        },
      };
    } catch (error) {
      console.error("Failed to get transfer status:", error);
      throw new Error("Failed to check domain transfer status");
    }
  }

  // Update the renewDomain method
  async renewDomain(domainId: string, userId: string, years: number = 1) {
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

      // Renew domain with registrar
      const renewalResult = await this.namecheapApi.renewDomain(
        domain.name,
        years
      );

      if (!renewalResult.success) {
        throw new Error(
          renewalResult.message || "Failed to renew domain with registrar"
        );
      }

      // Update expiry date in database
      const currentExpiryDate = new Date(domain.expiryDate);
      const newExpiryDate = new Date(currentExpiryDate);
      newExpiryDate.setFullYear(currentExpiryDate.getFullYear() + years);

      const updatedDomain = await prisma.domain.update({
        where: { id: domainId },
        data: {
          expiryDate: renewalResult.expiryDate
            ? new Date(renewalResult.expiryDate)
            : newExpiryDate,
          renewalDetails: JSON.stringify({
            orderId: renewalResult.orderId,
            transactionId: renewalResult.transactionId,
            renewedAt: new Date(),
            renewedForYears: years,
          }),
        },
      });

      return {
        domain: updatedDomain,
        renewalDetails: renewalResult,
      };
    } catch (error) {
      console.error("Domain renewal failed:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to renew domain");
    }
  }

  // Update the setDnsRecords method similarly
  async setDnsRecords(
    domainId: string,
    userId: string,
    records: Array<{
      type: string;
      hostname: string;
      address: string;
      ttl?: number;
      mxPref?: number;
    }>
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

      // Update DNS records with registrar
      const success = await this.namecheapApi.setDnsRecords(
        domain.name,
        records
      );

      if (!success) {
        throw new Error("Failed to update DNS records with registrar");
      }

      // Update records in database
      await prisma.$transaction([
        prisma.dnsRecord.deleteMany({
          where: { domainId },
        }),
        prisma.dnsRecord.createMany({
          data: records.map(record => ({
            domainId,
            name: record.hostname, // Map hostname to name
            type: record.type,
            content: record.address, // Map address to content
            ttl: record.ttl || 1800,
            priority: record.type === "MX" ? record.mxPref : null,
          })),
        }),
      ]);

      return await prisma.domain.findUnique({
        where: { id: domainId },
        include: { dnsRecords: true },
      });
    } catch (error) {
      console.error("Failed to set DNS records:", error);
      throw new Error("Failed to update DNS records");
    }
  }
  // Update other methods similarly to use the correct field names
  async getDnsRecords(domainId: string, userId: string) {
    try {
      const domain = await prisma.domain.findFirst({
        where: {
          id: domainId,
          userId,
        },
        include: {
          dnsRecords: true,
        },
      });

      if (!domain) {
        throw new Error("Domain not found");
      }

      return {
        domain: domain.name,
        records: domain.dnsRecords,
      };
    } catch (error) {
      console.error("Failed to fetch DNS records:", error);
      throw new Error("Failed to retrieve DNS records");
    }
  }

  async updateDnsRecord(
    domainId: string,
    recordId: string,
    userId: string,
    recordData: {
      type?: string;
      name?: string; // Changed from hostname to name
      content?: string; // Changed from address to content
      ttl?: number;
      mxPref?: number;
    }
  ) {
    try {
      // Check domain ownership
      const domain = await prisma.domain.findFirst({
        where: {
          id: domainId,
          userId,
        },
        include: {
          dnsRecords: true,
        },
      });

      if (!domain) {
        throw new Error("Domain not found");
      }

      // Find the record to update
      const recordToUpdate = domain.dnsRecords.find(r => r.id === recordId);
      if (!recordToUpdate) {
        throw new Error("DNS record not found");
      }

      // Update the record
      const updatedRecord = await prisma.dnsRecord.update({
        where: { id: recordId },
        data: {
          type: recordData.type || recordToUpdate.type,
          name: recordData.name || recordToUpdate.name, // Changed from hostname to name
          content: recordData.content || recordToUpdate.content, // Changed from address to content
          ttl: recordData.ttl || recordToUpdate.ttl,
          priority: recordData.type === "MX" ? recordData.mxPref : null,
        },
      });

      // Get all records for this domain
      const allRecords = await prisma.dnsRecord.findMany({
        where: { domainId },
      });

      // Format records for Namecheap API
      const formattedRecords = allRecords.map(record => ({
        type: record.type,
        hostname: record.name, // Map name to hostname for API
        address: record.content, // Map content to address for API
        ttl: record.ttl,
        mxPref: record.priority !== null ? record.priority : undefined, // FIX: Convert null to undefined
      }));

      // Update all records with registrar (Namecheap requires setting all records at once)
      const success = await this.namecheapApi.setDnsRecords(
        domain.name,
        formattedRecords
      );

      if (!success) {
        // Revert the database change if API call fails
        await prisma.dnsRecord.update({
          where: { id: recordId },
          data: recordToUpdate,
        });
        throw new Error("Failed to update DNS record with registrar");
      }

      return updatedRecord;
    } catch (error) {
      console.error("Failed to update DNS record:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to update DNS record");
    }
  }

  // Update the deleteDnsRecord method
  async deleteDnsRecord(domainId: string, recordId: string, userId: string) {
    try {
      // Check domain ownership
      const domain = await prisma.domain.findFirst({
        where: {
          id: domainId,
          userId,
        },
        include: {
          dnsRecords: true,
        },
      });

      if (!domain) {
        throw new Error("Domain not found");
      }

      // Find the record to delete
      const recordToDelete = domain.dnsRecords.find(r => r.id === recordId);
      if (!recordToDelete) {
        throw new Error("DNS record not found");
      }

      // Delete the record
      await prisma.dnsRecord.delete({
        where: { id: recordId },
      });

      // Get remaining records for this domain
      const remainingRecords = await prisma.dnsRecord.findMany({
        where: { domainId },
      });

      // Format records for Namecheap API
      const formattedRecords = remainingRecords.map(record => ({
        type: record.type,
        hostname: record.name, // Map name to hostname for API
        address: record.content, // Map content to address for API
        ttl: record.ttl,
        mxPref: record.priority !== null ? record.priority : undefined, // FIX: Convert null to undefined
      }));

      // Update all records with registrar
      const success = await this.namecheapApi.setDnsRecords(
        domain.name,
        formattedRecords
      );

      if (!success) {
        // Restore the deleted record if API call fails
        await prisma.dnsRecord.create({
          data: {
            domainId,
            name: recordToDelete.name,
            type: recordToDelete.type,
            content: recordToDelete.content,
            ttl: recordToDelete.ttl,
            priority: recordToDelete.priority,
          },
        });
        throw new Error("Failed to delete DNS record with registrar");
      }

      return { success: true, message: "DNS record deleted successfully" };
    } catch (error) {
      console.error("Failed to delete DNS record:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to delete DNS record");
    }
  }

  async updatePrivacyProtection(
    domainId: string,
    userId: string,
    enabled: boolean
  ) {
    try {
      // Check domain ownership
      const domain = await prisma.domain.findFirst({
        where: {
          id: domainId,
          userId,
        },
      });

      if (!domain) {
        throw new Error("Domain not found");
      }

      // Implement API call to update privacy protection with registrar
      // Note: This is a placeholder as Namecheap API implementation for this isn't provided
      // You would need to extend the NamecheapAPI class with this functionality
      // const updateResult = await this.namecheapApi.updatePrivacyProtection(domain.name, enabled);

      // For now, we'll assume it's successful
      const updateResult = { success: true };

      if (!updateResult.success) {
        throw new Error("Failed to update privacy protection with registrar");
      }

      // Update in database
      const updatedDomain = await prisma.domain.update({
        where: { id: domainId },
        data: {
          privacyProtection: enabled,
          lastUpdated: new Date(),
        },
      });

      return {
        domain: updatedDomain,
        privacyProtection: enabled,
      };
    } catch (error) {
      console.error("Failed to update privacy protection:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to update privacy protection");
    }
  }

  async updateAutoRenew(domainId: string, userId: string, enabled: boolean) {
    try {
      // Check domain ownership
      const domain = await prisma.domain.findFirst({
        where: {
          id: domainId,
          userId,
        },
      });

      if (!domain) {
        throw new Error("Domain not found");
      }

      // Implement API call to update auto-renew with registrar
      // Note: This is a placeholder as Namecheap API implementation for this isn't provided
      // You would need to extend the NamecheapAPI class with this functionality
      // const updateResult = await this.namecheapApi.updateAutoRenew(domain.name, enabled);

      // For now, we'll assume it's successful
      const updateResult = { success: true };

      if (!updateResult.success) {
        throw new Error("Failed to update auto-renew setting with registrar");
      }

      // Update in database
      const updatedDomain = await prisma.domain.update({
        where: { id: domainId },
        data: {
          autoRenew: enabled,
          lastUpdated: new Date(),
        },
      });

      return {
        domain: updatedDomain,
        autoRenew: enabled,
      };
    } catch (error) {
      console.error("Failed to update auto-renew setting:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to update auto-renew setting");
    }
  }

  async setDomainLock(domainId: string, userId: string, locked: boolean) {
    try {
      // Check domain ownership
      const domain = await prisma.domain.findFirst({
        where: {
          id: domainId,
          userId,
        },
      });

      if (!domain) {
        throw new Error("Domain not found");
      }

      // Implement API call to update domain lock with registrar
      // Note: This is a placeholder as Namecheap API implementation for this isn't provided
      // You would need to extend the NamecheapAPI class with this functionality
      // const updateResult = await this.namecheapApi.setDomainLock(domain.name, locked);

      // For now, we'll assume it's successful
      const updateResult = { success: true };

      if (!updateResult.success) {
        throw new Error("Failed to update domain lock status with registrar");
      }

      // Update in database
      const updatedDomain = await prisma.domain.update({
        where: { id: domainId },
        data: {
          isLocked: locked,
          lastUpdated: new Date(),
        },
      });

      return {
        domain: updatedDomain,
        isLocked: locked,
      };
    } catch (error) {
      console.error("Failed to update domain lock status:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to update domain lock status");
    }
  }
}
