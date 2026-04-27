import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import Upload from "./pages/Upload";
import Correct from "./pages/Correct";
import List from "./pages/List";

function App() {
  return (
    <BrowserRouter>
      <header className="app-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "4px" }}>
          <img src="/logo.png" alt="Handa Uncle Logo" style={{ height: "32px", width: "auto" }} />
          <h1 style={{ margin: 0 }}>Handa Uncle</h1>
        </div>
        <p className="subtitle">Receipt Parser</p>
        <nav className="app-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Upload
          </NavLink>
          <NavLink
            to="/receipts"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Receipts
          </NavLink>
        </nav>
      </header>

      <main className="app-container">
        <Routes>
          <Route path="/" element={<Upload />} />
          <Route path="/correct" element={<Correct />} />
          <Route path="/receipts" element={<List />} />
          <Route path="/receipts/:id" element={<Correct />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
