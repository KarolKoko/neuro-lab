import type { Config } from "vike/types";
import vikeReact from "vike-react/config";
import vikeReactStyledComponents from "vike-react-styled-components/config";

// Default config (can be overridden by pages)
// https://vike.dev/config

const config: Config = {
    // https://vike.dev/head-tags
    title: "My Vike App",
    description: "Demo showcasing Vike",

    // Make pageContext.user available on the client-side, see https://vike.dev/passToClient
    passToClient: ["user"],

    extends: [vikeReact, vikeReactStyledComponents],
};

export default config;
