// src/services/email-templates.service.ts
import { prisma } from "../config/database";
import handlebars from "handlebars";
import path from "path";
import fs from "fs/promises";

export class EmailTemplatesService {
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor() {
    this.loadTemplates();
  }

  private async loadTemplates() {
    const templatesDir = path.join(__dirname, "../templates/email");
    const templateFiles = await fs.readdir(templatesDir);

    for (const file of templateFiles) {
      if (file.endsWith(".hbs")) {
        const templateName = path.basename(file, ".hbs");
        const templateContent = await fs.readFile(
          path.join(templatesDir, file),
          "utf-8"
        );
        this.templates.set(templateName, handlebars.compile(templateContent));
      }
    }
  }

  async getRenderedTemplate(
    templateName: string,
    data: any,
    customization?: {
      colors?: { primary?: string; secondary?: string };
      logo?: string;
      companyName?: string;
    }
  ): Promise<string> {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    // Merge default customization with provided ones
    const defaultCustomization = {
      colors: {
        primary: "#007bff",
        secondary: "#6c757d",
      },
      companyName: process.env.COMPANY_NAME || "Your Company",
    };

    const mergedData = {
      ...data,
      customization: {
        ...defaultCustomization,
        ...customization,
      },
    };

    return template(mergedData);
  }

  async createCustomTemplate(data: {
    userId: string;
    name: string;
    subject: string;
    content: string;
    type: "REMINDER" | "INVOICE" | "RECEIPT";
    isDefault?: boolean;
  }) {
    return await prisma.emailTemplate.create({
      data: {
        ...data,
        isActive: true,
      },
    });
  }

  async updateCustomTemplate(
    id: string,
    userId: string,
    data: Partial<{
      name: string;
      subject: string;
      content: string;
      isActive: boolean;
      isDefault: boolean;
    }>
  ) {
    const template = await prisma.emailTemplate.findFirst({
      where: { id, userId },
    });

    if (!template) {
      throw new Error("Template not found");
    }

    return await prisma.emailTemplate.update({
      where: { id },
      data,
    });
  }

  async getCustomTemplate(id: string, userId: string) {
    const template = await prisma.emailTemplate.findFirst({
      where: { id, userId },
    });

    if (!template) {
      throw new Error("Template not found");
    }

    return template;
  }

  async validateTemplate(content: string): Promise<boolean> {
    try {
      handlebars.compile(content);
      return true;
    } catch (error) {
      throw new Error("Invalid template syntax");
    }
  }

  async renderCustomTemplate(
    templateId: string,
    userId: string,
    data: any
  ): Promise<string> {
    const template = await this.getCustomTemplate(templateId, userId);
    const compiledTemplate = handlebars.compile(template.content);
    return compiledTemplate(data);
  }
}
