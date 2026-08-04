import { useParams } from "@solidjs/router";
import TransactionLog from "../../components/transactions/TransactionLog";
import type { AcctId } from "../../../shared/domain/accounts/AcctId";

export default function IncomeLogPage() {
	const params = useParams<{ accountId: string }>();
	return <TransactionLog accountId={params.accountId as AcctId} heading="Income Log" />;
}
