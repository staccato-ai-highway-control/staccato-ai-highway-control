import { mockCctvs } from "./mock";

export async function getCctvs() {
  return mockCctvs;
}

export async function getCctv(id: string) {
  return mockCctvs.find((cctv) => cctv.id === id) ?? mockCctvs[0];
}

