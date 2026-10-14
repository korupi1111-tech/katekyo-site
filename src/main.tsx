import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AdminVerificationReviewPage } from "./components/AdminVerificationReviewPage";

// 管理画面は通常導線へ露出せず、ログイン済みの管理者だけが直接開く。
const rootView = window.location.hash === "#admin-verification-review" ? <AdminVerificationReviewPage /> : <App />;
ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode>{rootView}</React.StrictMode>);
