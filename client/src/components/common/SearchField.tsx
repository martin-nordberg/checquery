import {createSignal, onMount, onCleanup} from "solid-js";

type SearchFieldProps = {
    placeholder?: string,
    onSearch: (searchText: string) => void,
}

const SearchField = (props: SearchFieldProps) => {
    const [searchText, setSearchText] = createSignal("")

    const handleSearch = () => {
        if (searchText().trim() !== "") {
            props.onSearch(searchText().trim())
        }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === "F3") {
            e.preventDefault()
            handleSearch()
        }
    }

    // Global F3 handler
    onMount(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.key === "F3") {
                e.preventDefault()
                handleSearch()
            }
        }
        window.addEventListener("keydown", handleGlobalKeyDown)
        onCleanup(() => window.removeEventListener("keydown", handleGlobalKeyDown))
    })

    return (
        <div class="flex">
            <input
                type="text"
                placeholder={props.placeholder ?? "Search..."}
                class="px-3 py-1 border border-gray-300 rounded-l text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={searchText()}
                onInput={(e) => setSearchText(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
            />
            <button
                onClick={handleSearch}
                disabled={searchText().trim() === ""}
                class="px-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-100"
                title="Search (F3)"
            >
                <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </button>
        </div>
    )
}

export default SearchField
