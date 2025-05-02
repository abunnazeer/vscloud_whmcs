// src/services/invoice-template.service.ts
import { prisma } from "../config/database";
import { InvoiceService } from "./invoice.service";
import { Prisma } from "@prisma/client";

export class InvoiceTemplateService {
  private invoiceService: InvoiceService;

  constructor() {
    this.invoiceService = new InvoiceService();
  }

  async createTemplate(
    userId: string,
    data: {
      name: string;
      description?: string;
      items: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        type: string;
      }>;
      notes?: string;
      isActive?: boolean;
      paymentTerms?: number;
    }
  ) {
    return await prisma.invoiceTemplate.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        items: {
          create: data.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            type: item.type,
          })),
        },
        notes: data.notes,
        isActive: data.isActive !== undefined ? data.isActive : true,
        paymentTerms: data.paymentTerms || 30,
      },
      include: {
        items: true,
      },
    });
  }

  async getTemplate(id: string, userId: string) {
    const template = await prisma.invoiceTemplate.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        items: true,
      },
    });

    if (!template) {
      throw new Error("Template not found");
    }

    return template;
  }

  async listTemplates(
    userId: string,
    params: {
      isActive?: boolean;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const { isActive, search, page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    // Construct where clause based on parameters
    const whereCondition: Prisma.InvoiceTemplateWhereInput = {
      userId,
      ...(isActive !== undefined && { isActive }),
    };

    // Add search conditions if provided
    if (search) {
      whereCondition.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive" as Prisma.QueryMode,
          },
        },
        {
          description: {
            contains: search,
            mode: "insensitive" as Prisma.QueryMode,
          },
        },
      ];
    }

    const [templates, total] = await Promise.all([
      prisma.invoiceTemplate.findMany({
        where: whereCondition,
        include: {
          items: true,
          _count: {
            select: {
              invoices: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.invoiceTemplate.count({ where: whereCondition }),
    ]);

    return {
      templates,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateTemplate(
    id: string,
    userId: string,
    data: {
      name?: string;
      description?: string;
      items?: Array<{
        id?: string;
        description: string;
        quantity: number;
        unitPrice: number;
        type: string;
      }>;
      notes?: string;
      isActive?: boolean;
      paymentTerms?: number;
    }
  ) {
    const template = await this.getTemplate(id, userId);

    // Handle items update
    if (data.items) {
      // Delete existing items
      await prisma.invoiceTemplateItem.deleteMany({
        where: { templateId: id },
      });

      // Create new items
      await Promise.all(
        data.items.map(item =>
          prisma.invoiceTemplateItem.create({
            data: {
              templateId: id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              type: item.type,
            },
          })
        )
      );
    }

    // Update template
    return await prisma.invoiceTemplate.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.paymentTerms && { paymentTerms: data.paymentTerms }),
      },
      include: {
        items: true,
      },
    });
  }

  async deleteTemplate(id: string, userId: string) {
    const template = await this.getTemplate(id, userId);

    // Delete template items first
    await prisma.invoiceTemplateItem.deleteMany({
      where: { templateId: id },
    });

    // Delete the template
    return await prisma.invoiceTemplate.delete({
      where: { id },
    });
  }

  async duplicateTemplate(id: string, userId: string, newName: string) {
    const template = await this.getTemplate(id, userId);

    // Create a new template with the same data
    return await this.createTemplate(userId, {
      name: newName || `${template.name} (Copy)`,
      description: template.description || undefined,
      items: template.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        type: item.type,
      })),
      notes: template.notes || undefined,
      isActive: template.isActive,
      paymentTerms: template.paymentTerms,
    });
  }

  async generateInvoiceFromTemplate(
    templateId: string,
    userId: string,
    data: {
      recipientId: string;
      dueDate: Date;
      adjustments?: Array<{
        itemId: string;
        quantity?: number;
        unitPrice?: number;
        description?: string;
      }>;
      additionalItems?: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        type: string;
      }>;
      notes?: string;
    }
  ) {
    const template = await this.getTemplate(templateId, userId);

    // Prepare items with adjustments
    let processedItems = [...template.items];

    // Apply adjustments if provided
    if (data.adjustments) {
      data.adjustments.forEach(adjustment => {
        const itemIndex = processedItems.findIndex(
          item => item.id === adjustment.itemId
        );
        if (itemIndex !== -1) {
          processedItems[itemIndex] = {
            ...processedItems[itemIndex],
            ...(adjustment.quantity !== undefined && {
              quantity: adjustment.quantity,
            }),
            ...(adjustment.unitPrice !== undefined && {
              unitPrice: adjustment.unitPrice,
            }),
            ...(adjustment.description && {
              description: adjustment.description,
            }),
          };
        }
      });
    }

    // Convert all template items to the format needed for invoice creation
    const invoiceItems = processedItems.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      type: item.type,
    }));

    // Add additional items if provided
    const additionalInvoiceItems = data.additionalItems
      ? data.additionalItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          type: item.type,
        }))
      : [];

    // Combine all items
    const allInvoiceItems = [...invoiceItems, ...additionalInvoiceItems];

    // Create invoice using the prepared items
    return await this.invoiceService.createInvoice({
      userId,
      items: allInvoiceItems,
      dueDate: new Date(data.dueDate),
      notes: data.notes || template.notes || undefined,
      templateId,
      recipientId: data.recipientId,
    });
  }
}
