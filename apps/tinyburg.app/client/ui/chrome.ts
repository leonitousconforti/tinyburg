import type { Html, HtmlBuilder } from "foldkit/html";

// The shared page furniture moved to the component library; this module
// re-exports it so pages keep their one import site, and keeps what is
// genuinely this app's own.
export { appBackLink, articleBackLink, articleHeading, bullet } from "@tinyburg/shared-ui/Chrome";

/** The drifting cloud background. Rendered once in the app shell so the
 *  animation keeps its place across route changes. */
export const clouds = <M>(h: HtmlBuilder<M>): Html =>
    h.div(
        [h.Class("clouds")],
        [
            h.div([h.Class("cloud cloud-1")], []),
            h.div([h.Class("cloud cloud-2")], []),
            h.div([h.Class("cloud cloud-3")], []),
        ]
    );
