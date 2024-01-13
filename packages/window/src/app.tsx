import ReactDOM from "react-dom/client";

import "./app.css";
import Emulator from "./components/Emulator.js";

const root: ReactDOM.Root = ReactDOM.createRoot(document.querySelector("#root") as HTMLElement);
const address: string = new URLSearchParams(window.location.search).get("address") || "";
root.render(<Emulator address={address} />);
