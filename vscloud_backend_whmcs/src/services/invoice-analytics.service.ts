// src/services/invoice-analytics.service.ts
import { prisma } from "../config/database";
import { Prisma } from "@prisma/client";

export class InvoiceAnalyticsService {
  getRevenueForecast(userId: any, arg1: { months: number }) {
    throw new Error("Method not implemented.");
  }
  async getInvoiceAnalytics(
    userId: string,
    params: {
      startDate?: Date | undefined;
      endDate?: Date | undefined;
      groupBy?: "day" | "week" | "month" | "year" | undefined;
      includeUnpaid?: boolean | undefined;
    }
  ) {
    const {
      startDate,
      endDate,
      groupBy = "month",
      includeUnpaid = true,
    } = params;

    const where: Prisma.InvoiceWhereInput = {
      userId,
      ...(startDate &&
        endDate && {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
      ...(!includeUnpaid && {
        status: "PAID",
      }),
    };

    // Get basic statistics
    const [totalInvoices, paidInvoices, totalAmount, paidAmount] =
      await Promise.all([
        prisma.invoice.count({ where }),
        prisma.invoice.count({ where: { ...where, status: "PAID" } }),
        prisma.invoice.aggregate({
          where,
          _sum: { total: true },
        }),
        prisma.invoice.aggregate({
          where: { ...where, status: "PAID" },
          _sum: { total: true },
        }),
      ]);

    // Get time series data
    const timeSeriesData = await this.getTimeSeriesData(where, groupBy);

    // Get payment statistics
    const paymentStats = await this.getPaymentStatistics(where);

    // Get top clients
    const topClients = await this.getTopClients(userId, startDate, endDate);

    // Get status breakdown
    const statusBreakdown = await this.getStatusBreakdown(where);

    // Calculate aging report
    const agingReport = await this.getAgingReport(userId);

    return {
      summary: {
        totalInvoices,
        paidInvoices,
        totalAmount: totalAmount._sum.total || 0,
        paidAmount: paidAmount._sum.total || 0,
        paymentRate: totalInvoices ? (paidInvoices / totalInvoices) * 100 : 0,
      },
      timeSeries: timeSeriesData,
      paymentStats,
      topClients,
      statusBreakdown,
      agingReport,
    };
  }

  private async getTimeSeriesData(
    where: Prisma.InvoiceWhereInput,
    groupBy: string
  ) {
    const groupByFormat = {
      day: "%Y-%m-%d",
      week: "%Y-%U",
      month: "%Y-%m",
      year: "%Y",
    }[groupBy];

    const rawData = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC(${groupBy}, created_at) as period,
        COUNT(*) as count,
        SUM(total) as total_amount,
        SUM(CASE WHEN status = 'PAID' THEN total ELSE 0 END) as paid_amount
      FROM invoices
      WHERE ${where}
      GROUP BY period
      ORDER BY period
    `;

    return rawData;
  }

  private async getPaymentStatistics(where: Prisma.InvoiceWhereInput) {
    const paidInvoices = await prisma.invoice.findMany({
      where: { ...where, status: "PAID" },
      select: {
        createdAt: true,
        paidDate: true,
        total: true,
      },
    });

    const paymentTimes = paidInvoices.map(invoice => {
      const createdDate = new Date(invoice.createdAt);
      const paidDate = new Date(invoice.paidDate!);
      return (
        (paidDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
      ); // days
    });

    return {
      averagePaymentTime: paymentTimes.length
        ? paymentTimes.reduce((a, b) => a + b, 0) / paymentTimes.length
        : 0,
      quickestPayment: Math.min(...paymentTimes, Infinity),
      slowestPayment: Math.max(...paymentTimes, 0),
    };
  }

  private async getTopClients(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    return await prisma.invoice.groupBy({
      by: ["recipientId"],
      where: {
        userId,
        ...(startDate &&
          endDate && {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
      },
      _count: {
        _all: true,
      },
      _sum: {
        total: true,
      },
      orderBy: {
        _sum: {
          total: "desc",
        },
      },
      take: 10,
    });
  }

  private async getStatusBreakdown(where: Prisma.InvoiceWhereInput) {
    return await prisma.invoice.groupBy({
      by: ["status"],
      where,
      _count: true,
      _sum: {
        total: true,
      },
    });
  }

  private async getAgingReport(userId: string) {
    const today = new Date();
    const ranges = [
      { label: "0-30 days", min: 0, max: 30 },
      { label: "31-60 days", min: 31, max: 60 },
      { label: "61-90 days", min: 61, max: 90 },
      { label: "Over 90 days", min: 91, max: null },
    ];

    const report = [];

    for (const range of ranges) {
      const where: Prisma.InvoiceWhereInput = {
        userId,
        status: "PENDING",
        dueDate: {
          lt: new Date(today.getTime() - range.min * 24 * 60 * 60 * 1000),
          ...(range.max && {
            gte: new Date(today.getTime() - range.max * 24 * 60 * 60 * 1000),
          }),
        },
      };

      const [count, amount] = await Promise.all([
        prisma.invoice.count({ where }),
        prisma.invoice.aggregate({
          where,
          _sum: { total: true },
        }),
      ]);

      report.push({
        range: range.label,
        count,
        amount: amount._sum.total || 0,
      });
    }

    return report;
  }

  async generateReport(
    userId: string,
    params: {
      startDate: Date;
      endDate: Date;
      format: "pdf" | "csv" | "excel";
    }
  ) {
    const analytics = await this.getInvoiceAnalytics(userId, params);

    // Implementation for different formats would go here
    // For now, we'll just return the data
    return analytics;
  }
}
