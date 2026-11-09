import { Counter } from "./Counter.js";
import { usePageContext } from "vike-react/usePageContext";

export default function Page() {
    const { user } = usePageContext();
    return (
        <>
            <h1>My Vike app</h1>
            {user && (
                <p>
                    Signed in as <strong>{user.name}</strong> ({user.email}).
                </p>
            )}
            <p>This page is:</p>
            <ul>
                <li>Rendered to HTML.</li>
                <li>
                    Interactive. <Counter />
                </li>
            </ul>
        </>
    );
}
