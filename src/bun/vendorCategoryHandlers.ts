import { requireCurrentSession } from "./currentSession";
import {
	vendorCategoryCreationEventSchema,
	vendorCategoryDeletionEventSchema,
	vendorCategoryPatchEventSchema,
	type VendorCategory,
} from "../shared/domain/vendorCategories/VendorCategory";
import { genVndrCtgId, vndrCtgIdSchema } from "../shared/domain/vendorCategories/VndrCtgId";
import type { CreateVendorCategoryParams, PatchVendorCategoryParams } from "../shared/rpc";

export async function handleFindVendorCategoriesAll(): Promise<VendorCategory[]> {
	const { store } = requireCurrentSession();
	return store.svcs.vendorCategories.findVendorCategoriesAll();
}

export async function handleCreateVendorCategory(params: CreateVendorCategoryParams): Promise<void> {
	const { store, origId } = requireCurrentSession();
	const event = vendorCategoryCreationEventSchema.parse({
		id: genVndrCtgId(),
		origId,
		name: params.name,
		description: params.description,
	});
	await store.svcs.vendorCategories.createVendorCategory(event);
}

export async function handlePatchVendorCategory(params: PatchVendorCategoryParams): Promise<void> {
	const { store, origId } = requireCurrentSession();
	const event = vendorCategoryPatchEventSchema.parse({
		id: vndrCtgIdSchema.parse(params.id),
		origId,
		name: params.name,
		description: params.description,
	});
	await store.svcs.vendorCategories.patchVendorCategory(event);
}

export async function handleDeleteVendorCategory(params: { id: string }): Promise<void> {
	const { store, origId } = requireCurrentSession();
	const event = vendorCategoryDeletionEventSchema.parse({
		id: vndrCtgIdSchema.parse(params.id),
		origId,
	});
	await store.svcs.vendorCategories.deleteVendorCategory(event);
}

export async function handleIsVendorCategoryInUse(params: { id: string }): Promise<boolean> {
	const { store } = requireCurrentSession();
	return store.svcs.vendorCategories.isVendorCategoryInUse(vndrCtgIdSchema.parse(params.id));
}
