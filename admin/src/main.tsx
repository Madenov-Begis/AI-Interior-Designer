import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/charts/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/nprogress/styles.css";
import "./app/global.css";
import { createRoot } from "react-dom/client";
import { Providers } from "./app/providers";
import { AppRouter } from "./app/router";

createRoot(document.getElementById("root")!).render(<Providers><AppRouter /></Providers>);
