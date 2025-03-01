// src/handlers/scheduled-tasks.handler.ts
import { CronService } from "../services/cron.service";
import { logger } from "../utils/logger";
import { prisma } from "../config/database";

export class ScheduledTasksHandler {
  private cronService: CronService;
  private isRunning: boolean;

  constructor() {
    this.cronService = new CronService();
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      logger.warn("Scheduled tasks are already running");
      return;
    }

    try {
      // Update database status
      await prisma.systemStatus.upsert({
        where: { key: "SCHEDULED_TASKS" },
        update: {
          status: "RUNNING",
          lastStartTime: new Date(),
        },
        create: {
          key: "SCHEDULED_TASKS",
          status: "RUNNING",
          lastStartTime: new Date(),
        },
      });

      // Initialize cron jobs
      this.cronService.initializeCronJobs();

      this.isRunning = true;
      logger.info("Scheduled tasks started successfully");
    } catch (error) {
      logger.error("Failed to start scheduled tasks:", error);
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      logger.warn("Scheduled tasks are not running");
      return;
    }

    try {
      // Update database status
      await prisma.systemStatus.update({
        where: { key: "SCHEDULED_TASKS" },
        data: {
          status: "STOPPED",
          lastStopTime: new Date(),
        },
      });

      // Stop all cron jobs
      // Implementation depends on how you want to handle stopping jobs

      this.isRunning = false;
      logger.info("Scheduled tasks stopped successfully");
    } catch (error) {
      logger.error("Failed to stop scheduled tasks:", error);
      throw error;
    }
  }

  async getStatus() {
    try {
      const status = await prisma.systemStatus.findUnique({
        where: { key: "SCHEDULED_TASKS" },
      });

      if (!status) {
        return {
          running: false,
          lastStartTime: null,
          lastStopTime: null,
          errors: [],
        };
      }

      const recentErrors = await prisma.systemError.findMany({
        where: {
          component: "SCHEDULED_TASKS",
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      });

      return {
        running: status.status === "RUNNING",
        lastStartTime: status.lastStartTime,
        lastStopTime: status.lastStopTime,
        errors: recentErrors,
      };
    } catch (error) {
      logger.error("Failed to get scheduled tasks status:", error);
      throw error;
    }
  }

  async handleFailedTasks() {
    try {
      const failedTasks = await prisma.scheduledTask.findMany({
        where: {
          status: "FAILED",
          retryCount: {
            lt: 3, // Maximum retry attempts
          },
        },
      });

      for (const task of failedTasks) {
        try {
          // Attempt to retry the task
          await this.retryTask(task);
        } catch (error) {
          logger.error(`Failed to retry task ${task.id}:`, error);

          // Update retry count
          await prisma.scheduledTask.update({
            where: { id: task.id },
            data: {
              retryCount: {
                increment: 1,
              },
              lastError:
                error instanceof Error ? error.message : "Unknown error",
              lastRetryAt: new Date(),
            },
          });
        }
      }
    } catch (error) {
      logger.error("Failed to handle failed tasks:", error);
      throw error;
    }
  }

  private async retryTask(task: any) {
    switch (task.type) {
      case "INVOICE_REMINDER":
        await this.cronService.processInvoiceReminders();
        break;
      case "RECURRING_INVOICE":
        await this.cronService.processRecurringInvoices();
        break;
      case "STATUS_UPDATE":
        await this.cronService.updateInvoiceStatuses();
        break;
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }

    // Update task status
    await prisma.scheduledTask.update({
      where: { id: task.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
  }
}
