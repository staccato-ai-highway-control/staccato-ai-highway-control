export type Cctv = {
  id: string;
  name: string;
  road: string;
  location: string;
  status: "ONLINE" | "OFFLINE" | "MAINTENANCE";
  roiTypes: Array<"LANE" | "SHOULDER">;
};

