import "./Layout.css";
import "./tailwind.css";
import logoUrl from "../assets/logo.svg";
import { Link } from "../components/Link";
import { usePageContext } from "vike-react/usePageContext";
import brandLogo from '../assets/logo_NEUROLAB.png'
import React from "react";
import bg from '../assets/bg-dashboard.svg'
import settingsIcon from '../assets/settings-icon.svg'
import trashIcon from '../assets/trash.svg'

export default function Layout({ children }: { children: React.ReactNode }) {
    const { user } = usePageContext();
    if (!user) return <Content>{children}</Content>;    
    return (
        <div className={"bg-cover bg-center bg-fixed"} style={{ backgroundImage: `url(${bg})` }}>
            <div className="mx-auto flex w-full max-w-5xl min-w-0 flex-col px-3 sm:px-5 lg:px-0">
                <TopNav user={user} />
                <SubNav />
                <Content>{children}</Content>
            </div>
        </div>
    );
}

function UserStatus({ user }: { user: { name: string } }) {
    return (
        <div className="min-w-0 break-words text-sm sm:text-base">
            <p>
                Witaj, <strong>{user.name}</strong>
            </p>
            <a href="/api/auth/logout">Wyloguj się</a>
        </div>
    );
}

function TopNav ({ user }: { user: { name: string } }) {
    return (
        <div className={"relative mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sky-800/40 px-4 py-3 sm:px-5"}
        >
            <img src={brandLogo} alt="NeuroLab" className="w-36 max-w-full sm:w-48" />
            <UserStatus user={user} />
        </div>
    )
}

function SubNav() {
    const links = [
        { href: "/", label: "Home" },
        { href: "/formTemplates", label: "Moje formularze" },
        { href: "/newPatient", label: "Nowy pacjent" },
        { href: "/patients", label: "Pacjenci" },
    ];

    return (
        <nav
            aria-label="Podmenu"
            className="mt-2 flex flex-wrap items-center gap-1 rounded-xl bg-sky-900/20 px-2 py-2 sm:gap-2 sm:px-4"
        >
            {links.map(({ href, label }) => {
                return (
                    <a
                        key={href}
                        href={href}
                        className="inline-flex min-h-11 items-center rounded-full px-3 py-2 text-sm font-semibold text-sky-950 transition-colors hover:bg-white/50 sm:px-4"
                    >
                        {label}
                    </a>
                );
            })}
            <a href="/trash" aria-label="Kosz" title="Kosz" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 transition-colors hover:bg-white/50">
                <img src={trashIcon} alt="" className="h-6 w-6" />
            </a>
        </nav>
    );
}

function Content({ children }: { children: React.ReactNode }) {
    return (
        <div id="page-container" className="min-w-0">
            <div id="page-content" className={"min-h-screen"}>
                {children}
            </div>
        </div>
    );
}