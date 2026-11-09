import "./Layout.css";
import "./tailwind.css";
import logoUrl from "../assets/logo.svg";
import { Link } from "../components/Link";
import { usePageContext } from "vike-react/usePageContext";
import brandLogo from '../assets/logo_NEUROLAB.png'
import React from "react";
import bg from '../assets/bg-dashboard.svg'
import settingsIcon from '../assets/settings-icon.svg'

export default function Layout({ children }: { children: React.ReactNode }) {
    const { user } = usePageContext();
    if (!user) return <Content>{children}</Content>;    
    return (
        <div className={"bg-cover bg-center bg-fixed"} style={{ backgroundImage: `url(${bg})` }}>
            <div className="flex flex-col max-w-5xl m-auto ">
                <TopNav user={user} />
                <SubNav />
                <Content>{children}</Content>
            </div>
        </div>
    );
}

function UserStatus({ user }: { user: { name: string } }) {
    return (
        <div>
            <p>
                Witaj, <strong>{user.name}</strong>
            </p>
            <a href="/api/auth/logout">Wyloguj się</a>
        </div>
    );
}

function TopNav ({ user }: { user: { name: string } }) {
    return (
        <div className={"relative mt-3 px-5 py-2 flex justify-between items-center bg-sky-800/40 rounded-xl"} 
        >
            <img src={brandLogo} alt="NeuroLab" className="max-w-3xs" style={{maxWidth: "200px"}} />
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
            className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-sky-900/20 px-4 py-2"
        >
            {links.map(({ href, label }) => {
                return (
                    <a
                        key={href}
                        href={href}
                        className="rounded-full px-4 py-2 text-sm font-semibold text-sky-950 transition-colors hover:bg-white/50"
                    >
                        {label}
                    </a>
                );
            })}
        </nav>
    );
}

function Content({ children }: { children: React.ReactNode }) {
    return (
        <div id="page-container">
            <div id="page-content" className={"min-h-screen"}>
                {children}
            </div>
        </div>
    );
}