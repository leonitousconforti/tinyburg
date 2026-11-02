import "./styles/global.css";

import { Runtime } from "foldkit";

import { BackendLive } from "./backend.ts";
import { Flags, Model, init, routing, update, view, viewTransition } from "./main.ts";

const application = Runtime.makeApplication({
    Model,
    Flags,
    init,
    update,
    view,
    viewTransition,
    container: document.getElementById("root"),
    resources: BackendLive,
    routing,
});

// The server rendered this page (entry.server.ts): adopt its DOM, starting
// from the Flags it embedded, rather than building the page again.
Runtime.hydrate(application);
