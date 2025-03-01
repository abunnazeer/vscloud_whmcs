// src/templates/email/reminder-templates.ts
export const reminderTemplates = {
  firstReminder: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Payment Reminder</h2>
      <p>Dear {{recipientName}},</p>
      <p>This is a friendly reminder that invoice #{{invoiceNumber}} for {{amount}} is due on {{dueDate}}.</p>
      <p>To ensure timely processing, please make your payment before the due date.</p>
      <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
        <h3>Invoice Details:</h3>
        <ul style="list-style: none; padding: 0;">
          <li>Invoice Number: {{invoiceNumber}}</li>
          <li>Amount Due: {{amount}}</li>
          <li>Due Date: {{dueDate}}</li>
          <li>Status: {{status}}</li>
        </ul>
      </div>
      <p>If you've already made the payment, please disregard this reminder.</p>
      <div style="margin-top: 20px;">
        <a href="{{paymentLink}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Pay Now
        </a>
      </div>
      <p style="margin-top: 20px;">
        If you have any questions, please don't hesitate to contact us.
      </p>
      <p>Best regards,<br>{{companyName}}</p>
    </div>
  `,

  followUpReminder: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Payment Reminder - Follow Up</h2>
      <p>Dear {{recipientName}},</p>
      <p>We haven't received payment for invoice #{{invoiceNumber}} which was due on {{dueDate}}.</p>
      <p>The outstanding amount is {{amount}}.</p>
      <div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border-radius: 5px;">
        <h3>Invoice Details:</h3>
        <ul style="list-style: none; padding: 0;">
          <li>Invoice Number: {{invoiceNumber}}</li>
          <li>Amount Due: {{amount}}</li>
          <li>Due Date: {{dueDate}}</li>
          <li>Days Overdue: {{daysOverdue}}</li>
        </ul>
      </div>
      <p>Please process this payment as soon as possible to maintain your account in good standing.</p>
      <div style="margin-top: 20px;">
        <a href="{{paymentLink}}" style="background-color: #ffc107; color: black; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Pay Now
        </a>
      </div>
      <p style="margin-top: 20px;">
        If you need to discuss payment arrangements, please contact us immediately.
      </p>
      <p>Best regards,<br>{{companyName}}</p>
    </div>
  `,

  finalReminder: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Final Payment Notice</h2>
      <p>Dear {{recipientName}},</p>
      <p>This is our final notice regarding the overdue payment for invoice #{{invoiceNumber}}.</p>
      <p>The payment of {{amount}} was due on {{dueDate}} and is now {{daysOverdue}} days overdue.</p>
      <div style="margin: 20px 0; padding: 15px; background-color: #f8d7da; border-radius: 5px;">
        <h3>Invoice Details:</h3>
        <ul style="list-style: none; padding: 0;">
          <li>Invoice Number: {{invoiceNumber}}</li>
          <li>Amount Due: {{amount}}</li>
          <li>Original Due Date: {{dueDate}}</li>
          <li>Days Overdue: {{daysOverdue}}</li>
        </ul>
      </div>
      <p>Please be aware that continued non-payment may result in:</p>
      <ul>
        <li>Late payment fees</li>
        <li>Service interruption</li>
        <li>Account suspension</li>
      </ul>
      <div style="margin-top: 20px;">
        <a href="{{paymentLink}}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Pay Now
        </a>
      </div>
      <p style="margin-top: 20px;">
        If you're experiencing difficulties with payment, please contact us immediately to discuss payment arrangements.
      </p>
      <p>Best regards,<br>{{companyName}}</p>
    </div>
  `,

  customReminder: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>{{reminderTitle}}</h2>
      <p>Dear {{recipientName}},</p>
      <div style="margin: 20px 0;">
        {{customMessage}}
      </div>
      <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
        <h3>Invoice Details:</h3>
        <ul style="list-style: none; padding: 0;">
          <li>Invoice Number: {{invoiceNumber}}</li>
          <li>Amount Due: {{amount}}</li>
          <li>Due Date: {{dueDate}}</li>
          <li>Status: {{status}}</li>
        </ul>
      </div>
      {{#if includePaymentButton}}
      <div style="margin-top: 20px;">
        <a href="{{paymentLink}}" style="background-color: {{buttonColor}}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          {{buttonText}}
        </a>
      </div>
      {{/if}}
      <p style="margin-top: 20px;">
        {{closingMessage}}
      </p>
      <p>Best regards,<br>{{companyName}}</p>
    </div>
  `,
};
