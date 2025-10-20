export type Role =
  | "PROVIDER_ADMIN"
  | "SERVICE_MANAGER"
  | "SUPPORT_WORKER"
  | "PARTICIPANT"
  | "HR"
  | "FINANCE"
  | "IT"
  | "DATA_ENTRY";

export const routeForRole = (role: string | null | undefined): string => {
  switch ((role || "").toUpperCase()) {
    case "PROVIDER_ADMIN":
      return "/dashboard/provider";
    case "SERVICE_MANAGER":
      return "/dashboard/manager";
    case "SUPPORT_WORKER":
      return "/dashboard/worker";
    case "PARTICIPANT":
      return "/dashboard/participant";
    case "HR":
      return "/dashboard/hr";
    case "FINANCE":
      return "/dashboard/finance";
    case "IT":
      return "/dashboard/it";
    case "DATA_ENTRY":
      return "/dashboard/data";
    default:
      return "/unauthorized";
  }
};

