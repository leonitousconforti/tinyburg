import ReactDOM from "react-dom/client";

import "./app.css";
import Emulator from "./components/Emulator.js";

const root: ReactDOM.Root = ReactDOM.createRoot(document.querySelector("#root") as HTMLElement);
root.render(<Emulator address={new URLSearchParams(window.location.search).get("address") || ""} />);
