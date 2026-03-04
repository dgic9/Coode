import React, { useState, useEffect } from 'react';
import { GeneratedFile, AppSettings } from '../types';
import { Icons } from './Icons';

// Declare global Prism object
declare const Prism: any;

interface CodeCardProps {
  file: GeneratedFile;
  onCopy: (text: string) => void;
  settings: AppSettings;
}

export const CodeCard: React.FC<CodeCardProps> = ({ file, onCopy, settings }) => {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Trigger syntax highlighting when content changes or view changes
    // Only if syntaxHighlight is enabled
    if (typeof Prism !== 'undefined' && settings.syntaxHighlight) {
      Prism.highlightAll();
    }
  }, [file.content, isFullscreen, settings.syntaxHighlight]);

  const handleCopy = () => {
    onCopy(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLanguageClass = (filename: string, lang: string) => {
    if (!settings.syntaxHighlight) return 'language-none';

    const ext = filename.split('.').pop()?.toLowerCase();
    
    if (lang === 'typescript' || ext === 'ts' || ext === 'tsx') return 'language-tsx';
    if (lang === 'javascript' || ext === 'js' || ext === 'jsx') return 'language-jsx';
    if (lang === 'python' || ext === 'py') return 'language-python';
    if (lang === 'css' || ext === 'css') return 'language-css';
    if (lang === 'json' || ext === 'json') return 'language-json';
    if (lang === 'cpp' || ext === 'cpp' || ext === 'c' || ext === 'h' || ext === 'hpp' || ext === 'ino') return 'language-cpp';
    if (ext === 'ini') return 'language-ini';
    return 'language-javascript'; // Default
  };

  const codeStyle = {
    fontSize: `${settings.editorFontSize}px`,
  };

  const codeBlock = (
    <pre 
        className={`font-mono leading-relaxed bg-[#0e0e0e] text-gray-300 p-5 overflow-x-auto ${isFullscreen ? 'h-full' : 'max-h-[400px]'} ${settings.wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'}`}
        style={codeStyle}
    >
      <code className={getLanguageClass(file.path, file.language)}>{file.content}</code>
    </pre>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[60] bg-[#121212] flex flex-col animate-fade-in-up">
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-md-surfaceVariant">
            <div className="flex items-center gap-2">
                 <Icons.FileCode size={20} className="text-md-secondary" />
                 <span className="font-mono text-lg font-bold">{file.path}</span>
            </div>
            <div className="flex gap-2">
                <button onClick={handleCopy} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    {copied ? <Icons.Check size={20} className="text-md-primary"/> : <Icons.Copy size={20} />}
                </button>
                <button onClick={() => setIsFullscreen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                    <Icons.X size={24} />
                </button>
            </div>
        </div>
        <div className="flex-1 overflow-auto bg-[#0e0e0e] p-4">
            {codeBlock}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-md-surfaceVariant rounded-[24px] overflow-hidden shadow-lg border border-gray-800 mb-6 transition-all duration-300 hover:shadow-2xl hover:border-md-primary/30 group">
      <div className="bg-[#1e1e1e] px-5 py-3 flex justify-between items-center border-b border-gray-800">
        <div className="flex items-center gap-2">
            <Icons.FileCode size={18} className="text-md-secondary" />
            <span className="font-mono text-sm text-md-onSurface opacity-80">{file.path}</span>
        </div>
        <div className="flex items-center gap-1">
            <button 
                onClick={() => setIsFullscreen(true)}
                className="p-2 rounded-full hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
                title="Expand"
            >
                <Icons.Maximize2 size={16} />
            </button>
            <button 
                onClick={handleCopy}
                className="p-2 rounded-full hover:bg-white/5 transition-colors text-md-primary"
                title="Copy code"
            >
                {copied ? <Icons.Check size={18} /> : <Icons.Copy size={18} />}
            </button>
        </div>
      </div>
      <div className="relative">
        {codeBlock}
      </div>
    </div>
  );
};