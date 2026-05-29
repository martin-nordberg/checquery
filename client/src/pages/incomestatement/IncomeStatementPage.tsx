import TopNav from "../../components/nav/TopNav.tsx";
import IncomeStatement from "../../components/incomestatement/IncomeStatement.tsx";
import IncomeStatementDetailed from "../../components/incomestatement/IncomeStatementDetailed.tsx";
import Breadcrumb from "../../components/nav/Breadcrumb.tsx";
import {useParams} from "@solidjs/router";
import {createEffect, createMemo, createSignal, Show} from "solid-js";
import HoverableDropDown from "../../components/nav/HoverableDropDown.tsx";
import {getEndDate, periodSchema} from "$shared/domain/core/Period.ts";
import {useStmtNavOptions} from "../../nav/useStmtNavOptions.ts";

export type IncomeStatementView = "summary" | "details"

const IncomeStatementPage = () => {

    const params = useParams()

    const parsePeriod = () => periodSchema.parse(params['period'] ?? "2026-01")
    const parseView = (): IncomeStatementView => {
        const view = params['view']
        if (view === 'details') {
            return 'details'
        }
        return 'summary'
    }

    const [period, setPeriod] = createSignal(parsePeriod())
    const [view, setView] = createSignal<IncomeStatementView>(parseView())

    createEffect(() => {
        setPeriod(parsePeriod())
        setView(parseView())
    })

    const {options: stmtOptions, iconPaths: stmtIconPaths} = useStmtNavOptions("Income Statement", {
        "Balance Sheet": `/balancesheet/${getEndDate(period())}`,
    })

    const periodOptions = createMemo(() => {
        const today = new Date()
        const currentYear = today.getFullYear()
        const currentMonth = today.getMonth() + 1
        const startYear = 2026
        const options: Record<string, string> = {}
        for (let year = startYear; year <= currentYear; year++) {
            const maxMonth = year === currentYear ? currentMonth : 12
            for (let month = 1; month <= maxMonth; month++) {
                const monthStr = month.toString().padStart(2, '0')
                const period = `${year}-${monthStr}`
                options[period] = `../../${period}/${view()}`
                if (month % 3 === 0) {
                    const qtr = `${year}-Q${month / 3}`
                    options[qtr] = `../../${qtr}/${view()}`
                }
            }
            options[`${year}`] = `../../${year}/${view()}`
        }
        return options
    })

    const viewOptions = createMemo(() => ({
        "Summary": `../../${period()}/summary`,
        "Details": `../../${period()}/details`,
    }))

    const selectedViewLabel = createMemo(() => view() === 'details' ? 'Details' : 'Summary')

    return (
        <>
            <TopNav>
                <Breadcrumb>
                    <HoverableDropDown options={stmtOptions()} selectedOption={"Income Statement"} iconPaths={stmtIconPaths()}/>
                </Breadcrumb>
                <Breadcrumb>
                    <HoverableDropDown selectedOption={period()} options={periodOptions()}/>
                </Breadcrumb>
                <Breadcrumb>
                    <HoverableDropDown selectedOption={selectedViewLabel()} options={viewOptions()}/>
                </Breadcrumb>
            </TopNav>
            <main class="p-1">
                <Show when={view() === 'details'} fallback={<IncomeStatement period={period()}/>}>
                    <IncomeStatementDetailed period={period()}/>
                </Show>
            </main>
        </>
    )
}

export default IncomeStatementPage
