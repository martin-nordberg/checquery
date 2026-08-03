import { rpc } from "../rpc";
import type { Vendor } from "../../shared/domain/vendors/Vendor";
import type { CreateVendorParams, PatchVendorParams } from "../../shared/rpc";

export const vendorsClient = {
	findVendorsAll: (): Promise<Vendor[]> => rpc.request.findVendorsAll(),
	createVendor: (params: CreateVendorParams): Promise<void> => rpc.request.createVendor(params),
	patchVendor: (params: PatchVendorParams): Promise<void> => rpc.request.patchVendor(params),
	deleteVendor: (id: string): Promise<void> => rpc.request.deleteVendor({ id }),
	isVendorInUse: (id: string): Promise<boolean> => rpc.request.isVendorInUse({ id }),
};
