import type { Cctv } from "./types";

export const mockCctvs: Cctv[] = [
  { id: "cctv-001", name: "수원IC 본선", road: "경부고속도로", location: "123.4K", status: "ONLINE", roiTypes: ["LANE", "SHOULDER"] },
  { id: "cctv-002", name: "용인IC 갓길", road: "영동고속도로", location: "45.1K", status: "ONLINE", roiTypes: ["SHOULDER"] },
  { id: "cctv-003", name: "매송IC 본선", road: "서해안고속도로", location: "18.6K", status: "ONLINE", roiTypes: ["LANE"] },
  { id: "cctv-004", name: "대소JC 갓길", road: "중부고속도로", location: "201.2K", status: "MAINTENANCE", roiTypes: ["SHOULDER"] },
];
