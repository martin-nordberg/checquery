import TopNav from "../../components/nav/TopNav.tsx";
import BalanceSheet from "../../components/balancesheet/BalanceSheet.tsx";
import Breadcrumb from "../../components/nav/Breadcrumb.tsx";

const BalanceSheetPage = () => {

    return (
        <>
            <TopNav>
                <Breadcrumb>Balance Sheet</Breadcrumb>
                <Breadcrumb>2026-01-24</Breadcrumb>
            </TopNav>
            <main class="p-2">
                <BalanceSheet endingDate="2026-01-24"/>
            </main>
        </>
    )
}

export default BalanceSheetPage
