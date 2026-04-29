import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";

// 统一启动应用，由应用内部根据 runtimeMode 决定使用真实数据或演示数据
createRoot(document.getElementById("root")!).render(
  <AppWrapper>
    <App />
  </AppWrapper>
);
