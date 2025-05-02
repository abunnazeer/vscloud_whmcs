// src/integrations/paystack/paystack.service.ts
import axios from "axios";

interface TransactionInitializeParams {
  amount: number;
  email: string;
  reference?: string;
  callbackUrl: string;
  metadata?: Record<string, any>;
}

interface RefundParams {
  transactionReference: string;
  amount?: number | undefined;
  merchantNote: string;
}

export class PaystackService {
  private readonly apiKey: string;
  private readonly baseUrl: string = "https://api.paystack.co";

  constructor() {
    this.apiKey = process.env.PAYSTACK_SECRET_KEY || "";
    if (!this.apiKey) {
      console.warn(
        "Warning: PAYSTACK_SECRET_KEY environment variable is not set"
      );
    }
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  async initializeTransaction(params: TransactionInitializeParams) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        params,
        {
          headers: this.getHeaders(),
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error("Paystack Error:", error.response.data);
        throw new Error(
          `Payment initialization failed: ${
            error.response.data.message || "Unknown error"
          }`
        );
      }
      throw error;
    }
  }

  async verifyTransaction(reference: string) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          headers: this.getHeaders(),
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error("Paystack Error:", error.response.data);
        throw new Error(
          `Payment verification failed: ${
            error.response.data.message || "Unknown error"
          }`
        );
      }
      throw error;
    }
  }

  async initiateRefund(params: RefundParams) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/refund`,
        {
          transaction: params.transactionReference,
          amount: params.amount,
          merchant_note: params.merchantNote,
        },
        {
          headers: this.getHeaders(),
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error("Paystack Error:", error.response.data);
        throw new Error(
          `Refund initiation failed: ${
            error.response.data.message || "Unknown error"
          }`
        );
      }
      throw error;
    }
  }
}
