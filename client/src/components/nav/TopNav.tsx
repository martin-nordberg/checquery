import {A} from "@solidjs/router";
import type {JSXElement} from "solid-js";

type TopNavProps = {
    children?: JSXElement
}

const TopNav = (props: TopNavProps) => {
    return (
        <nav class="flex p-1" aria-label="Breadcrumb">
            <ol class="inline-flex items-center space-x-1">
                <li class="font-bold text-xl text-blue-700 p-1">
                    <A class="hover:underline" href="/">Checquery</A>
                </li>
                {props.children}
            </ol>
        </nav>
    )
}

export default TopNav

