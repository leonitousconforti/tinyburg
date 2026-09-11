import "./styles/global.css";

import { Runtime } from "foldkit";

import { BackendLive } from "./backend.ts";
import { Model, NavigationMessage, init, initialLanguage, update, view } from "./main.ts";

const application = Runtime.makeApplication({
    Model,
    init,
    update,
    view,
    container: document.getElementById("root"),
    resources: BackendLive,
    routing: {
        onUrlRequest: (request) => NavigationMessage.ClickedLink({ request }),
        onUrlChange: (url) => NavigationMessage.ChangedUrl({ url }),
    },
});

// index.html is served statically, so the document language can only be
// corrected here, once the negotiated answer is known.
document.documentElement.lang = initialLanguage;

Runtime.run(application);
