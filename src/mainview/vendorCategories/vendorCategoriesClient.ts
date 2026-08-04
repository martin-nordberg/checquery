import { rpc } from "../rpc";
import type { VendorCategory } from "../../shared/domain/vendorCategories/VendorCategory";
import type { CreateVendorCategoryParams, PatchVendorCategoryParams } from "../../shared/rpc";

export const vendorCategoriesClient = {
	findVendorCategoriesAll: (): Promise<VendorCategory[]> => rpc.request.findVendorCategoriesAll(),
	createVendorCategory: (params: CreateVendorCategoryParams): Promise<void> => rpc.request.createVendorCategory(params),
	patchVendorCategory: (params: PatchVendorCategoryParams): Promise<void> => rpc.request.patchVendorCategory(params),
	deleteVendorCategory: (id: string): Promise<void> => rpc.request.deleteVendorCategory({ id }),
	isVendorCategoryInUse: (id: string): Promise<boolean> => rpc.request.isVendorCategoryInUse({ id }),
};
