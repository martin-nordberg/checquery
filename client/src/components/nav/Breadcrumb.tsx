import type {JSXElement} from "solid-js";


type BreadcrumbProps = {
    children?: JSXElement;
}

const Breadcrumb = (props: BreadcrumbProps) => {
    return (
        <li class="before:content-['>'] before:mr-2 before:text-gray-400 font-bold text-xl text-blue-700 p-1">
            {props.children}
        </li>
    )
}

export default Breadcrumb
