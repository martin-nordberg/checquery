import TopNav from "../../components/nav/TopNav.tsx";
import Breadcrumb from "../../components/nav/Breadcrumb.tsx";
import HoverableDropDown from "../../components/nav/HoverableDropDown.tsx";
import VendorList from "../../components/vendors/VendorList.tsx";
import {isoDateToday} from "$shared/domain/core/IsoDate.ts";

const VendorsPage = () => {

    const stmtOptions = {
        "Vendors": ".",
        "Balance Sheet": `/balancesheet/${isoDateToday}`,
        "Income Statement": `/incomestatement/${isoDateToday?.substring(0, 7)}`,
        "Register": "/register/accttruistchecking0000000000",
    }

    return (
        <>
            <TopNav>
                <Breadcrumb>
                    <HoverableDropDown options={stmtOptions} selectedOption="Vendors" />
                </Breadcrumb>
            </TopNav>
            <main class="p-4">
                <VendorList />
            </main>
        </>
    )
}

export default VendorsPage
