// src/interfaces/server.interface.ts
import { ServerType, ServerStatus } from "@prisma/client";


export interface ServerConfig {
  id?: string;
  name: string;
  hostname: string;
  ipAddress: string;
  port: number;
  username: string;
  password: string;
  useSSL?: boolean;
  type: ServerType;
  status: ServerStatus;
  location: string;
  operatingSystem: string;
  totalDiskSpace: number;
  usedDiskSpace?: number;
  totalBandwidth: number;
  usedBandwidth?: number;
  cpuCores: number;
  ram: number;
  createdAt?: Date;
  updatedAt?: Date;
}
export interface ServerStats {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  bandwidth: {
    used: number;
    total: number;
  };
  accounts: {
    total: number;
    active: number;
    suspended: number;
  };
}




export interface MaintenanceSchedule {
  id?: string;
  serverId: string;
  type: string;
  description: string;
  startTime: Date;
  endTime?: Date;
  status: string;
  notificationSent?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export { ServerType };
