import React from "react";
import ReactDOM from "react-dom/client";

import "./app.css";
import Emulator from "./components/Emulator.js";

const root: ReactDOM.Root = ReactDOM.createRoot(document.querySelector("#root") as HTMLElement);
root.render(
    <React.StrictMode>
        <Emulator address="http://10.0.0.83:32949" />
    </React.StrictMode>
);
