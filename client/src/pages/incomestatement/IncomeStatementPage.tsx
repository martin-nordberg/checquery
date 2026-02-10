import TopNav from "../../components/nav/TopNav.tsx";
import IncomeStatement from "../../components/incomestatement/IncomeStatement.tsx";
import IncomeStatementDetailed from "../../components/incomestatement/IncomeStatementDetailed.tsx";
import Breadcrumb from "../../components/nav/Breadcrumb.tsx";
import {useParams} from "@solidjs/router";
import {createEffect, createMemo, createSignal, Show} from "solid-js";
import HoverableDropDown from "../../components/nav/HoverableDropDown.tsx";
import {getEndDate, periodSchema} from "$shared/domain/core/Period.ts";
import {stmtNavOptions} from "../../nav/stmtNavOptions.ts";

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

    const stmtOptions = stmtNavOptions("Income Statement", {
        "Balance Sheet": `/balancesheet/${getEndDate(period())}`,
    })

    const periodOptions = createMemo(() => ({
        "2026-01": `../../2026-01/${view()}`,
        "2026-02": `../../2026-02/${view()}`,
        "2026-03": `../../2026-03/${view()}`,
        "2026-Q1": `../../2026-Q1/${view()}`,
    }))

    const viewOptions = createMemo(() => ({
        "Summary": `../../${period()}/summary`,
        "Details": `../../${period()}/details`,
    }))

    const selectedViewLabel = createMemo(() => view() === 'details' ? 'Details' : 'Summary')

    return (
        <>
            <TopNav>
                <Breadcrumb>
                    <HoverableDropDown options={stmtOptions} selectedOption={"Income Statement"}/>
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
