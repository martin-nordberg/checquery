import { requireCurrentSession } from "./currentSession";
import { vendorCreationEventSchema, vendorDeletionEventSchema, vendorPatchEventSchema, type Vendor } from "../shared/domain/vendors/Vendor";
import { genVndrId, vndrIdSchema } from "../shared/domain/vendors/VndrId";
import { vndrCtgIdSchema } from "../shared/domain/vendorCategories/VndrCtgId";
import { acctIdSchema } from "../shared/domain/accounts/AcctId";
import type { CreateVendorParams, PatchVendorParams } from "../shared/rpc";

export async function handleFindVendorsAll(): Promise<Vendor[]> {
	const { store } = requireCurrentSession();
	return store.svcs.vendors.findVendorsAll();
}

export async function handleCreateVendor(params: CreateVendorParams): Promise<void> {
	const { store, origId } = requireCurrentSession();
	const event = vendorCreationEventSchema.parse({
		id: genVndrId(),
		origId,
		name: params.name,
		description: params.description,
		ctgId: vndrCtgIdSchema.parse(params.ctgId),
		defaultAcctId: params.defaultAcctId ? acctIdSchema.parse(params.defaultAcctId) : undefined,
	});
	await store.svcs.vendors.createVendor(event);
}

export async function handlePatchVendor(params: PatchVendorParams): Promise<void> {
	const { store, origId } = requireCurrentSession();
	const event = vendorPatchEventSchema.parse({
		id: vndrIdSchema.parse(params.id),
		origId,
		name: params.name,
		description: params.description,
		ctgId: params.ctgId !== undefined ? vndrCtgIdSchema.parse(params.ctgId) : undefined,
		defaultAcctId: params.defaultAcctId !== undefined ? acctIdSchema.parse(params.defaultAcctId) : undefined,
		isActive: params.isActive,
	});
	await store.svcs.vendors.patchVendor(event);
}

export async function handleDeleteVendor(params: { id: string }): Promise<void> {
	const { store, origId } = requireCurrentSession();
	const event = vendorDeletionEventSchema.parse({
		id: vndrIdSchema.parse(params.id),
		origId,
	});
	await store.svcs.vendors.deleteVendor(event);
}

export async function handleIsVendorInUse(params: { id: string }): Promise<boolean> {
	const { store } = requireCurrentSession();
	return store.svcs.vendors.isVendorInUse(vndrIdSchema.parse(params.id));
}
