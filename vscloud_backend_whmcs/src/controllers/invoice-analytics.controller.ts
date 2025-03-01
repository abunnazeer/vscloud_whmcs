// src/controllers/invoice-analytics.controller.ts
import { Request, Response } from "express";
import { InvoiceAnalyticsService } from "../services/invoice-analytics.service";

export class InvoiceAnalyticsController {
  private analyticsService: InvoiceAnalyticsService;

  constructor() {
    this.analyticsService = new InvoiceAnalyticsService();
  }

  public getAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      const { startDate, endDate, groupBy, includeUnpaid } = req.query;

      const analytics = await this.analyticsService.getInvoiceAnalytics(
        userId,
        {
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
          groupBy: groupBy as "day" | "week" | "month" | "year",
          includeUnpaid: includeUnpaid === "true",
        }
      );

      res.json({
        status: "success",
        data: analytics,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to fetch analytics",
      });
    }
  };

  public getAgingReport = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      const agingReport = await this.analyticsService.getAgingReport(userId);

      res.json({
        status: "success",
        data: agingReport,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch aging report",
      });
    }
  };

  public generateReport = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      const { startDate, endDate, format } = req.body;

      const report = await this.analyticsService.generateReport(userId, {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        format: format as "pdf" | "csv" | "excel",
      });

      // Set appropriate headers based on format
      switch (format) {
        case "pdf":
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            "attachment; filename=report.pdf"
          );
          break;
        case "csv":
          res.setHeader("Content-Type", "text/csv");
          res.setHeader(
            "Content-Disposition",
            "attachment; filename=report.csv"
          );
          break;
        case "excel":
          res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          );
          res.setHeader(
            "Content-Disposition",
            "attachment; filename=report.xlsx"
          );
          break;
      }

      res.send(report);
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to generate report",
      });
    }
  };

  public getRevenueForecast = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      const { months } = req.query;

      const forecast = await this.analyticsService.getRevenueForecast(userId, {
        months: months ? parseInt(months as string) : 3,
      });

      res.json({
        status: "success",
        data: forecast,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate forecast",
      });
    }
  };

  public getClientAnalytics = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      const { clientId } = req.params;
      const { startDate, endDate } = req.query;

      const analytics = await this.analyticsService.getClientAnalytics(
        userId,
        clientId,
        {
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
        }
      );

      res.json({
        status: "success",
        data: analytics,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch client analytics",
      });
    }
  };
}
