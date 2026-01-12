
/// <reference types="react" />
import React, { useState, useCallback, useMemo } from 'react';
import { Upload, FileText, Search, Download, AlertCircle, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { AppStatus, ParagraphMetadata, DocContext } from './types';
import { DocxService } from './services/docxService';

export default function App() {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<ParagraphMetadata[]>([]);
  const [context, setContext] = useState<DocContext | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.endsWith('.docx')) {
      setError('Please upload a valid .docx file.');
      return;
    }

    setFile(uploadedFile);
    setStatus(AppStatus.LOADING);
    setError(null);

    try {
      const { context, metadata } = await DocxService.parseDocx(uploadedFile);
      setContext(context);
      setMetadata(metadata);
      setStatus(AppStatus.LOADED);
    } catch (err) {
      setError('Failed to parse document. Is it a valid Word file?');
      setStatus(AppStatus.ERROR);
    }
  };

  const filteredMetadata = useMemo(() => {
    if (!searchTerm.trim()) return metadata;
    const lowerSearch = searchTerm.toLowerCase();
    return metadata.filter(m => m.text.toLowerCase().includes(lowerSearch));
  }, [metadata, searchTerm]);

  const handleProcess = async () => {
    if (selectedIndex === null || !context) return;
    setStatus(AppStatus.PROCESSING);
    
    try {
      const blob = await DocxService.injectContinuousBreak(context, selectedIndex);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file?.name.replace('.docx', '')}-modified.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setStatus(AppStatus.SUCCESS);
    } catch (err) {
      setError('An error occurred while processing the file.');
      setStatus(AppStatus.ERROR);
    }
  };

  const reset = () => {
    setFile(null);
    setMetadata([]);
    setContext(null);
    setSelectedIndex(null);
    setSearchTerm('');
    setError(null);
    setStatus(AppStatus.IDLE);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-4xl mb-8 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-blue-600 text-white rounded-2xl shadow-lg mb-4">
          <FileText size={32} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Docx file Section Break Injector</h1>
        <p className="text-slate-500 mt-2">Inject continuous section breaks into Word documents with precision.</p>
      </header>

      <main className="w-full max-w-4xl bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        {status === AppStatus.IDLE && (
          <div className="p-12">
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-12 h-12 text-slate-400 mb-4" />
                <p className="mb-2 text-sm text-slate-700">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-500">Microsoft Word (.docx) files only</p>
              </div>
              <input type="file" className="hidden" accept=".docx" onChange={handleFileUpload} />
            </label>
          </div>
        )}

        {(status === AppStatus.LOADING || status === AppStatus.PROCESSING) && (
          <div className="p-20 flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-slate-600 font-medium">
              {status === AppStatus.LOADING ? 'Analyzing document structure...' : 'Injecting section breaks...'}
            </p>
          </div>
        )}

        {status === AppStatus.LOADED && (
          <div className="flex flex-col h-[600px]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{file?.name}</h3>
                  <p className="text-xs text-slate-500">{metadata.length} paragraphs detected</p>
                </div>
              </div>
              <button 
                onClick={reset}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 bg-white border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Search for text within paragraphs..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">
                Select paragraph to inject break AFTER
              </div>
              {filteredMetadata.map((item) => (
                <button
                  key={item.index}
                  onClick={() => setSelectedIndex(item.index)}
                  className={`w-full text-left p-4 rounded-xl border transition-all group flex items-start space-x-4 ${
                    selectedIndex === item.index 
                      ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' 
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                    selectedIndex === item.index ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    P{item.index + 1}
                  </span>
                  <p className="flex-1 text-sm text-slate-700 line-clamp-2 leading-relaxed">
                    {item.text || <span className="italic text-slate-400">(Empty Paragraph)</span>}
                  </p>
                  <ChevronRight size={16} className={`mt-0.5 transition-transform ${selectedIndex === item.index ? 'text-blue-600 translate-x-1' : 'text-slate-300'}`} />
                </button>
              ))}
              {filteredMetadata.length === 0 && (
                <div className="py-12 text-center text-slate-400">
                  <p>No paragraphs matching "{searchTerm}"</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                {selectedIndex !== null ? (
                  <span>Selected paragraph <strong>#{selectedIndex + 1}</strong></span>
                ) : (
                  'Please select a paragraph to continue'
                )}
              </div>
              <button
                disabled={selectedIndex === null}
                onClick={handleProcess}
                className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-semibold shadow-sm transition-all ${
                  selectedIndex !== null 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Download size={18} />
                <span>Process & Download</span>
              </button>
            </div>
          </div>
        )}

        {status === AppStatus.SUCCESS && (
          <div className="p-16 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Success!</h2>
            <p className="text-slate-600 mt-2 mb-8 max-w-sm">
              Continuous section break has been injected. Your modified document has been downloaded.
            </p>
            <button 
              onClick={reset}
              className="px-8 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
            >
              Start New Document
            </button>
          </div>
        )}

        {status === AppStatus.ERROR && (
          <div className="p-16 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
              <AlertCircle size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Something went wrong</h2>
            <p className="text-slate-600 mt-2 mb-8 max-w-sm">{error}</p>
            <button 
              onClick={reset}
              className="px-8 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="mt-8 text-center text-slate-400 text-sm max-w-md">
        <p>This tool processes documents entirely in your browser. No files are uploaded to any server, keeping your data private and secure.</p>
      </footer>
    </div>
  );
}
