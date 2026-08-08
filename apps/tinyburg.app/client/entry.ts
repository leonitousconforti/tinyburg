import "./styles/global.css";

import { Runtime } from "foldkit";

import { BackendLive } from "./backend.ts";
import { ChangedUrl, ClickedLink, init, initialLanguage, Model, update, view, viewTransition } from "./main.ts";

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

// index.html is served statically, so its `lang` can only be corrected here.
document.documentElement.lang = initialLanguage;

Runtime.run(application);
