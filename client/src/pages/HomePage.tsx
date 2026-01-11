import {A} from "@solidjs/router";

export const HomePage = () => {
    return (
        <ul>
            <li>
                <A class="hover:underline" href="./accounts">
                    Summary of Accounts
                </A>
            </li>
        </ul>
    )
}