// src/services/analytics-cron.service.ts
import { prisma } from "../config/database";
import { AnalyticsVisualizationService } from "./analytics-visualization.service";
import { EmailService } from "./email.service";
import { logger } from "../utils/logger";

export class AnalyticsCronService {
  private analyticsService: AnalyticsVisualizationService;
  private emailService: EmailService;

  constructor() {
    this.analyticsService = new AnalyticsVisualizationService();
    this.emailService = new EmailService();
  }

  async generateDailyAnalytics() {
    try {
      const users = await prisma.user.findMany({
        where: {
          settings: {
            dailyAnalyticsEnabled: true,
          },
        },
      });

      for (const user of users) {
        try {
          // Generate daily analytics
          const analytics = await this.generateUserDailyAnalytics(user.id);

          // Store analytics
          await prisma.analyticsReport.create({
            data: {
              userId: user.id,
              type: "DAILY",
              data: analytics,
              generatedAt: new Date(),
            },
          });

          // Send email if enabled
          if (user.settings?.emailReportsEnabled) {
            await this.emailService.sendAnalyticsReport(
              user.email,
              "daily",
              analytics
            );
          }
        } catch (error) {
          logger.error(
            `Failed to generate daily analytics for user ${user.id}:`,
            error
          );
        }
      }
    } catch (error) {
      logger.error("Failed to generate daily analytics:", error);
      throw error;
    }
  }

  async generateMonthlyAnalytics() {
    const users = await prisma.user.findMany({
      where: {
        settings: {
          monthlyAnalyticsEnabled: true,
        },
      },
    });

    for (const user of users) {
      try {
        // Generate monthly analytics
        const analytics = await this.generateUserMonthlyAnalytics(user.id);

        // Store analytics
        await prisma.analyticsReport.create({
          data: {
            userId: user.id,
            type: "MONTHLY",
            data: analytics,
            generatedAt: new Date(),
          },
        });

        // Send email if enabled
        if (user.settings?.emailReportsEnabled) {
          await this.emailService.sendAnalyticsReport(
            user.email,
            "monthly",
            analytics
          );
        }
      } catch (error) {
        logger.error(
          `Failed to generate monthly analytics for user ${user.id}:`,
          error
        );
      }
    }
  }

  private async generateUserDailyAnalytics(userId: string) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [invoices, payments, newClients] = await Promise.all([
      // Get daily invoice data
      prisma.invoice.findMany({
        where: {
          userId,
          createdAt: {
            gte: yesterday,
            lt: today,
          },
        },
      }),

      // Get daily payment data
      prisma.payment.findMany({
        where: {
          userId,
          createdAt: {
            gte: yesterday,
            lt: today,
          },
        },
      }),

      // Get new clients
      prisma.invoiceRecipient.findMany({
        where: {
          userId,
          createdAt: {
            gte: yesterday,
            lt: today,
          },
        },
      }),
    ]);

    return {
      date: yesterday.toISOString().split("T")[0],
      invoices: {
        total: invoices.length,
        amount: invoices.reduce((sum, inv) => sum + Number(inv.total), 0),
        paid: invoices.filter(inv => inv.status === "PAID").length,
      },
      payments: {
        total: payments.length,
        amount: payments.reduce((sum, pay) => sum + Number(pay.amount), 0),
      },
      newClients: newClients.length,
      charts: {
        revenue: await this.analyticsService.generateRevenueChart(userId, {
          startDate: yesterday,
          endDate: today,
          groupBy: "day",
        }),
      },
    };
  }

  private async generateUserMonthlyAnalytics(userId: string) {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    );

    const [
      monthlyInvoices,
      monthlyPayments,
      clientAnalytics,
      agingReport,
      paymentTrend,
    ] = await Promise.all([
      // Monthly invoices
      prisma.invoice.findMany({
        where: {
          userId,
          createdAt: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth,
          },
        },
      }),

      // Monthly payments
      prisma.payment.findMany({
        where: {
          userId,
          createdAt: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth,
          },
        },
      }),

      // Client analytics
      this.analyticsService.generateClientAnalytics(userId),

      // Aging report
      this.analyticsService.generateAgingReport(userId),

      // Payment trend
      this.analyticsService.generatePaymentTrendChart(userId),
    ]);

    return {
      period: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
        2,
        "0"
      )}`,
      summary: {
        invoices: {
          total: monthlyInvoices.length,
          amount: monthlyInvoices.reduce(
            (sum, inv) => sum + Number(inv.total),
            0
          ),
          paid: monthlyInvoices.filter(inv => inv.status === "PAID").length,
        },
        payments: {
          total: monthlyPayments.length,
          amount: monthlyPayments.reduce(
            (sum, pay) => sum + Number(pay.amount),
            0
          ),
        },
      },
      charts: {
        clientAnalytics,
        agingReport,
        paymentTrend,
      },
    };
  }
}
