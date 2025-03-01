// src/services/analytics-visualization.service.ts
import { prisma } from "../config/database";
import { ChartType } from "@prisma/client";
import { parse } from "json2csv";

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string;
  }>;
}

export class AnalyticsVisualizationService {
  async generateRevenueChart(
    userId: string,
    params: {
      startDate: Date;
      endDate: Date;
      groupBy: "day" | "week" | "month" | "year";
    }
  ): Promise<ChartData> {
    const { startDate, endDate, groupBy } = params;

    const invoices = await prisma.invoice.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
        total: true,
        status: true,
      },
    });

    // Group data by time period
    const groupedData = this.groupDataByTimePeriod(invoices, groupBy);

    return {
      labels: Object.keys(groupedData),
      datasets: [
        {
          label: "Total Revenue",
          data: Object.values(groupedData).map(g => g.total),
          borderColor: "#4CAF50",
        },
        {
          label: "Paid Invoices",
          data: Object.values(groupedData).map(g => g.paid),
          borderColor: "#2196F3",
        },
      ],
    };
  }

  async generateClientAnalytics(userId: string): Promise<ChartData> {
    const clientRevenue = await prisma.invoice.groupBy({
      by: ["recipientId"],
      where: {
        userId,
        status: "PAID",
      },
      _sum: {
        total: true,
      },
    });

    const clients = await prisma.invoiceRecipient.findMany({
      where: {
        id: {
          in: clientRevenue.map(c => c.recipientId),
        },
      },
    });

    return {
      labels: clients.map(c => c.name),
      datasets: [
        {
          label: "Revenue by Client",
          data: clientRevenue.map(c => c._sum.total || 0),
          backgroundColor: this.generateColors(clients.length),
        },
      ],
    };
  }

  async generateAgingReport(userId: string): Promise<ChartData> {
    const ranges = [
      { label: "0-30 days", min: 0, max: 30 },
      { label: "31-60 days", min: 31, max: 60 },
      { label: "61-90 days", min: 61, max: 90 },
      { label: "Over 90 days", min: 91, max: null },
    ];

    const now = new Date();
    const agingData = await Promise.all(
      ranges.map(async range => {
        const invoices = await prisma.invoice.findMany({
          where: {
            userId,
            status: "PENDING",
            dueDate: {
              lt: new Date(now.getTime() - range.min * 24 * 60 * 60 * 1000),
              ...(range.max && {
                gte: new Date(now.getTime() - range.max * 24 * 60 * 60 * 1000),
              }),
            },
          },
          select: {
            total: true,
          },
        });

        return {
          label: range.label,
          total: invoices.reduce((sum, inv) => sum + Number(inv.total), 0),
        };
      })
    );

    return {
      labels: agingData.map(d => d.label),
      datasets: [
        {
          label: "Outstanding Amount",
          data: agingData.map(d => d.total),
          backgroundColor: [
            "#4CAF50", // Green for current
            "#FFC107", // Yellow for 31-60
            "#FF9800", // Orange for 61-90
            "#F44336", // Red for over 90
          ],
        },
      ],
    };
  }

  async generatePaymentTrendChart(
    userId: string,
    months: number = 12
  ): Promise<ChartData> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const payments = await prisma.payment.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
        },
        status: "COMPLETED",
      },
      select: {
        createdAt: true,
        amount: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const monthlyData = this.groupPaymentsByMonth(payments);

    return {
      labels: Object.keys(monthlyData),
      datasets: [
        {
          label: "Payment Trend",
          data: Object.values(monthlyData),
          borderColor: "#2196F3",
          fill: false,
        },
      ],
    };
  }

  async exportAnalyticsData(userId: string, format: "csv" | "json" = "csv") {
    const data = await this.gatherAnalyticsData(userId);

    if (format === "csv") {
      return parse(data);
    }

    return JSON.stringify(data, null, 2);
  }

  private async gatherAnalyticsData(userId: string) {
    const [revenue, payments, aging] = await Promise.all([
      this.generateRevenueChart(userId, {
        startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        groupBy: "month",
      }),
      this.generatePaymentTrendChart(userId),
      this.generateAgingReport(userId),
    ]);

    return {
      revenue,
      payments,
      aging,
    };
  }

  private groupDataByTimePeriod(invoices: any[], groupBy: string) {
    const grouped: Record<string, { total: number; paid: number }> = {};

    invoices.forEach(invoice => {
      const date = new Date(invoice.createdAt);
      let key: string;

      switch (groupBy) {
        case "day":
          key = date.toISOString().split("T")[0];
          break;
        case "week":
          key = `${date.getFullYear()}-W${this.getWeekNumber(date)}`;
          break;
        case "month":
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
            2,
            "0"
          )}`;
          break;
        case "year":
          key = date.getFullYear().toString();
          break;
        default:
          key = date.toISOString().split("T")[0];
      }

      if (!grouped[key]) {
        grouped[key] = { total: 0, paid: 0 };
      }

      grouped[key].total += Number(invoice.total);
      if (invoice.status === "PAID") {
        grouped[key].paid += Number(invoice.total);
      }
    });

    return grouped;
  }

  private groupPaymentsByMonth(payments: any[]) {
    const grouped: Record<string, number> = {};

    payments.forEach(payment => {
      const date = new Date(payment.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}`;

      if (!grouped[key]) {
        grouped[key] = 0;
      }

      grouped[key] += Number(payment.amount);
    });

    return grouped;
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  private generateColors(count: number): string[] {
    const colors = [
      "#4CAF50",
      "#2196F3",
      "#FFC107",
      "#FF5722",
      "#9C27B0",
      "#00BCD4",
      "#FF9800",
      "#795548",
      "#607D8B",
      "#E91E63",
      "#3F51B5",
      "#009688",
    ];

    if (count <= colors.length) {
      return colors.slice(0, count);
    }

    // Generate additional colors if needed
    const additional = Array.from({ length: count - colors.length }, (_, i) => {
      const hue = (i * 137.508) % 360; // Golden angle approximation
      return `hsl(${hue}, 70%, 50%)`;
    });

    return [...colors, ...additional];
  }
}
