import TopNav from "../../components/nav/TopNav.tsx";
import Breadcrumb from "../../components/nav/Breadcrumb.tsx";
import HoverableDropDown from "../../components/nav/HoverableDropDown.tsx";
import AccountList from "../../components/accounts/AccountList.tsx";
import {stmtNavOptions} from "../../nav/stmtNavOptions.ts";

const AccountsPage = () => {

    const stmtOptions = stmtNavOptions("Accounts")

    return (
        <>
            <TopNav>
                <Breadcrumb>
                    <HoverableDropDown options={stmtOptions} selectedOption="Accounts" />
                </Breadcrumb>
            </TopNav>
            <main class="p-4">
                <AccountList />
            </main>
        </>
    )
}

export default AccountsPage
