import "./styles/global.css";

import { Runtime } from "foldkit";

import { BackendLive } from "./backend.ts";
import { ChangedUrl, ClickedLink, init, Model, update, view } from "./main.ts";
import { initialLanguage } from "./messages/index.ts";

const application = Runtime.makeApplication({
    Model,
    init,
    update,
    view,
    container: document.getElementById("root"),
    resources: BackendLive,
    routing: {
        onUrlRequest: (request) => ClickedLink({ request }),
        onUrlChange: (url) => ChangedUrl({ url }),
    },
});

// index.html is served statically, so the correct `lang` can only be set here.
document.documentElement.lang = initialLanguage;

Runtime.run(application);
