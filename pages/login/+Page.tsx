import { useData } from "vike-react/useData";
import type { Data } from "./+data.js";
import bg from '../../assets/bg.jpg'

export default function Page() {
    const { redirectTo, alreadyLoggedIn } = useData<Data>();
    const loginUrl = `/api/auth/login?redirect=${encodeURIComponent(redirectTo)}`;

    return (
        <div
            className="flex flex-col items-center justify-center gap-4 max-w pt-3 bg-cover bg-center"
            style={{ backgroundImage: `url(${bg})`, height: "100vh" }}
        >
            <div className="rounded-lg bg-white/70 p-8 shadow-xl">
                <h1>Zaloguj się</h1>
                {alreadyLoggedIn ? (
                    <p>
                        Zalogowano, <a href={redirectTo}>Kontynuuj</a>.
                    </p>
                ) : (
                    <>
                        <p className="pb-2">Logowanie odbywa sie za pośrednictwem serwisu OAuth.</p>
                        <a
                            href={loginUrl}
                            className="px-4 py-2 rounded bg-blue-600 text-white no-underline hover:bg-blue-700"
                        >
                            Kliknij, aby przejść do logowania
                        </a>
                    </>
                )}
            </div>
        </div>
    );
}
