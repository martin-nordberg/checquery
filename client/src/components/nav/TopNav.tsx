import {A} from "@solidjs/router";

function TopNav() {
    return (
        <>
            <nav class="font-bold text-xl text-blue-700 p-1">
                <A class="hover:underline" href="/">Checquery</A>
            </nav>
        </>
    )
}

export default TopNav

