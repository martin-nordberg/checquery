import TopNav from "../../components/nav/TopNav.tsx";
import BalanceSheet from "../../components/balancesheet/BalanceSheet.tsx";
import Breadcrumb from "../../components/nav/Breadcrumb.tsx";
import {useParams} from "@solidjs/router";
import {createEffect, createSignal} from "solid-js";
import {type IsoDate, isoDateSchema, isoDateToday} from "$shared/domain/core/IsoDate.ts";
import HoverableDropDown from "../../components/nav/HoverableDropDown.tsx";
import {stmtNavOptions} from "../../nav/stmtNavOptions.ts";

const generateDateOptions = (): Record<string, string> => {
    const options: Record<string, string> = {}
    const today = new Date()

    // Today's date
    const todayIso = today.toISOString().substring(0, 10) as IsoDate
    options[todayIso] = `../${todayIso}`

    // Last day of each of the previous 12 months
    for (let i = 0; i < 12; i++) {
        // Day 0 of month M gives the last day of month M-1
        // Date constructor handles negative months by rolling back the year
        const lastDay = new Date(today.getFullYear(), today.getMonth() - i, 0)
        const isoDate = lastDay.toISOString().substring(0, 10) as IsoDate
        if (!(isoDate in options)) {
            options[isoDate] = `../${isoDate}`
        }
    }

    return options
}

const BalanceSheetPage = () => {

    const params = useParams()

    const parseEndingDate = () => isoDateSchema.parse(params['endingDate'] ?? isoDateToday)
    const [endingDate, setEndingDate] = createSignal(parseEndingDate())

    createEffect(() => {
        setEndingDate(parseEndingDate())
    })

    const stmtOptions = stmtNavOptions("Balance Sheet", {
        "Income Statement": `/incomestatement/${endingDate().substring(0, 7)}`,
    })

    const dateOptions = generateDateOptions()

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
