import { heartModule } from "@/lib/organs/heart";
import { lungModule } from "@/lib/organs/lung";
import type { OrganModule } from "@/lib/organs/types";
import type { OrganId } from "@/lib/types";

const modules: OrganModule[] = [heartModule, lungModule];

export function listOrgans(): OrganModule[] {
  return modules;
}

export function getOrgan(id: OrganId | string): OrganModule {
  const found = modules.find((item) => item.id === id);
  if (!found) throw new Error(`No organ module is registered for "${id}".`);
  return found;
}

export function isOrganId(value: string): value is OrganId {
  return modules.some((item) => item.id === value);
}
