import { useData } from "vike-react/useData";
import type { Data } from "./+data.js";
import bg from '../../assets/bg.jpg'

export default function Page() {
    const { redirectTo, alreadyLoggedIn } = useData<Data>();
    const loginUrl = `/api/auth/login?redirect=${encodeURIComponent(redirectTo)}`;

    return (
        <div
            className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cover bg-center p-4"
            style={{ backgroundImage: `url(${bg})`, minHeight: "100dvh" }}
        >
            <div className="w-full max-w-md rounded-lg bg-white/70 p-5 shadow-xl sm:p-8">
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
                            className="inline-flex min-h-11 items-center rounded bg-blue-600 px-4 py-2 text-white no-underline hover:bg-blue-700"
                        >
                            Kliknij, aby przejść do logowania
                        </a>
                    </>
                )}
            </div>
        </div>
    );
}
