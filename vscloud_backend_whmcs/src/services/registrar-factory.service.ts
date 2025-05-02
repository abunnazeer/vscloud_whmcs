

// // src/services/registrar-factory.service.ts
// import { DomainRegistrarInterface } from "../interfaces/domain-registrar.interface";
// import { NamecheapRegistrarService } from "../integrations/namecheap/namecheap-registrar.service";
// import { UpperlinkRegistrarService } from "../integrations/upperlink/upperlink-registrar.service";

// export class RegistrarFactory {
//   // Map of TLDs to their supported registrars
//   private static readonly tldRegistrarMap: Record<string, string[]> = {
//     // Namecheap supports these TLDs
//     'com': ['namecheap', 'upperlink'],
//     'net': ['namecheap', 'upperlink'],
//     'org': ['namecheap', 'upperlink'],
//     'info': ['namecheap', 'upperlink'],
//     'biz': ['namecheap', 'upperlink'],
//     // Upperlink supports these additional TLDs (especially African TLDs)
//     'ng': ['upperlink'],
//     'com.ng': ['upperlink'],
//     'org.ng': ['upperlink'],
//     'edu.ng': ['upperlink'],
//     'gov.ng': ['upperlink'],
//     'co.za': ['upperlink'],
//     'org.za': ['upperlink'],
//     'co.ke': ['upperlink'],
//     'org.ke': ['upperlink'],
//   };

//   static createService(registrar: string): DomainRegistrarInterface {
//     const registrarName = registrar.toLowerCase();

//     switch (registrarName) {
//       case "namecheap":
//         return new NamecheapRegistrarService({
//           // apiKey: process.env.NAMECHEAP_API_KEY || "",
//           apiKey: process.env.NAMECHEAP_API_KEY ?? "",
//           apiUser: process.env.NAMECHEAP_API_USER || "",
//           username: process.env.NAMECHEAP_USERNAME || "",
//           isSandbox: process.env.NODE_ENV !== "production",
//         });
//       case "upperlink":
//         return new UpperlinkRegistrarService({
//           username: process.env.UPPERLINK_USERNAME || "",
//           apiKey: process.env.UPPERLINK_API_KEY || "",
//           apiKeyId: process.env.UPPERLINK_API_KEY_ID || "",
//           apiEndpoint: process.env.UPPERLINK_API_ENDPOINT || "",
//           allowedIps: process.env.UPPERLINK_IP_1 || "",
//         });
//       default:
//         throw new Error(`Unsupported registrar: ${registrar}`);
//     }
//   }

//   static getSupportedRegistrars(): string[] {
//     return ["namecheap", "upperlink"];
//   }

//   static getRegistrarsForTld(tld: string): string[] {
//     // Normalize the TLD (remove leading dot if present)
//     const normalizedTld = tld.startsWith('.') ? tld.substring(1) : tld;
//     return this.tldRegistrarMap[normalizedTld] || ['upperlink']; // Default to upperlink if TLD not in map
//   }

//   static extractTld(domainName: string): string {
//     const parts = domainName.split('.');
//     if (parts.length === 2) {
//       return parts[1]; // For domains like example.com
//     } else if (parts.length > 2) {
//       // For domains like example.co.uk or example.com.ng
//       return parts.slice(-2).join('.');
//     }
//     return ''; // Shouldn't happen for valid domains
//   }
// }



// src/services/registrar-factory.service.ts
import { DomainRegistrarInterface } from "../interfaces/domain-registrar.interface";
import { NamecheapRegistrarService } from "../integrations/namecheap/namecheap-registrar.service";
import { UpperlinkRegistrarService } from "../integrations/upperlink/upperlink-registrar.service";

export class RegistrarFactory {
  // Map of TLDs to their supported registrars
  private static readonly tldRegistrarMap: Record<string, string[]> = {
    // Namecheap supports these TLDs
    'com': ['namecheap', 'upperlink'],
    'net': ['namecheap', 'upperlink'],
    'org': ['namecheap', 'upperlink'],
    'info': ['namecheap', 'upperlink'],
    'biz': ['namecheap', 'upperlink'],
    // Upperlink supports these additional TLDs (especially African TLDs)
    'ng': ['upperlink'],
    'com.ng': ['upperlink'],
    'org.ng': ['upperlink'],
    'edu.ng': ['upperlink'],
    'gov.ng': ['upperlink'],
    'co.za': ['upperlink'],
    'org.za': ['upperlink'],
    'co.ke': ['upperlink'],
    'org.ke': ['upperlink'],
  };

  static createService(registrar: string): DomainRegistrarInterface {
    const registrarName = registrar.toLowerCase();

    switch (registrarName) {
      case "namecheap":
        return new NamecheapRegistrarService({
          apiKey: process.env.NAMECHEAP_API_KEY || "",
          apiUser: process.env.NAMECHEAP_API_USER || "",
          username: process.env.NAMECHEAP_USERNAME || "",
          isSandbox: process.env.NODE_ENV !== "production",
        });
      case "upperlink":
        return new UpperlinkRegistrarService({
          username: process.env.UPPERLINK_USERNAME || "",
          apiKey: process.env.UPPERLINK_API_KEY || "",
          apiKeyId: process.env.UPPERLINK_API_KEY_ID || "",
          apiEndpoint: process.env.UPPERLINK_API_ENDPOINT || "",
          allowedIps: process.env.UPPERLINK_IP_1 || "",
        });
      default:
        throw new Error(`Unsupported registrar: ${registrar}`);
    }
  }

  static getSupportedRegistrars(): string[] {
    return ["namecheap", "upperlink"];
  }

  static getRegistrarsForTld(tld: string): string[] {
    // Normalize the TLD (remove leading dot if present)
    const normalizedTld = tld.startsWith('.') ? tld.substring(1) : tld;
    return this.tldRegistrarMap[normalizedTld] || ['upperlink']; // Default to upperlink if TLD not in map
  }

  static extractTld(domainName: string): string {
    if (!domainName || typeof domainName !== 'string') {
      return ''; // Return empty string for invalid input
    }
    
    const parts = domainName.split('.');
    
    if (parts.length < 2) {
      return ''; // Not a valid domain name, return empty string
    } else if (parts.length === 2) {
      // Verify the second part exists
      const secondPart = parts[1];
      return secondPart ?? ''; // Using nullish coalescing to ensure string return
    } else {
      // Special cases for certain TLDs like co.uk, com.ng, etc.
      const lastTwoParts = parts.slice(-2).join('.');
      
      // Check if this is a known compound TLD
      if (this.tldRegistrarMap[lastTwoParts]) {
        return lastTwoParts;
      }
      
      // If not a known compound TLD, just return the last part
      const lastPart = parts[parts.length - 1];
      return lastPart ?? ''; // Using nullish coalescing to ensure string return
    }
  }
}