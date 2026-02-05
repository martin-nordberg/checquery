import TopNav from "../../components/nav/TopNav.tsx";
import IncomeStatement from "../../components/incomestatement/IncomeStatement.tsx";
import Breadcrumb from "../../components/nav/Breadcrumb.tsx";
import {useParams} from "@solidjs/router";
import {createEffect, createSignal} from "solid-js";
import HoverableDropDown from "../../components/nav/HoverableDropDown.tsx";
import {getEndDate, periodSchema} from "$shared/domain/core/Period.ts";

const IncomeStatementPage = () => {

    const params = useParams()

    const parsePeriod = () => periodSchema.parse(params['period'] ?? "2026-01")
    const [period, setPeriod] = createSignal(parsePeriod())

    createEffect(() => {
        setPeriod(parsePeriod())
    })

    const stmtOptions = {
        "Income Statement": ".",
        "Balance Sheet": `../../balancesheet/${getEndDate(period())}`,
        "Register": "/register/accttruistchecking0000000000",
        "Vendors": "/vendors",
    }

    const periodOptions = {
        "2026-01": "../2026-01",
        "2026-02": "../2026-02",
        "2026-03": "../2026-03",
        "2026-Q1": "../2026-Q1",
    }

    return (
        <>
            <TopNav>
                <Breadcrumb>
                    <HoverableDropDown options={stmtOptions} selectedOption={"Income Statement"}/>
                </Breadcrumb>
                <Breadcrumb>
                    <HoverableDropDown selectedOption={period()} options={periodOptions}/>
                </Breadcrumb>
            </TopNav>
            <main class="p-2">
                <IncomeStatement period={period()}/>
            </main>
        </>
    )
}

export default IncomeStatementPage
