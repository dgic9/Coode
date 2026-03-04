import React, { useState, useEffect } from 'react';
import { Icons } from './components/Icons';
import { FloatingInput } from './components/FloatingInput';
import { CodeCard } from './components/CodeCard';
import { Toast } from './components/Toast';
import { generateProjectBlueprint, enhanceProjectBlueprint } from './services/geminiService';
import { downloadProjectZip } from './utils/zipUtils';
import { ProjectBlueprint, AppView, HistoryItem, GeneratedFile, AppSettings, ApiProvider } from './types';

// Initial Settings Default
const DEFAULT_SETTINGS: AppSettings = {
  editorFontSize: 14,
  wordWrap: false,
  syntaxHighlight: true,
  autoSave: true,
  showHidden: false,
  
  activeProvider: 'google',
  
  googleApiKey: '',
  
  useCustomApi: false, // Legacy
  openRouterApiKey: '',
  customModelId: 'openrouter/free',

  githubToken: '',
  githubModelId: 'gpt-4o'
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [blueprint, setBlueprint] = useState<ProjectBlueprint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  
  // Settings State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Load history & settings on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('shahid_ai_history');
    if (savedHistory) {
        try {
            setHistory(JSON.parse(savedHistory));
        } catch (e) {
            console.error("Failed to parse history", e);
        }
    }

    const savedSettings = localStorage.getItem('shahid_ai_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        
        // Migration logic for old useCustomApi
        if (parsed.useCustomApi && !parsed.activeProvider) {
            parsed.activeProvider = 'openrouter';
        } else if (!parsed.activeProvider) {
            parsed.activeProvider = 'google';
        }

        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }, []);

  // Save history when it changes (if Auto Save is on)
  useEffect(() => {
    if (settings.autoSave) {
      localStorage.setItem('shahid_ai_history', JSON.stringify(history));
    }
  }, [history, settings.autoSave]);

  // Save settings when they change
  useEffect(() => {
    localStorage.setItem('shahid_ai_settings', JSON.stringify(settings));
  }, [settings]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      setToast({ message, type });
  };

  const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
      showToast('Copied to clipboard', 'success');
  };

  const handleGenerate = async (projectName: string, stackId: string) => {
    setIsLoading(true);
    setError(null);
    setBlueprint(null);
    try {
      const result = await generateProjectBlueprint(projectName, stackId, settings);
      handleSuccess(result, 'Blueprint generated successfully');
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnhance = async (files: GeneratedFile[], instructions: string, projectName: string) => {
      setIsLoading(true);
      setError(null);
      setBlueprint(null);
      try {
          const result = await enhanceProjectBlueprint(files, instructions, projectName, settings);
          handleSuccess(result, 'Project enhanced successfully');
      } catch (err) {
          handleError(err);
      } finally {
          setIsLoading(false);
      }
  };

  const handleSuccess = (result: ProjectBlueprint, msg: string) => {
      setBlueprint(result);
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        projectName: result.projectName,
        blueprint: result
      };
      setHistory(prev => [newHistoryItem, ...prev]);
      showToast(msg, 'success');
  };

  const handleError = (err: unknown) => {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
      showToast(msg, 'error');
  };

  const handleDownload = () => {
    if (blueprint) {
      downloadProjectZip(blueprint.projectName, blueprint.files);
      showToast('Downloading ZIP...', 'info');
    }
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setHistory(prev => prev.filter(item => item.id !== id));
      showToast('History item deleted', 'info');
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Header Content Helper
  const getActiveProviderLabel = () => {
      if (settings.activeProvider === 'github') return 'GitHub Models';
      if (settings.activeProvider === 'openrouter') return 'OpenRouter';
      return 'Gemini Flash Latest';
  };

  const getActiveProviderColor = () => {
      if (settings.activeProvider === 'github') return 'bg-purple-500';
      if (settings.activeProvider === 'openrouter') return 'bg-blue-500';
      // Google Status
      return settings.googleApiKey ? 'bg-green-500' : 'bg-yellow-500';
  };

  const renderContent = () => {
    if (currentView === AppView.HISTORY) {
        return (
            <div className="p-4 pb-24 max-w-3xl mx-auto animate-fade-in-up">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-md-primary">Project History</h2>
                    <span className="text-gray-500 text-sm">{history.length} projects</span>
                 </div>
                 
                 {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-600">
                        <Icons.History size={48} className="mb-4 opacity-50" />
                        <p>No generated blueprints yet.</p>
                    </div>
                 ) : (
                    <div className="space-y-4">
                        {history.map(item => (
                            <div 
                                key={item.id} 
                                onClick={() => {
                                    setBlueprint(item.blueprint);
                                    setCurrentView(AppView.HOME);
                                }}
                                className="bg-md-surfaceVariant hover:bg-[#383838] p-5 rounded-xl border border-gray-700 flex justify-between items-center cursor-pointer transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-md-primary/10 flex items-center justify-center text-md-primary">
                                        <Icons.Code size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-white group-hover:text-md-primary transition-colors">{item.projectName}</h3>
                                        <p className="text-xs text-gray-400">{new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={(e) => deleteHistoryItem(item.id, e)}
                                        className="text-gray-500 hover:text-md-error hover:bg-md-error/10 p-2 rounded-lg transition-colors"
                                    >
                                        <Icons.Trash2 size={18} />
                                    </button>
                                    <Icons.ChevronRight size={20} className="text-gray-600 group-hover:text-white" />
                                </div>
                            </div>
                        ))}
                    </div>
                 )}
            </div>
        )
    }

    if (currentView === AppView.SETTINGS) {
        return (
            <div className="p-4 pb-24 max-w-3xl mx-auto animate-fade-in-up">
                <h2 className="text-2xl font-bold mb-6 text-md-primary">Settings</h2>
                
                <div className="space-y-6">
                    {/* AI Configuration Section */}
                    <div className="bg-md-surfaceVariant p-6 rounded-2xl border border-gray-700">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-400">
                            AI Provider
                        </h3>
                        
                        {/* Provider Selector Tabs */}
                        <div className="flex bg-[#121212] rounded-lg p-1 mb-6">
                            {(['google', 'openrouter', 'github'] as ApiProvider[]).map((provider) => (
                                <button
                                    key={provider}
                                    onClick={() => updateSetting('activeProvider', provider)}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                                        settings.activeProvider === provider 
                                        ? 'bg-md-primary text-black shadow-lg' 
                                        : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    {provider === 'google' && 'Google Gemini'}
                                    {provider === 'openrouter' && 'OpenRouter'}
                                    {provider === 'github' && 'GitHub Models'}
                                </button>
                            ))}
                        </div>

                        {/* Google Settings */}
                        {settings.activeProvider === 'google' && (
                            <div className="space-y-4 animate-fade-in-up">
                                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                                    <p className="text-xs text-blue-300 flex items-start gap-2">
                                        <Icons.Info size={14} className="mt-0.5" />
                                        <span>
                                            Using Model: <strong>gemini-flash-latest</strong>. 
                                        </span>
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs text-md-primary mb-1 ml-1 font-medium">Google Gemini API Key (Recommended)</label>
                                    <div className="flex items-center bg-[#121212] border border-gray-600 rounded-lg overflow-hidden focus-within:border-md-primary transition-colors">
                                        <input 
                                            type="password" 
                                            value={settings.googleApiKey || ''}
                                            onChange={(e) => updateSetting('googleApiKey', e.target.value)}
                                            placeholder="AIzaSy... (Leave empty to use shared key)"
                                            className="w-full bg-transparent p-3 text-gray-300 font-mono text-sm focus:outline-none placeholder-gray-700"
                                        />
                                        <div className="pr-3 text-gray-500">
                                            <Icons.Check size={16} className={settings.googleApiKey ? "text-green-500" : "opacity-0"} />
                                        </div>
                                    </div>
                                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-gray-500 hover:text-white mt-1 ml-1 underline decoration-gray-700">Get a free key here</a>
                                </div>
                            </div>
                        )}

                        {/* OpenRouter Settings */}
                        {settings.activeProvider === 'openrouter' && (
                            <div className="space-y-4 animate-fade-in-up">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1 ml-1">OpenRouter API Key</label>
                                    <div className="flex items-center bg-[#121212] border border-gray-600 rounded-lg overflow-hidden focus-within:border-md-primary transition-colors">
                                        <input 
                                            type="password" 
                                            value={settings.openRouterApiKey}
                                            onChange={(e) => updateSetting('openRouterApiKey', e.target.value)}
                                            placeholder="sk-or-..."
                                            className="w-full bg-transparent p-3 text-gray-300 font-mono text-sm focus:outline-none placeholder-gray-700"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs text-gray-500 mb-1 ml-1">Model ID</label>
                                    <input 
                                        type="text" 
                                        value={settings.customModelId}
                                        onChange={(e) => updateSetting('customModelId', e.target.value)}
                                        placeholder="e.g. openai/gpt-4o, anthropic/claude-3-opus"
                                        className="w-full bg-[#121212] border border-gray-600 rounded-lg p-3 text-gray-300 font-mono text-sm focus:outline-none focus:border-md-primary transition-colors placeholder-gray-700"
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1 ml-1">Check OpenRouter for valid model IDs.</p>
                                </div>
                            </div>
                        )}

                        {/* GitHub Settings */}
                        {settings.activeProvider === 'github' && (
                            <div className="space-y-4 animate-fade-in-up">
                                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 mb-4">
                                    <p className="text-xs text-purple-300 flex items-start gap-2">
                                        <Icons.Info size={14} className="mt-0.5" />
                                        <span>
                                            Access Azure AI models via GitHub. Requires a Personal Access Token (PAT).
                                        </span>
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs text-gray-500 mb-1 ml-1">GitHub Personal Access Token</label>
                                    <div className="flex items-center bg-[#121212] border border-gray-600 rounded-lg overflow-hidden focus-within:border-md-primary transition-colors">
                                        <input 
                                            type="password" 
                                            value={settings.githubToken}
                                            onChange={(e) => updateSetting('githubToken', e.target.value)}
                                            placeholder="github_pat_..."
                                            className="w-full bg-transparent p-3 text-gray-300 font-mono text-sm focus:outline-none placeholder-gray-700"
                                        />
                                    </div>
                                    <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="text-[10px] text-gray-500 hover:text-white mt-1 ml-1 underline decoration-gray-700">Get a token here</a>
                                </div>

                                <div>
                                    <label className="block text-xs text-gray-500 mb-1 ml-1">Model ID</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            value={settings.githubModelId}
                                            onChange={(e) => updateSetting('githubModelId', e.target.value)}
                                            placeholder="gpt-4o"
                                            className="w-full bg-[#121212] border border-gray-600 rounded-lg p-3 text-gray-300 font-mono text-sm focus:outline-none focus:border-md-primary transition-colors placeholder-gray-700"
                                            list="github-models"
                                        />
                                        <datalist id="github-models">
                                            <option value="gpt-4o" />
                                            <option value="gpt-4o-mini" />
                                            <option value="Phi-3-medium-4k-instruct" />
                                            <option value="Mistral-large" />
                                            <option value="Llama-3-70b-instruct" />
                                        </datalist>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1 ml-1">Common: gpt-4o, gpt-4o-mini, Phi-3-medium-4k-instruct</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Editor Settings Section */}
                    <div className="bg-md-surfaceVariant p-6 rounded-2xl border border-gray-700 space-y-6">
                         
                         {/* Slider: Editor Size */}
                         <div>
                            <div className="flex justify-between mb-2">
                                <span className="font-medium text-white">Editor Size</span>
                                <span className="text-md-primary font-mono text-sm">{settings.editorFontSize} sp</span>
                            </div>
                            <input 
                                type="range" 
                                min="10" 
                                max="24" 
                                step="1"
                                value={settings.editorFontSize}
                                onChange={(e) => updateSetting('editorFontSize', parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-md-primary hover:accent-md-primaryVariant"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>|</span><span>|</span><span>|</span><span>|</span><span>|</span>
                            </div>
                         </div>

                         {/* Toggles */}
                         <div className="space-y-1">
                             {/* Word Wrap */}
                             <div className="flex justify-between items-center py-3 border-b border-gray-700/50">
                                <span className="font-medium text-gray-200">Word Wrap</span>
                                <button 
                                    onClick={() => updateSetting('wordWrap', !settings.wordWrap)}
                                    className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${settings.wordWrap ? 'bg-md-primary' : 'bg-gray-600'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-transform duration-200 ${settings.wordWrap ? 'translate-x-7' : 'translate-x-1'}`} />
                                </button>
                             </div>

                             {/* Show Hidden */}
                             <div className="flex justify-between items-center py-3 border-b border-gray-700/50">
                                <span className="font-medium text-gray-200">Show Hidden</span>
                                <button 
                                    onClick={() => updateSetting('showHidden', !settings.showHidden)}
                                    className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${settings.showHidden ? 'bg-md-primary' : 'bg-gray-600'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-transform duration-200 ${settings.showHidden ? 'translate-x-7' : 'translate-x-1'}`} />
                                </button>
                             </div>

                             {/* Syntax Highlight */}
                             <div className="flex justify-between items-center py-3 border-b border-gray-700/50">
                                <span className="font-medium text-gray-200">Syntax Highlight</span>
                                <button 
                                    onClick={() => updateSetting('syntaxHighlight', !settings.syntaxHighlight)}
                                    className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${settings.syntaxHighlight ? 'bg-blue-500' : 'bg-gray-600'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-transform duration-200 ${settings.syntaxHighlight ? 'translate-x-7' : 'translate-x-1'}`} />
                                </button>
                             </div>

                             {/* Auto Save */}
                             <div className="flex justify-between items-center py-3">
                                <span className="font-medium text-gray-200">Auto Save</span>
                                <button 
                                    onClick={() => updateSetting('autoSave', !settings.autoSave)}
                                    className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${settings.autoSave ? 'bg-blue-500' : 'bg-gray-600'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-transform duration-200 ${settings.autoSave ? 'translate-x-7' : 'translate-x-1'}`} />
                                </button>
                             </div>
                         </div>
                    </div>

                    <div className="bg-md-surfaceVariant p-6 rounded-2xl border border-gray-700">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Icons.Info className="text-md-secondary" size={20} />
                            <span>About</span>
                        </h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Shahid_AI Code Architect generates production-ready boilerplates using Google's Gemini API, OpenRouter, or GitHub Models. 
                            Settings are saved locally to your device.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    // HOME VIEW
    return (
      <div className="w-full max-w-4xl mx-auto p-4 pb-24">
        {/* Hero Section */}
        <div className={`transition-all duration-700 ease-in-out ${blueprint ? 'py-6' : 'py-12 md:py-24 flex flex-col items-center justify-center'}`}>
          {!blueprint && (
             <div className="mb-12 text-center animate-fade-in-up">
                <div className="w-24 h-24 bg-gradient-to-tr from-md-surfaceVariant to-[#1e1e1e] rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl border border-white/5 rotate-3 hover:rotate-0 transition-transform duration-500">
                    <Icons.Layers size={48} className="text-md-primary drop-shadow-[0_0_15px_rgba(3,218,198,0.5)]" />
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                    Build Faster with <span className="text-transparent bg-clip-text bg-gradient-to-r from-md-primary to-md-secondary">Shahid_AI</span>
                </h2>
                <p className="text-gray-400 max-w-md mx-auto text-lg">
                    Generate production-ready project blueprints in seconds.
                </p>
             </div>
          )}
          
          <FloatingInput onSubmit={handleGenerate} onEnhance={handleEnhance} isLoading={isLoading} />
        </div>

        {/* Loading Skeleton */}
        {isLoading && !blueprint && (
            <div className="mt-12 space-y-6 animate-pulse-slow max-w-3xl mx-auto">
                <div className="h-40 bg-md-surfaceVariant rounded-2xl w-full"></div>
                <div className="flex gap-4">
                    <div className="h-60 bg-md-surfaceVariant rounded-2xl w-1/3"></div>
                    <div className="h-60 bg-md-surfaceVariant rounded-2xl w-2/3"></div>
                </div>
            </div>
        )}

        {/* Results Section */}
        {blueprint && !isLoading && (
          <div className="animate-fade-in-up mt-6 space-y-8">
            {/* Header Card */}
            <div className="bg-md-surfaceVariant p-6 md:p-8 rounded-[32px] shadow-2xl border border-gray-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 bg-md-primary/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-8 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-3xl font-bold text-white">{blueprint.projectName}</h3>
                            <span className="bg-md-primary/20 text-md-primary text-xs px-2 py-1 rounded-full border border-md-primary/30">Generated</span>
                        </div>
                        <p className="text-gray-400">Architecture Blueprint</p>
                    </div>
                    <button 
                        onClick={handleDownload}
                        className="bg-white text-black hover:bg-gray-200 px-5 py-3 rounded-xl font-bold shadow-lg transition-transform hover:scale-105 flex items-center gap-2"
                    >
                        <Icons.Download size={20} />
                        <span>Download ZIP</span>
                    </button>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6 relative z-10">
                    <div className="md:col-span-2 space-y-4">
                        <h4 className="text-sm font-bold uppercase text-gray-500 tracking-wider">Overview</h4>
                        <p className="text-gray-300 leading-relaxed text-lg font-light border-l-2 border-md-secondary pl-4">
                            {blueprint.description}
                        </p>
                    </div>
                    <div className="bg-[#121212]/80 backdrop-blur-sm p-4 rounded-2xl border border-white/5 h-full">
                        <div className="flex items-center gap-2 mb-3 text-md-primary border-b border-white/10 pb-2">
                            <Icons.FolderTree size={16} />
                            <span className="font-mono text-sm font-bold">Structure</span>
                        </div>
                        <pre className="text-gray-400 font-mono text-xs overflow-x-auto whitespace-pre custom-scrollbar">{blueprint.structure}</pre>
                    </div>
                </div>
            </div>

            {/* File Cards */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h4 className="text-xl font-bold text-white flex items-center gap-2">
                        <Icons.FileCode className="text-md-secondary" />
                        <span>Source Files</span>
                        <span className="text-sm font-normal text-gray-500 ml-2">({blueprint.files.length} files)</span>
                    </h4>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                    {blueprint.files.map((file, idx) => (
                        <CodeCard key={idx} file={file} onCopy={handleCopy} settings={settings} />
                    ))}
                </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-md-surface text-md-onSurface flex flex-col font-sans selection:bg-md-primary selection:text-black overflow-hidden">
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#121212]/80 backdrop-blur-lg border-b border-gray-800 px-4 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-md-primary to-md-secondary flex items-center justify-center shadow-lg shadow-md-primary/20">
                    <Icons.Code size={20} className="text-black" />
                </div>
                <span className="font-bold text-xl tracking-tight hidden md:block">Shahid_AI</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded-full bg-[#1e1e1e] border border-gray-700 text-xs font-mono text-gray-400 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full animate-pulse ${getActiveProviderColor()}`}></span>
                    {getActiveProviderLabel()}
                </div>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#1e1e1e]/90 backdrop-blur-md border-t border-gray-800 pb-safe z-50">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto">
            <button 
                onClick={() => setCurrentView(AppView.HOME)}
                className={`flex flex-col items-center gap-1 p-2 w-full transition-all duration-300 ${currentView === AppView.HOME ? 'text-md-primary -translate-y-1' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <div className={`p-1.5 rounded-full transition-colors ${currentView === AppView.HOME ? 'bg-md-primary/10' : ''}`}>
                    <Icons.Home size={20} />
                </div>
                <span className="text-[10px] font-medium tracking-wide">Design</span>
            </button>
            <button 
                onClick={() => setCurrentView(AppView.HISTORY)}
                className={`flex flex-col items-center gap-1 p-2 w-full transition-all duration-300 ${currentView === AppView.HISTORY ? 'text-md-primary -translate-y-1' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <div className={`p-1.5 rounded-full transition-colors ${currentView === AppView.HISTORY ? 'bg-md-primary/10' : ''}`}>
                    <Icons.History size={20} />
                </div>
                <span className="text-[10px] font-medium tracking-wide">Library</span>
            </button>
            <button 
                onClick={() => setCurrentView(AppView.SETTINGS)}
                className={`flex flex-col items-center gap-1 p-2 w-full transition-all duration-300 ${currentView === AppView.SETTINGS ? 'text-md-primary -translate-y-1' : 'text-gray-500 hover:text-gray-300'}`}
            >
                 <div className={`p-1.5 rounded-full transition-colors ${currentView === AppView.SETTINGS ? 'bg-md-primary/10' : ''}`}>
                    <Icons.Settings size={20} />
                </div>
                <span className="text-[10px] font-medium tracking-wide">Config</span>
            </button>
        </div>
      </nav>
    </div>
  );
};

export default App;