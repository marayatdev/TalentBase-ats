import React from "react";
import ReactDOM from "react-dom/client";

import Popup from "./popup/Popup";
// หรือ "./Popup" ตามตำแหน่งไฟล์จริง

ReactDOM.createRoot(
  document.getElementById("root")!,
).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
);