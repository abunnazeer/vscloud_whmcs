// src/app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import morgan from "morgan";
import authRoutes from "./routes/auth.routes";
import domainRoutes from "./routes/domain.routes";
// import directAdminRoutes from "./routes/directadmin.routes";

// import invoiceRoutes from "./routes/invoice.routes";

import invoiceRoutes from "./routes/invoice.routes";
import invoiceTemplateRoutes from "./routes/invoice-template.routes";
import invoiceReminderRoutes from "./routes/invoice-reminder.routes";
import recurringInvoiceRoutes from "./routes/recurring-invoice.routes";
import invoiceAnalyticsRoutes from "./routes/invoice-analytics.routes";
import domainRegistrarRoutes from "./routes/domain-registrar.routes";

import hostingRoutes from "./routes/hosting.routes";
// import emailRoutes from "./routes/email.routes";
import billingRoutes from "./routes/billing.routes";
dotenv.config();
const app = express();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/domains", domainRoutes);
app.use("/api/domains", domainRegistrarRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/hosting", hostingRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/invoice-templates", invoiceTemplateRoutes);
app.use("/api/invoice-reminders", invoiceReminderRoutes);
app.use("/api/recurring-invoices", recurringInvoiceRoutes);
app.use("/api/invoice-analytics", invoiceAnalyticsRoutes);


// Error handling
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
);

export default app;

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV}`);
});
