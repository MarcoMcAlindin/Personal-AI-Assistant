import { useState } from "react";
import { useOutletContext } from "react-router";
import { Menu, FileText, Upload } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { BurgerMenu } from "./BurgerMenu";
import { Sidebar } from "./Sidebar";

export function AIDocumentView() {
  const { isMobile } = useOutletContext<{ isMobile: boolean }>();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={`${isMobile ? 'pt-16 pb-8' : 'pl-64'} min-h-screen`}>
      {!isMobile && <Sidebar />}
      <BurgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className={`${isMobile ? 'p-4' : 'p-8'}`}>
        <header className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1 w-12 bg-gradient-to-r from-[#00FFFF] to-transparent rounded-full"></div>
                <span className="text-xs font-semibold text-[#BBC9CD] uppercase tracking-widest">
                  Document AI
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#DAE2FD] tracking-tight">
                Document Processing
              </h1>
              <p className="text-[#BBC9CD] mt-1">Extract insights and summarize documents</p>
            </div>

            {isMobile && (
              <button
                onClick={() => setMenuOpen(true)}
                className="p-3 rounded-xl bg-[#1A1A1A]/50 hover:bg-[#1A1A1A] text-[#BBC9CD] hover:text-[#00FFFF] transition-colors border border-[#00FFFF]/20"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
          </div>
        </header>

        {/* Upload Area */}
        <GlassCard className="!p-8 mb-6 text-center">
          <div className="p-4 rounded-lg bg-[#00FFFF]/10 inline-flex mb-4">
            <Upload className="w-8 h-8 text-[#00FFFF]" />
          </div>
          <h3 className="text-xl font-bold text-[#DAE2FD] mb-2">Upload Documents</h3>
          <p className="text-[#BBC9CD] mb-4">Drag and drop files or click to browse</p>
          <button className="px-6 py-3 bg-gradient-to-r from-[#00FFFF] to-[#0099CC] text-[#0A0A0A] font-bold rounded-lg hover:shadow-[0_0_30px_rgba(0,255,255,0.4)] transition-all">
            Choose Files
          </button>
        </GlassCard>

        {/* Recent Documents */}
        <div>
          <h2 className="text-lg font-bold text-[#DAE2FD] mb-4">Recent Documents</h2>
          <div className="grid gap-4">
            {[
              { name: "Q4_Report.pdf", pages: 24, status: "Analyzed" },
              { name: "Contract_Draft.docx", pages: 12, status: "Processing" },
              { name: "Meeting_Notes.txt", pages: 3, status: "Complete" }
            ].map((doc) => (
              <GlassCard key={doc.name} className="!p-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-[#00FFFF]/10">
                    <FileText className="w-6 h-6 text-[#00FFFF]" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-[#DAE2FD]">{doc.name}</div>
                    <div className="text-sm text-[#BBC9CD]">{doc.pages} pages</div>
                  </div>
                  <span className="text-xs px-3 py-1 bg-green-500/10 text-green-400 rounded-md">
                    {doc.status}
                  </span>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
