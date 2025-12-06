import TopNav from "./components/nav/TopNav.tsx";

function App(props: any) {
    return (
        <>
            <TopNav/>
            <main class="p-2">
                {props.children}
            </main>
        </>
    )
}

export default App

