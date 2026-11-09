import { Hono } from "hono"
import { getCookie, setCookie, deleteCookie } from "hono/cookie"
import { clearSession, getSessionUser, setSession } from "./auth"

const app = new Hono()

const OAUTH_FLOW_COOKIE = "oauth_flow"

function requiredEnv(name: string): string {
    const value = process.env[name]
    if (!value) throw new Error(`Missing required environment variable: ${name}`)
    return value
}

interface OidcEndpoints {
    authorization_endpoint: string
    token_endpoint: string
    userinfo_endpoint: string
}

// AUTHENTIK_ISSUER is the provider's issuer URL, e.g. https://auth.example.com/application/o/<slug>/
async function getOidcEndpoints(): Promise<OidcEndpoints> {
    const issuer = requiredEnv("AUTHENTIK_ISSUER").replace(/\/$/, "")
    const response = await fetch(`${issuer}/.well-known/openid-configuration`)
    if (!response.ok) throw new Error("Unable to load Authentik OIDC configuration")
    return await response.json() as OidcEndpoints
}

function getRedirectUri(): string {
    return process.env.AUTHENTIK_REDIRECT_URI
        ?? new URL("/api/auth/callback", requiredEnv("BASE_URL")).toString()
}

// Only allow relative, same-origin paths as a login redirect target to prevent open-redirect attacks.
function sanitizeRedirect(path: string | null | undefined): string {
    if (!path || !path.startsWith("/") || path.startsWith("//")) return "/"
    return path
}

// 1. Session & Auth Routes (Authentik OIDC handshake)
app.get('/api/auth/login', async (c) => {
    const oidcEndpoints = await getOidcEndpoints()
    const clientId = requiredEnv("AUTHENTIK_CLIENT_ID")

    // `state` mitigates CSRF on the OAuth callback; it's paired with the post-login redirect target.
    const state = crypto.randomUUID()
    const redirectTo = sanitizeRedirect(c.req.query("redirect"))

    setCookie(c, OAUTH_FLOW_COOKIE, JSON.stringify({ state, redirectTo }), {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
        maxAge: 60 * 10, // 10 minutes
    })

    const authorizeUrl = new URL(oidcEndpoints.authorization_endpoint)
    authorizeUrl.searchParams.set("client_id", clientId)
    authorizeUrl.searchParams.set("redirect_uri", getRedirectUri())
    authorizeUrl.searchParams.set("response_type", "code")
    authorizeUrl.searchParams.set("scope", process.env.AUTHENTIK_SCOPES ?? "openid profile email")
    authorizeUrl.searchParams.set("state", state)

    return c.redirect(authorizeUrl.toString())
})

app.get('/api/auth/callback', async (c) => {
    const oidcEndpoints = await getOidcEndpoints()
    const clientId = requiredEnv("AUTHENTIK_CLIENT_ID")
    const clientSecret = requiredEnv("AUTHENTIK_CLIENT_SECRET")

    const code = c.req.query('code')
    const returnedState = c.req.query('state')
    const providerError = c.req.query('error_description') ?? c.req.query('error')

    const flowCookie = getCookie(c, OAUTH_FLOW_COOKIE)
    deleteCookie(c, OAUTH_FLOW_COOKIE, { path: "/" })

    let flow: { state: string; redirectTo: string } | undefined
    try {
        flow = flowCookie ? JSON.parse(flowCookie) : undefined
    } catch {
        flow = undefined
    }

    if (providerError) return c.text(`Authentik login failed: ${providerError}`, 400)

    // Reject the callback if the code/state is missing or the state doesn't match what we issued.
    if (!code || !returnedState || !flow || returnedState !== flow.state) {
        return c.text("Invalid or expired login request.", 400)
    }

    // 1. Exchange the authorization code for tokens via Authentik.
    const tokenResponse = await fetch(oidcEndpoints.token_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            code,
            redirect_uri: getRedirectUri(),
        })
    })

    if (!tokenResponse.ok) {
        return c.text("Failed to exchange authorization code.", 502)
    }
    const tokens = await tokenResponse.json()

    // 2. Fetch the user profile using the access token.
    const userResponse = await fetch(oidcEndpoints.userinfo_endpoint, {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
    })

    if (!userResponse.ok) {
        return c.text("Failed to fetch user profile.", 502)
    }
    const profile = await userResponse.json()

    // 3. Store essential profile data in the signed, HTTP-only session cookie
    await setSession(c, {
        id: profile.sub,
        name: profile.name ?? profile.preferred_username ?? profile.email ?? profile.sub,
        email: profile.email ?? "",
    })

    return c.redirect(flow.redirectTo)
})

app.get('/api/auth/logout', (c) => {
    clearSession(c)
    return c.redirect('/login')
})

// Lets client-side code check the current session (e.g. after a background token refresh).
app.get('/api/auth/me', async (c) => {
    const user = await getSessionUser(c)
    return c.json({ user })
})

const HonoInstance = app

export default HonoInstance
