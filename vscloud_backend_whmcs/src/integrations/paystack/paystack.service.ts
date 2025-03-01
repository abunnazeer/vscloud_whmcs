// src/integrations/paystack/paystack.service.ts
import axios from "axios";

export class PaystackService {
  private readonly baseUrl = "https://api.paystack.co";
  private readonly secretKey: string;

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || "";
  }

  private async makeRequest(method: string, endpoint: string, data?: any) {
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        data,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
      });

      return response.data;
    } catch (error: any) {
      console.error(
        "Paystack API Error:",
        error.response?.data || error.message
      );
      throw new Error(
        error.response?.data?.message || "Payment processing failed"
      );
    }
  }

  async initializeTransaction(data: {
    amount: number;
    email: string;
    reference?: string;
    currency?: string;
    callbackUrl?: string;
    metadata?: any;
  }) {
    const payload = {
      amount: data.amount * 100, // Convert to kobo/cents
      email: data.email,
      reference: data.reference,
      currency: data.currency || "NGN",
      callback_url: data.callbackUrl,
      metadata: data.metadata,
    };

    return this.makeRequest("POST", "/transaction/initialize", payload);
  }

  async verifyTransaction(reference: string) {
    return this.makeRequest("GET", `/transaction/verify/${reference}`);
  }

  async createCustomer(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    metadata?: any;
  }) {
    return this.makeRequest("POST", "/customer", data);
  }

  async listBanks(country: string = "nigeria") {
    return this.makeRequest("GET", `/bank?country=${country}`);
  }

  async createTransferRecipient(data: {
    type: string;
    name: string;
    accountNumber: string;
    bankCode: string;
    currency?: string;
  }) {
    return this.makeRequest("POST", "/transferrecipient", data);
  }

  async initiateRefund(data: {
    transactionReference: string;
    amount?: number;
    merchantNote?: string;
    customerNote?: string;
  }) {
    return this.makeRequest("POST", "/refund", {
      transaction: data.transactionReference,
      amount: data.amount ? data.amount * 100 : undefined,
      merchant_note: data.merchantNote,
      customer_note: data.customerNote,
    });
  }

  async getTransactionHistory(params: {
    perPage?: number;
    page?: number;
    from?: string;
    to?: string;
    status?: "success" | "failed" | "abandoned";
  }) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value.toString());
    });

    return this.makeRequest("GET", `/transaction?${queryParams.toString()}`);
  }

  async createPlan(data: {
    name: string;
    amount: number;
    interval: "daily" | "weekly" | "monthly" | "annually";
    description?: string;
    currency?: string;
  }) {
    const payload = {
      ...data,
      amount: data.amount * 100, // Convert to kobo/cents
    };

    return this.makeRequest("POST", "/plan", payload);
  }

  async createSubscription(data: {
    customerEmail: string;
    planCode: string;
    startDate?: string;
  }) {
    return this.makeRequest("POST", "/subscription", data);
  }

  async cancelSubscription(subscriptionCode: string) {
    return this.makeRequest("POST", `/subscription/disable`, {
      code: subscriptionCode,
      token: subscriptionCode, // Required by Paystack
    });
  }

  async generatePaymentLink(data: {
    amount: number;
    email: string;
    reference?: string;
    currency?: string;
    metadata?: any;
  }) {
    const payload = {
      ...data,
      amount: data.amount * 100,
    };

    return this.makeRequest("POST", "/transaction/initialize", payload);
  }

  async verifyBankAccount(data: { accountNumber: string; bankCode: string }) {
    return this.makeRequest(
      "GET",
      `/bank/resolve?account_number=${data.accountNumber}&bank_code=${data.bankCode}`
    );
  }
}
