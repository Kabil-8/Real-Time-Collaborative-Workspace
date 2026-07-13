import React, { useState } from "react";
import Sidebar from "./Sidebar";
import CreateWorkspaceModal from "../workspace/CreateWorkspaceModal";
import { useWorkspace } from "../../context/WorkspaceContext";

export default function AppShell({ children }) {
  const [modalOpen, setModalOpen] = useState(false);
  const { current } = useWorkspace();
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50/70">
      <Sidebar onCreateWorkspace={() => setModalOpen(true)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/75 px-6 backdrop-blur-xl">
          <div><div className="text-[11px] font-semibold uppercase tracking-[.16em] text-brand-600">Workspace</div><div className="mt-0.5 text-sm font-semibold text-slate-700">{current ? current.name : "No workspace selected"}</div></div>
          <div className="hidden rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 sm:block">Live collaboration</div>
        </header>
        <main className="flex-1 overflow-auto p-6 lg:p-8"><div className="page-enter">{children}</div></main>
      </div>
      {modalOpen && <CreateWorkspaceModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
