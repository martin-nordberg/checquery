import {onMount} from "solid-js";
import {wsClient} from "./ws/WsClient";

function App(props: any) {
    onMount(() => {
        wsClient.connect('ws://localhost:3001/ws')
    })

    return (
        <>
            {props.children}
        </>
    )
}

export default App

