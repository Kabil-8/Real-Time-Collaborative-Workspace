import React, { useState } from "react";
import Sidebar from "./Sidebar";
import CreateWorkspaceModal from "../workspace/CreateWorkspaceModal";
import { useWorkspace } from "../../context/WorkspaceContext";

export default function AppShell({ children }) {
  const [modalOpen, setModalOpen] = useState(false);
  const { current } = useWorkspace();
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar onCreateWorkspace={() => setModalOpen(true)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="text-sm text-slate-500">{current ? current.name : "No workspace selected"}</div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
      {modalOpen && <CreateWorkspaceModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}