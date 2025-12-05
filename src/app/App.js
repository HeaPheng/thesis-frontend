import React, { useState } from "react";
import AppRoutes from "../routes/AppRoutes";
import ScrollToTop from "../components/ScrollToTop";
import "bootstrap/dist/css/bootstrap.min.css";

function App() {
  const [lang, setLang] = useState("en");

  return (
    <>
      <ScrollToTop />
      <AppRoutes lang={lang} setLang={setLang} />
    </>
  );
  
}

export default App;
