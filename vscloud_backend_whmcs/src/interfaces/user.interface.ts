// src/interfaces/user.interface.ts

export interface User {
  id?: string;
  username: string;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role: "admin" | "reseller" | "customer";
  isActive: boolean;
  lastLogin?: Date;

  // External user IDs in different control panels
  directAdminUsername?: string;
  cPanelUsername?: string;
  pleskUsername?: string;
  serverId?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserLoginResponse {
  user: Omit<User, "password">;
  token: string;
}
