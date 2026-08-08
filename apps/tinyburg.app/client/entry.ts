import "./styles/global.css";

import { Runtime } from "foldkit";

import { BackendLive } from "./backend.ts";
import { ChangedUrl, ClickedLink, Model, init, update, view, viewTransition } from "./main.ts";

const application = Runtime.makeApplication({
    Model,
    init,
    update,
    view,
    viewTransition,
    container: document.getElementById("root"),
    resources: BackendLive,
    routing: {
        onUrlRequest: (request) => ClickedLink({ request }),
        onUrlChange: (url) => ChangedUrl({ url }),
    },
});

Runtime.run(application);
