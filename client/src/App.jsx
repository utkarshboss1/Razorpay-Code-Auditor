import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderGit2, 
  Code2, 
  ShieldAlert, 
  ShieldCheck, 
  Play, 
  Sparkles, 
  BookOpen, 
  ExternalLink, 
  CheckCircle2, 
  Copy, 
  Check, 
  AlertTriangle, 
  X, 
  FileCode2, 
  Trash2, 
  RotateCcw,
  Terminal,
  Shield,
  Layers,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { PRESETS, PRESET_META, THEMES } from './presets';

function UnifiedDiff({ patchText, onCopy, copied, accentText }) {
  if (!patchText) return null;
  const lines = patchText.split('\n');

  return (
    <div className="rounded-lg border border-slate-800/90 bg-[#070A10] overflow-hidden text-xs font-mono shadow-inner">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5 text-slate-300 font-medium">
          <Terminal className={`w-3.5 h-3.5 ${accentText || 'text-amber-400'}`} />
          <span>Unified Git Patch</span>
        </span>
        <button
          onClick={onCopy}
          className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          title="Copy unified diff"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy Patch</span>
            </>
          )}
        </button>
      </div>
      <div className="p-2.5 overflow-x-auto max-h-56 leading-5 selection:bg-amber-600/40 text-[11px]">
        {lines.map((line, idx) => {
          let lineStyle = 'text-slate-400';
          let bgStyle = '';
          if (line.startsWith('+++') || line.startsWith('---')) {
            lineStyle = 'text-slate-500 font-semibold';
          } else if (line.startsWith('+')) {
            lineStyle = 'text-emerald-300 font-medium';
            bgStyle = 'bg-emerald-950/40 -mx-2.5 px-2.5';
          } else if (line.startsWith('-')) {
            lineStyle = 'text-rose-300 font-medium';
            bgStyle = 'bg-rose-950/40 -mx-2.5 px-2.5';
          } else if (line.startsWith('@@')) {
            lineStyle = 'text-amber-400/80 font-semibold';
            bgStyle = 'bg-slate-900/70 -mx-2.5 px-2.5';
          }

          return (
            <div key={idx} className={`${lineStyle} ${bgStyle} whitespace-pre`}>
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('snippet'); // 'snippet' | 'repo'
  const [themeKey, setThemeKey] = useState('saffron'); // 'saffron' | 'cyber' | 'nordic' | 'obsidian'
  const theme = THEMES[themeKey] || THEMES.saffron;
  const [code, setCode] = useState(PRESETS.checkout);
  const [activePreset, setActivePreset] = useState('checkout'); // 'checkout' | 'webhook' | 'livekey' | 'compliant' | 'custom'
  const [repoTarget, setRepoTarget] = useState('https://github.com/KrishBharadwaj5679/RazorPay-Integration');
  const [useAI, setUseAI] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [lastScannedCode, setLastScannedCode] = useState(PRESETS.checkout);
  const [lastScannedAt, setLastScannedAt] = useState(null);
  const [scoreAnimation, setScoreAnimation] = useState(false);
  const [rules, setRules] = useState([]);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const textareaRef = useRef(null);
  const gutterRef = useRef(null);

  const handleScroll = (e) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.target.scrollTop;
    }
  };

  useEffect(() => {
    fetchRules();
    runScanSnippet(PRESETS.checkout, false);
  }, []);

  // Keyboard shortcut: Ctrl + Enter / Cmd + Enter to audit
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (activeTab === 'snippet') {
          runScanSnippet(code, useAI);
        } else {
          runScanRepo(repoTarget, useAI);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [code, useAI, activeTab, repoTarget]);

  // Automatic Real-Time Audit: When user pauses typing (700ms debounce),
  // automatically re-calculate AST score without requiring manual click (if AI toggle is off)
  useEffect(() => {
    if (activeTab !== 'snippet' || useAI || !code.trim() || code === lastScannedCode) return;
    const timer = setTimeout(() => {
      runScanSnippet(code, false);
    }, 700);
    return () => clearTimeout(timer);
  }, [code, useAI, activeTab, lastScannedCode]);

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/rules');
      const data = await res.json();
      if (data.rules) setRules(data.rules);
    } catch (e) {
      console.error('Failed to load rules catalog', e);
    }
  };

  const runScanSnippet = async (sourceCode = code, enhanceAI = useAI) => {
    if (!sourceCode.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/scan/snippet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: sourceCode, useAI: enhanceAI })
      });
      const data = await res.json();
      setResult(data);
      setLastScannedCode(sourceCode);
      setLastScannedAt(new Date().toLocaleTimeString());
      setScoreAnimation(true);
      setTimeout(() => setScoreAnimation(false), 500);
    } catch (err) {
      alert('Audit scan failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const runScanRepo = async (target = repoTarget, enhanceAI = useAI) => {
    if (!target.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/scan/repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, useAI: enhanceAI })
      });
      const data = await res.json();
      if (data.error) {
        alert('Repository scan failed: ' + data.error);
      } else {
        const allViolations = (data.results || []).flatMap(r => 
          r.violations.map(v => ({ ...v, relativePath: r.relativePath }))
        );
        setResult({
          score: data.overallScore,
          totalFilesScanned: data.totalFilesScanned,
          violations: allViolations,
          isRepo: true,
          target: data.target
        });
        setLastScannedAt(new Date().toLocaleTimeString());
        setScoreAnimation(true);
        setTimeout(() => setScoreAnimation(false), 500);
      }
    } catch (err) {
      alert('Repository scan failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPreset = (key) => {
    const selected = PRESETS[key] || '';
    setActivePreset(key);
    setCode(selected);
    runScanSnippet(selected, useAI);
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    setActivePreset('custom');
  };

  const clearEditor = () => {
    setCode('');
    setActivePreset('custom');
    setResult(null);
    setLastScannedCode('');
  };

  const resetToDefault = () => {
    loadPreset('checkout');
  };

  const copyPatch = (patchText, index) => {
    navigator.clipboard.writeText(patchText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-950 text-emerald-300 border-emerald-500/40', label: 'Compliant & Production Ready' };
    if (score >= 50) return { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', badge: 'bg-amber-950 text-amber-300 border-amber-500/40', label: 'Financial / Idempotency Flaws' };
    return { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400', badge: 'bg-rose-950 text-rose-300 border-rose-500/40', label: 'Critical Security Vulnerabilities' };
  };

  const scoreBadge = result ? getScoreColor(result.score) : { bg: 'bg-slate-800', border: 'border-slate-700', text: 'text-slate-400', badge: 'bg-slate-800 text-slate-400 border-slate-700', label: 'Ready for Analysis' };

  const criticalCount = result ? result.violations.filter(v => v.severity === 'CRITICAL').length : 0;
  const highCount = result ? result.violations.filter(v => v.severity === 'HIGH').length : 0;
  const mediumCount = result ? result.violations.filter(v => v.severity === 'MEDIUM').length : 0;

  const linesCount = Math.max(1, code.split('\n').length);

  return (
    <div className={`min-h-screen ${theme.canvas} ${theme.textMain} flex flex-col selection:bg-amber-500/30 selection:text-white transition-colors duration-200`}>
      
      {/* Top Navbar */}
      <header className={`border-b ${theme.cardBorder} ${theme.nav} backdrop-blur sticky top-0 z-40 transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-lg ${theme.brandLogo} flex items-center justify-center shadow-sm font-bold text-xs`}>
              <Shield className="w-4 h-4 fill-current" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-white">
                Razorpay Code Auditor
              </span>
              <span className={`hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded border ${theme.brandBadge}`}>
                rzp-lint v1.2
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 text-xs">
            {/* UI/UX Pro Max Multi-Theme Switcher */}
            <div className={`flex items-center gap-1 ${theme.cardSubtle} p-0.5 rounded-lg border ${theme.cardBorder}`}>
              {Object.values(THEMES).map(t => (
                <button
                  key={t.id}
                  onClick={() => setThemeKey(t.id)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition flex items-center gap-1.5 ${
                    themeKey === t.id ? `${theme.activeTab} font-semibold` : theme.inactiveTab
                  }`}
                  title={`${t.name} (${t.tag})`}
                >
                  <span className={`w-2 h-2 rounded-full ${t.dot}`}></span>
                  <span className="hidden md:inline">{t.name}</span>
                </button>
              ))}
            </div>

            <button 
              onClick={() => setShowRulesModal(true)}
              className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent hover:border-slate-700/60 transition flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Rules ({rules.length || 6})</span>
            </button>
            <a 
              href="https://razorpay.com/docs/api/" 
              target="_blank" 
              rel="noreferrer"
              className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent hover:border-slate-700/60 transition flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Docs</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col gap-4">

        {/* Action Header & Engine Controller */}
        <div className={`flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl ${theme.card} border ${theme.cardBorder} transition-colors duration-200`}>
          
          {/* View Segmented Tabs */}
          <div className={`flex items-center p-0.5 rounded-lg ${theme.cardSubtle} border ${theme.cardBorder}`}>
            <button
              onClick={() => setActiveTab('snippet')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === 'snippet' 
                  ? `${theme.activeTab} font-semibold` 
                  : theme.inactiveTab
              }`}
            >
              <Code2 className={`w-3.5 h-3.5 ${theme.accentText}`} />
              <span>Editor Studio</span>
            </button>
            <button
              onClick={() => setActiveTab('repo')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === 'repo' 
                  ? `${theme.activeTab} font-semibold` 
                  : theme.inactiveTab
              }`}
            >
              <FolderGit2 className={`w-3.5 h-3.5 ${theme.accentText}`} />
              <span>Repository Audit</span>
            </button>
          </div>

          {/* Engine Mode Controller & Run Button */}
          <div className="flex items-center gap-3">
            
            {/* AI Toggle */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${theme.cardSubtle} border ${theme.cardBorder}`}>
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
                <input 
                  type="checkbox" 
                  checked={useAI} 
                  onChange={(e) => setUseAI(e.target.checked)} 
                  className="sr-only peer" 
                />
                <div className="w-7 h-3.5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500 relative"></div>
                <span className="flex items-center gap-1 text-slate-300 font-medium">
                  <Sparkles className={`w-3.5 h-3.5 ${useAI ? theme.accentText : 'text-slate-500'}`} />
                  <span>AI Remediation</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${useAI ? theme.accentBadge : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                    {useAI ? 'Groq / Gemini' : 'Offline AST'}
                  </span>
                </span>
              </label>
            </div>

            {/* Run Button */}
            <button 
              onClick={() => activeTab === 'snippet' ? runScanSnippet(code, useAI) : runScanRepo(repoTarget, useAI)}
              disabled={loading}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-2 disabled:opacity-50 ${
                code !== lastScannedCode && activeTab === 'snippet'
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow'
                  : theme.primaryBtn
              }`}
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Auditing...</span>
                </span>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>
                    {activeTab === 'repo' 
                      ? 'Audit Repository' 
                      : (code !== lastScannedCode ? 'Audit Modified Code' : 'Run Audit')}
                  </span>
                  <span className="hidden md:inline-block text-[10px] opacity-75 font-mono bg-black/20 px-1 py-0.2 rounded">
                    Ctrl+Enter
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab 1 Controls: Test Case Scenarios Bar */}
        {activeTab === 'snippet' && (
          <div className={`flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl ${theme.card} border ${theme.cardBorder} text-xs transition-colors duration-200`}>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mr-1">
                Test Scenarios:
              </span>
              {PRESET_META.map(preset => {
                const isActive = activePreset === preset.id;
                const isCompliant = preset.severity === 'CLEAN';

                return (
                  <button
                    key={preset.id}
                    onClick={() => loadPreset(preset.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition flex items-center gap-1.5 ${
                      isActive 
                        ? (isCompliant ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-sm' : `${theme.activeTab} shadow-sm`)
                        : `${theme.cardSubtle} ${theme.cardBorder} text-slate-400 hover:text-slate-200`
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isCompliant ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                    <span>{preset.label}</span>
                    <span className="text-[10px] font-mono opacity-60">[{preset.code}]</span>
                  </button>
                );
              })}

              {activePreset === 'custom' && (
                <span className={`px-2 py-0.5 rounded-md ${theme.accentBadge} font-mono text-[11px] flex items-center gap-1`}>
                  <span>Custom Source</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={resetToDefault}
                className="px-2 py-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition text-xs flex items-center gap-1"
                title="Reset editor back to default preset"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
              <button
                onClick={clearEditor}
                className="px-2 py-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition text-xs flex items-center gap-1"
                title="Clear editor"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2 Controls: Repository Target Bar */}
        {activeTab === 'repo' && (
          <div className={`p-3 rounded-xl ${theme.card} border ${theme.cardBorder} flex flex-col sm:flex-row items-center gap-2.5 transition-colors duration-200`}>
            <div className="flex-1 w-full relative">
              <input
                type="text"
                value={repoTarget}
                onChange={(e) => setRepoTarget(e.target.value)}
                placeholder="Enter GitHub URL (e.g. https://github.com/owner/repo) or local folder path"
                className={`w-full px-3 py-2 ${theme.cardSubtle} border ${theme.cardBorder} rounded-lg text-xs font-mono text-slate-200 outline-none focus:border-amber-500 transition`}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setRepoTarget('https://github.com/KrishBharadwaj5679/RazorPay-Integration'); runScanRepo('https://github.com/KrishBharadwaj5679/RazorPay-Integration', useAI); }}
                className={`px-2.5 py-1.5 rounded-md text-xs ${theme.cardSubtle} hover:bg-slate-800/80 text-slate-300 border ${theme.cardBorder} transition whitespace-nowrap`}
              >
                GitHub: RazorPay-Integration
              </button>
              <button
                onClick={() => { setRepoTarget('D:\\test-repos\\RazorPay-API'); runScanRepo('D:\\test-repos\\RazorPay-API', useAI); }}
                className={`px-2.5 py-1.5 rounded-md text-xs ${theme.cardSubtle} hover:bg-slate-800/80 text-slate-300 border ${theme.cardBorder} transition whitespace-nowrap`}
              >
                Local: test-repos
              </button>
            </div>
          </div>
        )}

        {/* Two-Column Studio Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[580px]">

          {/* Left Column: Code Editor */}
          <div className={`lg:col-span-6 flex flex-col rounded-xl ${theme.card} border ${theme.cardBorder} overflow-hidden shadow-sm`}>
            {activeTab === 'snippet' ? (
              <>
                {/* Editor Header Tab Bar */}
                <div className={`px-3 py-2 ${theme.cardSubtle} border-b ${theme.cardBorder} flex items-center justify-between text-xs`}>
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
                    <span className="font-mono text-slate-300 font-medium flex items-center gap-1.5">
                      <FileCode2 className={`w-3.5 h-3.5 ${theme.accentText}`} />
                      <span>{activePreset === 'custom' ? 'custom_checkout.js' : `${activePreset}.js`}</span>
                    </span>
                    {code !== lastScannedCode && (
                      <span className="px-1.5 py-0.2 text-[10px] font-medium bg-amber-950/80 text-amber-300 border border-amber-500/30 rounded">
                        Edited
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px]">
                    <span>{linesCount} lines</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[10px]">
                      Babel AST
                    </span>
                  </div>
                </div>

                {/* Code Editor with Synchronized Line Number Gutter */}
                <div className="relative flex-1 flex overflow-hidden">
                  <div 
                    ref={gutterRef}
                    className={`w-10 py-3 pl-2 pr-2 text-right font-mono text-xs text-slate-600 select-none ${theme.editorGutter} border-r ${theme.cardBorder} overflow-hidden leading-6`}
                  >
                    {Array.from({ length: linesCount }, (_, i) => (
                      <div key={i + 1}>{i + 1}</div>
                    ))}
                  </div>

                  <textarea 
                    ref={textareaRef}
                    value={code} 
                    onChange={(e) => handleCodeChange(e.target.value)}
                    onScroll={handleScroll}
                    spellCheck="false"
                    placeholder="// Paste your Razorpay integration code here..."
                    className="flex-1 p-3 bg-transparent text-slate-200 text-xs font-mono leading-6 outline-none resize-none selection:bg-amber-600/30 selection:text-white"
                  />
                </div>
              </>
            ) : (
              <div className="p-6 flex flex-col gap-4 flex-1 justify-center items-center text-center">
                <div className={`w-12 h-12 rounded-xl ${theme.cardSubtle} border ${theme.cardBorder} ${theme.accentText} flex items-center justify-center text-xl`}>
                  <FolderGit2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Repository AST Scanning</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Clones or traverses target repos, constructs Babel AST trees for all JS/TS payment files, inspects secrets, and outputs unified diff patches.
                  </p>
                </div>
                <div className={`w-full max-w-sm p-3 rounded-lg ${theme.cardSubtle} border ${theme.cardBorder} text-left text-xs font-mono`}>
                  <div className="text-slate-500">// Run from your terminal:</div>
                  <div className={`${theme.accentText} font-medium`}>$ npx rzp-lint ./your-project --fix</div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Findings & Compliance Score */}
          <div className="lg:col-span-6 flex flex-col gap-3">

            {/* Scorecard Summary */}
            <div className={`p-4 rounded-xl ${theme.card} border ${theme.cardBorder} shadow-sm`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className={`w-14 h-14 rounded-xl ${scoreBadge.bg} border ${scoreBadge.border} flex flex-col items-center justify-center font-bold transition-all duration-300 ${scoreAnimation ? 'scale-105' : ''}`}>
                    <span className={`text-xl font-mono ${scoreBadge.text}`}>{result ? result.score : '--'}</span>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400">/ 100</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-slate-100">
                        {result ? (result.score >= 80 ? 'Integration Compliant' : 'Vulnerabilities Flagged') : 'Awaiting Analysis'}
                      </h2>
                      <span className={`px-2 py-0.2 text-[10px] font-mono uppercase font-semibold rounded border ${scoreBadge.badge}`}>
                        {result ? (result.score >= 80 ? 'PASS' : (result.score >= 50 ? 'WARNING' : 'FAIL')) : 'PENDING'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {result ? (
                        result.score >= 80 
                          ? 'Zero critical currency or signature flaws detected.' 
                          : `${result.violations.length} issue(s) require remediation before production.`
                      ) : 'Select a test case or paste source code.'}
                    </p>
                  </div>
                </div>

                {/* Breakdown badges */}
                <div className="flex items-center gap-2 text-right">
                  <div className={`px-2.5 py-1 rounded ${theme.cardSubtle} border ${theme.cardBorder} text-center`}>
                    <div className="text-xs font-mono font-bold text-rose-400">{criticalCount}</div>
                    <div className="text-[9px] uppercase text-slate-500">Critical</div>
                  </div>
                  <div className={`px-2.5 py-1 rounded ${theme.cardSubtle} border ${theme.cardBorder} text-center`}>
                    <div className="text-xs font-mono font-bold text-amber-400">{highCount}</div>
                    <div className="text-[9px] uppercase text-slate-500">High</div>
                  </div>
                  <div className={`px-2.5 py-1 rounded ${theme.cardSubtle} border ${theme.cardBorder} text-center`}>
                    <div className="text-xs font-mono font-bold text-slate-300">{mediumCount}</div>
                    <div className="text-[9px] uppercase text-slate-500">Medium</div>
                  </div>
                </div>
              </div>

              {lastScannedAt && (
                <div className={`mt-3 pt-2.5 border-t ${theme.cardBorder} flex items-center justify-between text-[11px] text-slate-500 font-mono`}>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Last audited at {lastScannedAt}</span>
                  </span>
                  <span>{useAI ? 'Remediation: Groq / Gemini AI' : 'Remediation: Deterministic AST Engine (<1ms)'}</span>
                </div>
              )}
            </div>

            {/* Findings Feed */}
            <div className="flex-1 overflow-y-auto space-y-3 max-h-[600px] pr-0.5">
              {!result || result.violations.length === 0 ? (
                result ? (
                  <div className={`p-8 rounded-xl ${theme.card} border border-emerald-500/20 text-center flex flex-col items-center justify-center`}>
                    <div className="w-10 h-10 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-2">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-semibold text-emerald-300">Clean Integration Pass</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      Amounts are converted to paise sub-units, webhook HMAC signatures are validated, and live keys are properly managed.
                    </p>
                  </div>
                ) : null
              ) : (
                result.violations.map((v, i) => {
                  const remediation = v.remediation || {};
                  const isCritical = v.severity === 'CRITICAL';
                  const isHigh = v.severity === 'HIGH';

                  return (
                    <div key={i} className={`p-3.5 rounded-xl ${theme.card} border ${theme.cardBorder} hover:border-slate-600/50 transition flex flex-col gap-2.5 shadow-sm`}>
                      
                      {/* Header Line */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.2 text-[10px] font-mono font-bold uppercase rounded border ${
                            isCritical ? 'bg-rose-950/70 text-rose-300 border-rose-500/40' :
                            isHigh ? 'bg-amber-950/70 text-amber-300 border-amber-500/40' :
                            'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            {v.severity}
                          </span>
                          <span className="text-xs font-mono text-slate-300 font-semibold">{v.ruleId}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {v.relativePath ? `${v.relativePath}:${v.line}` : `Line ${v.line}`}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h4 className="font-semibold text-xs text-slate-200">{v.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{v.context}</p>
                      </div>

                      {/* Offending Code Snippet */}
                      <div className={`px-2.5 py-1.5 rounded-lg ${theme.cardSubtle} border ${theme.cardBorder} text-xs font-mono text-rose-300/90 overflow-x-auto`}>
                        <span className="text-slate-600 mr-2">{v.line} |</span>
                        {v.snippet}
                      </div>

                      {/* Unified Git Patch */}
                      {remediation.patch && (
                        <UnifiedDiff 
                          patchText={remediation.patch} 
                          onCopy={() => copyPatch(remediation.patch, i)} 
                          copied={copiedIndex === i}
                          accentText={theme.accentText}
                        />
                      )}

                      {/* Explanation Bar */}
                      <div className={`pt-2 border-t ${theme.cardBorder} flex items-start gap-2 text-xs`}>
                        <Info className={`w-3.5 h-3.5 ${theme.accentText} shrink-0 mt-0.5`} />
                        <div className="text-[11px] text-slate-400 leading-relaxed">
                          <span className="font-semibold text-slate-300">
                            {remediation.source ? `Analysis (${remediation.source}): ` : 'Impact: '}
                          </span>
                          {remediation.explanation || v.description}
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

          </div>

        </div>

      </main>

      {/* Rules Catalog Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${theme.card} border ${theme.cardBorder} rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl`}>
            <div className={`p-4 border-b ${theme.cardBorder} flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <BookOpen className={`w-4 h-4 ${theme.accentText}`} />
                <h3 className="font-semibold text-sm text-slate-100">Razorpay Static Rule Catalog</h3>
              </div>
              <button onClick={() => setShowRulesModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {rules.map((r) => (
                <div key={r.id} className={`p-3 rounded-lg ${theme.cardSubtle} border ${theme.cardBorder}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-slate-200 font-mono">{r.id}: {r.title}</span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                      r.severity === 'CRITICAL' ? 'bg-rose-950/70 text-rose-300 border border-rose-500/30' : 'bg-amber-950/70 text-amber-300 border border-amber-500/30'
                    }`}>
                      {r.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{r.description}</p>
                  <div className={`mt-2 text-[11px] ${theme.accentText} font-mono`}>
                    Impact: {r.impact}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
