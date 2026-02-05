import {A} from "@solidjs/router";
import TopNav from "../components/nav/TopNav.tsx";

export const HomePage = () => {
    return (
        <>
            <TopNav/>
            <main class="p-2">
                <ul>
                    <li>
                        <A class="hover:underline" href="./balancesheet">
                            Balance Sheet
                        </A>
                    </li>
                    <li>
                        <A class="hover:underline" href="./incomestatement">
                            Income Statement
                        </A>
                    </li>
                    <li>
                        <A class="hover:underline" href="/register/accttruistchecking0000000000">
                            Register (Checking)
                        </A>
                    </li>
                    <li>
                        <A class="hover:underline" href="./vendors">
                            Vendors
                        </A>
                    </li>
                </ul>
            </main>
        </>
    )
}