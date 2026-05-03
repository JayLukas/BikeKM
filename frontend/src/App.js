import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <div className="App min-h-screen bg-[#09090B] text-white">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#121214",
            border: "1px solid #27272a",
            borderRadius: "0px",
            color: "#fff",
            fontFamily: "Inter, sans-serif",
          },
        }}
      />
    </div>
  );
}

export default App;
