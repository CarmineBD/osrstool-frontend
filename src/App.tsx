// src/App.tsx
import React from "react";
import { MethodsList } from "@/features/methods/MethodsList";

function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-2xl font-bold mb-6">OSRS Moneymaking Methods</h1>
      <MethodsList />
    </div>
  );
}

export default App;
