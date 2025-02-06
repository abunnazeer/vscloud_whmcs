# VSCloud - Web Hosting Management Platform

A modern web hosting management platform built with Next.js and TypeScript.

## Project Overview

VSCloud is a comprehensive web hosting management platform that allows users to manage hosting services, domains, and billing in one place.

## Features

### Completed Features ✅

#### Authentication
- Login with email/password
- Registration with validation
- Secure authentication layout
- Protected routes

#### Dashboard
- Responsive dashboard layout
- Sidebar navigation
- User profile section
- Quick actions
- Statistics overview

#### Hosting Plans
- Plan comparison
- Pricing display
- Monthly/Annual billing toggle
- Order processing
- Feature comparison

#### Domain Management (Partial)
- Domain listing interface
- DNS management modal
- Domain transfer process
- Domain renewal system
- Nameservers management

#### Billing System (In Progress)
- Billing dashboard
- Invoice listing
- Payment method management
- Transaction history

### Pending Features 🚧

#### Domain Management (Remaining)
- Contact information editing
- Domain privacy settings
- Domain lock functionality
- WHOIS management
- Domain transfer out

#### Billing System (Remaining)
- Invoice payment processing
- Payment history page
- Subscription management
- Billing settings
- Auto-renewal settings

#### Support System
- Ticket creation
- Support chat
- Knowledge base
- System status
- Announcements

## Tech Stack

### Frontend
- Next.js 14
- TypeScript
- Tailwind CSS
- Redux Toolkit
- React Hook Form
- Zod Validation
- Headless UI
- Heroicons

### Dependencies
```json
{
  "dependencies": {
    "@headlessui/react": "latest",
    "@heroicons/react": "latest",
    "@reduxjs/toolkit": "latest",
    "react-redux": "latest",
    "axios": "latest",
    "react-hook-form": "latest",
    "zod": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest"
  }
}
```

## Project Structure
```
vscloud/
├── frontend/
│   ├── public/
│   │   ├── images/
│   │   └── icons/
│   └── src/
│       ├── app/
│       │   ├── (auth)/
│       │   │   ├── login/
│       │   │   └── register/
│       │   └── (dashboard)/
│       │       ├── dashboard/
│       │       ├── hosting/
│       │       ├── domains/
│       │       └── billing/
│       ├── components/
│       │   ├── ui/
│       │   │   ├── button.tsx
│       │   │   └── input.tsx
│       │   ├── shared/
│       │   ├── domains/
│       │   │   ├── DnsManagementModal.tsx
│       │   │   └── DomainTransferModal.tsx
│       │   └── billing/
│       │       └── PaymentMethodModal.tsx
│       ├── lib/
│       │   └── utils.ts
│       └── types/
```

## Setup Instructions

1. Clone the repository
```bash
git clone [repository-url]
cd vscloud
```

2. Install dependencies
```bash
cd frontend
npm install
```

3. Run the development server
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Component Implementation Progress

### Completed Components
- [x] Authentication Layout
- [x] Dashboard Layout
- [x] Hosting Plans Display
- [x] DNS Management Modal
- [x] Domain Transfer Modal
- [x] Billing Dashboard
- [x] Payment Method Modal

### In Progress
- [ ] Invoice Payment Modal
- [ ] Payment History Page
- [ ] Subscription Management
- [ ] Domain Privacy Settings
- [ ] Support Ticket System

## Next Steps
1. Complete the billing system implementation
2. Finish remaining domain management features
3. Implement support ticket system
4. Add email notifications
5. Implement user settings

## Contributing
[Add contribution guidelines]

## License
[Add license information]