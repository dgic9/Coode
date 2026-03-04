import React, { useState, useRef } from 'react';
import { Icons } from './Icons';
import { GeneratedFile } from '../types';
import { readProjectZip } from '../utils/zipUtils';

interface FloatingInputProps {
  onSubmit: (projectName: string, stack: string) => void;
  onEnhance: (files: GeneratedFile[], instructions: string, projectName: string) => void;
  isLoading: boolean;
}

const TECH_STACKS = [
  { id: 'react-node', label: 'React + Node', icon: '⚡' },
  { id: 'esp32', label: 'ESP32 / IoT', icon: '🤖' },
  { id: 'nextjs', label: 'Next.js', icon: '▲' },
  { id: 'python-fastapi', label: 'Python FastAPI', icon: '🐍' },
  { id: 'vue-firebase', label: 'Vue + Firebase', icon: '🔥' },
  { id: 'flutter', label: 'Flutter', icon: '💙' },
  { id: 'vanilla', label: 'HTML/CSS/JS', icon: '🌐' },
];

export const FloatingInput: React.FC<FloatingInputProps> = ({ onSubmit, onEnhance, isLoading }) => {
  const [mode, setMode] = useState<'create' | 'enhance'>('create');
  
  // Create Mode State
  const [value, setValue] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [selectedStack, setSelectedStack] = useState(TECH_STACKS[0].id);
  
  // Enhance Mode State
  const [uploadedFiles, setUploadedFiles] = useState<GeneratedFile[]>([]);
  const [uploadName, setUploadName] = useState<string>('');
  const [instructions, setInstructions] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value, selectedStack);
    }
  };

  const handleEnhanceSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (uploadedFiles.length > 0) {
          onEnhance(uploadedFiles, instructions, uploadName || 'Enhanced Project');
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
          const { files, guessedName } = await readProjectZip(file);
          setUploadedFiles(files);
          setUploadName(guessedName);
      } catch (error) {
          console.error("Error reading zip", error);
          alert("Failed to read zip file. Ensure it contains text files.");
      }
  };

  return (
    <div className="w-full max-w-lg mx-auto relative z-20">
      
      {/* Mode Switcher */}
      <div className="flex justify-center mb-6 gap-2">
        <button
            onClick={() => setMode('create')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                mode === 'create' 
                ? 'bg-md-primary text-black shadow-[0_0_15px_rgba(3,218,198,0.3)]' 
                : 'bg-md-surfaceVariant text-gray-400 hover:text-white border border-gray-700'
            }`}
        >
            <span className="flex items-center gap-2"><Icons.Sparkles size={16} /> New Design</span>
        </button>
        <button
            onClick={() => setMode('enhance')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                mode === 'enhance' 
                ? 'bg-md-secondary text-black shadow-[0_0_15px_rgba(187,134,252,0.3)]' 
                : 'bg-md-surfaceVariant text-gray-400 hover:text-white border border-gray-700'
            }`}
        >
            <span className="flex items-center gap-2"><Icons.UploadCloud size={16} /> Enhance</span>
        </button>
      </div>

      {mode === 'create' ? (
        // CREATE FORM
        <form onSubmit={handleGenerateSubmit} className="relative flex flex-col gap-4 animate-fade-in-up">
            <div className="bg-md-surfaceVariant rounded-[20px] shadow-2xl border border-gray-700 p-2 transition-all duration-300 focus-within:border-md-primary focus-within:ring-1 focus-within:ring-md-primary/50">
                <div className="relative">
                    <input
                    type="text"
                    id="projectName"
                    className="block w-full px-4 pt-6 pb-2 text-lg bg-transparent appearance-none text-md-onSurface focus:outline-none peer placeholder-transparent"
                    placeholder="Project Name"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    disabled={isLoading}
                    autoComplete="off"
                    />
                    <label
                    htmlFor="projectName"
                    className="absolute text-md text-gray-400 duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 peer-focus:text-md-primary"
                    >
                    Project Name
                    </label>
                    
                    <button
                        type="button"
                        onClick={() => setShowOptions(!showOptions)}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${showOptions ? 'bg-md-primary text-black' : 'hover:bg-white/10 text-gray-400'}`}
                        title="Select Tech Stack"
                    >
                        <Icons.SlidersHorizontal size={20} />
                    </button>
                </div>
                
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showOptions ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                    <div className="px-2 pb-2">
                        <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Target Architecture</p>
                        <div className="flex flex-wrap gap-2">
                            {TECH_STACKS.map(stack => (
                                <button
                                    key={stack.id}
                                    type="button"
                                    onClick={() => setSelectedStack(stack.id)}
                                    className={`text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${
                                        selectedStack === stack.id 
                                        ? 'bg-md-primary/20 border-md-primary text-md-primary' 
                                        : 'border-gray-600 text-gray-400 hover:border-gray-500'
                                    }`}
                                >
                                    <span>{stack.icon}</span>
                                    {stack.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <button
                type="submit"
                disabled={isLoading || !value.trim()}
                className={`
                    mx-auto
                    flex items-center justify-center gap-2 
                    py-4 px-10 rounded-[24px] 
                    bg-gradient-to-r from-md-primary to-md-primaryVariant
                    text-[#121212] font-bold text-lg tracking-wide shadow-lg shadow-md-primary/20
                    transition-all duration-300 transform 
                    ${isLoading ? 'opacity-90 cursor-not-allowed scale-95' : 'hover:scale-105 hover:shadow-xl active:scale-95'}
                `}
            >
                {isLoading ? (
                    <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#121212]"></div>
                    <span className="animate-pulse">Deep Architecting...</span>
                    </>
                ) : (
                    <>
                    <Icons.Sparkles size={20} />
                    <span>Generate Blueprint</span>
                    </>
                )}
            </button>
        </form>
      ) : (
        // ENHANCE FORM
        <form onSubmit={handleEnhanceSubmit} className="relative flex flex-col gap-4 animate-fade-in-up">
            <div className="bg-md-surfaceVariant rounded-[20px] shadow-2xl border border-gray-700 p-4 transition-all duration-300">
                <input 
                    type="file" 
                    ref={fileInputRef}
                    accept=".zip"
                    onChange={handleFileUpload}
                    className="hidden"
                />
                
                {uploadedFiles.length === 0 ? (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-600 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-md-secondary hover:bg-white/5 transition-all text-gray-400 hover:text-white"
                    >
                        <Icons.UploadCloud size={32} className="mb-2" />
                        <span className="font-medium">Upload Project (.zip)</span>
                        <span className="text-xs text-gray-500 mt-1">Text files only, max 5MB</span>
                    </div>
                ) : (
                     <div className="bg-md-secondary/10 border border-md-secondary rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Icons.FileCode className="text-md-secondary" />
                            <div>
                                <div className="font-bold text-white text-sm">{uploadName}.zip</div>
                                <div className="text-xs text-gray-400">{uploadedFiles.length} files extracted</div>
                            </div>
                        </div>
                        <button 
                            type="button" 
                            onClick={() => { setUploadedFiles([]); setUploadName(''); }}
                            className="p-1 hover:bg-white/10 rounded-full"
                        >
                            <Icons.X size={18} className="text-gray-400 hover:text-white" />
                        </button>
                     </div>
                )}

                <div className="mt-4">
                     <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 block">Instructions (Optional)</label>
                     <textarea 
                        className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-gray-200 focus:border-md-secondary focus:outline-none resize-none h-24"
                        placeholder="e.g. Fix bugs, add TypeScript types, improve CSS..."
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                     />
                </div>
            </div>

            <button
                type="submit"
                disabled={isLoading || uploadedFiles.length === 0}
                className={`
                    mx-auto
                    flex items-center justify-center gap-2 
                    py-4 px-10 rounded-[24px] 
                    bg-gradient-to-r from-md-secondary to-md-secondary/70
                    text-[#121212] font-bold text-lg tracking-wide shadow-lg shadow-md-secondary/20
                    transition-all duration-300 transform 
                    ${isLoading || uploadedFiles.length === 0 ? 'opacity-70 cursor-not-allowed scale-95' : 'hover:scale-105 hover:shadow-xl active:scale-95'}
                `}
            >
                {isLoading ? (
                    <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#121212]"></div>
                    <span className="animate-pulse">Analyzing Code...</span>
                    </>
                ) : (
                    <>
                    <Icons.FileUp size={20} />
                    <span>Analyze & Enhance</span>
                    </>
                )}
            </button>
        </form>
      )}
    </div>
  );
};