import TopNav from "../../components/nav/TopNav.tsx";
import BalanceSheet from "../../components/balancesheet/BalanceSheet.tsx";
import Breadcrumb from "../../components/nav/Breadcrumb.tsx";
import {useParams} from "@solidjs/router";
import {createEffect, createSignal} from "solid-js";
import {isoDateSchema, isoDateToday} from "$shared/domain/core/IsoDate.ts";
import HoverableDropDown from "../../components/nav/HoverableDropDown.tsx";

const BalanceSheetPage = () => {

    const params = useParams()

    const parseEndingDate = () => isoDateSchema.parse(params['endingDate'] ?? isoDateToday)
    const [endingDate, setEndingDate] = createSignal(parseEndingDate())

    createEffect(() => {
        setEndingDate(parseEndingDate())
    })

    const stmtOptions = {
        "Balance Sheet": ".",
        "Income Statement": `../../incomestatement/${endingDate().substring(0, 7)}`
    }

    const dateOptions = {
        "2025-12-31": "../2025-12-31",
        "2026-01-07": "../2026-01-07",
        "2026-01-15": "../2026-01-15",
        "2026-01-24": "../2026-01-24",
    }

    return (
        <>
            <TopNav>
                <Breadcrumb>
                    <HoverableDropDown options={stmtOptions} selectedOption={"Balance Sheet"}/>
                </Breadcrumb>
                <Breadcrumb>
                    <HoverableDropDown selectedOption={endingDate()} options={dateOptions}/>
                </Breadcrumb>
            </TopNav>
            <main class="p-2">
                <BalanceSheet endingDate={endingDate()}/>
            </main>
        </>
    )
}

export default BalanceSheetPage
