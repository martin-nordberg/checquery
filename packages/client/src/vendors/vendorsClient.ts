import { api, unwrap, unwrapVoid } from "../api/apiClient";
import type { Vendor } from "@checquery/shared/domain/vendors/Vendor";
import type { CreateVendorParams, PatchVendorParams } from "@checquery/shared/api/vendorsApi";

export const vendorsClient = {
	findVendorsAll: async (): Promise<Vendor[]> => (await unwrap(await api.vendors.$get())) as unknown as Vendor[],
	createVendor: async (params: CreateVendorParams): Promise<void> => unwrapVoid(await api.vendors.$post({ json: params })),
	patchVendor: async ({ id, ...body }: PatchVendorParams): Promise<void> =>
		unwrapVoid(await api.vendors[":id"].$patch({ param: { id }, json: body })),
	deleteVendor: async (id: string): Promise<void> => unwrapVoid(await api.vendors[":id"].$delete({ param: { id } })),
	isVendorInUse: async (id: string): Promise<boolean> =>
		(await unwrap(await api.vendors[":id"]["in-use"].$get({ param: { id } }))).inUse,
};
