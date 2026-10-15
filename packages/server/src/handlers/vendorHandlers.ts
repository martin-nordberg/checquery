import type { HandlerSession } from "../session/currentSession";
import { vendorCreationEventSchema, vendorDeletionEventSchema, vendorPatchEventSchema, type Vendor } from "@checquery/shared/domain/vendors/Vendor";
import { genVndrId, vndrIdSchema } from "@checquery/shared/domain/vendors/VndrId";
import { acctIdSchema } from "@checquery/shared/domain/accounts/AcctId";
import type { CreateVendorParams, PatchVendorParams } from "@checquery/shared/api/vendorsApi";

export async function handleFindVendorsAll(session: HandlerSession): Promise<Vendor[]> {
	const { store } = session;
	return store.svcs.vendors.findVendorsAll();
}

export async function handleCreateVendor(session: HandlerSession, params: CreateVendorParams): Promise<void> {
	const { store, origId } = session;
	const event = vendorCreationEventSchema.parse({
		id: genVndrId(),
		origId,
		name: params.name,
		description: params.description,
		defaultAcctId: params.defaultAcctId ? acctIdSchema.parse(params.defaultAcctId) : undefined,
	});
	await store.svcs.vendors.createVendor(event);
}

export async function handlePatchVendor(session: HandlerSession, params: PatchVendorParams): Promise<void> {
	const { store, origId } = session;
	const event = vendorPatchEventSchema.parse({
		id: vndrIdSchema.parse(params.id),
		origId,
		name: params.name,
		description: params.description,
		defaultAcctId: params.defaultAcctId !== undefined ? acctIdSchema.parse(params.defaultAcctId) : undefined,
		isActive: params.isActive,
	});
	await store.svcs.vendors.patchVendor(event);
}

export async function handleDeleteVendor(session: HandlerSession, params: { id: string }): Promise<void> {
	const { store, origId } = session;
	const event = vendorDeletionEventSchema.parse({
		id: vndrIdSchema.parse(params.id),
		origId,
	});
	await store.svcs.vendors.deleteVendor(event);
}

export async function handleIsVendorInUse(session: HandlerSession, params: { id: string }): Promise<boolean> {
	const { store } = session;
	return store.svcs.vendors.isVendorInUse(vndrIdSchema.parse(params.id));
}
