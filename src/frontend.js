
const $ = id => document.getElementById(id);

class OpiumwareEditor {
    constructor() {
        this.editor = null;
        this.tabs = [];
        this.activeTabId = null;
        this.currentFolder = null;
        this.opiumwareScriptsPath = null;
        this.autoexecPath = null;
        this.savedScripts = [];
        this.allFiles = [];
        this.contextMenuTarget = null;
        this.contextMenuFile = null;
        this.scripthubScripts = [];
        this.pointerDragState = null;
        this.pointerDragSetupDone = false;
        this.currentTheme = 'dark';
        this.isClosingTab = false;
        this.selectedPort = 'auto';
        this.aiMessages = [];
        this.aiSending = false;
        this.robloxLogMonitorActive = false;
        this.robloxLogMonitorTimer = null;
        this.terminalHistory = [];
        this.terminalHistoryIndex = 0;
        this.editorStateSaveTimer = null;
        this.pendingRconsoleInputRequestId = null;
        this.luauLspEnabled = true;
        this.intellisenseEnabled = true;

        this.invoke = null;
        this.fs = null;
        this.dialog = null;
        this.path = null;
        this.event = null;
        this.appWindow = null;

        this.init();
    }

    async init() {
        if (window.__TAURI__) {
            this.invoke = window.__TAURI__.core.invoke;
            const pluginFs = window.__TAURI__.fs;
            this.fs = {
                readTextFile: pluginFs.readTextFile,
                writeTextFile: pluginFs.writeTextFile,
                readDir: pluginFs.readDir,
                createDir: (path, opts) => pluginFs.mkdir(path, opts),
                removeFile: (path) => pluginFs.remove(path),
                removeDir: (path, opts) => pluginFs.remove(path, opts),
                renameItem: pluginFs.rename ? (oldPath, newPath) => pluginFs.rename(oldPath, newPath) : null,
            };
            this.dialog = window.__TAURI__.dialog;
            this.path = window.__TAURI__.path;
            this.event = window.__TAURI__.event;
            const { getCurrentWebviewWindow } = window.__TAURI__.webviewWindow;
            this.appWindow = getCurrentWebviewWindow();
        }

        this.loadSettings();
        await this.initPaths();
        await this.initMonaco();
        await this.refreshSavedScripts();
        this.bindEvents();
        this.bindKeyboardShortcuts();
        this.initConsoleResize();
        this.initScriptHub();
        this.initPortSelector();
        this.initTauriEvents();
        this.startDecompilerServer();
        this.startRobloxLogMonitor();
        this.loadAiDocsStatus();
        await this.restoreEditorState();
        this.refreshLucideIcons();
        document.body.classList.remove('app-loading');
        this.initVersion();
    }

    async initVersion() {
        try {
            const version = await window.__TAURI__.app.getVersion();
            const label = `v${version}`;
            const versionEl = document.getElementById('versionNumber');
            const welcomeEl = document.getElementById('welcomeVersion');
            if (versionEl) versionEl.textContent = label;
            if (welcomeEl) welcomeEl.textContent = label;
        } catch (_) {}
    }

    async initPaths() {
        if (!this.path) return;
        try {
            const homeDir = (await this.path.homeDir()).replace(/\/$/, '');
            this.opiumwareScriptsPath = homeDir + '/Opiumware/workspace';
            this.autoexecPath = homeDir + '/Opiumware/autoexec';
        } catch (e) {
            console.error('Failed to init paths:', e);
        }
    }

    loadSettings() {
        const savedTheme = localStorage.getItem('opiumware-theme') || 'dark';
        this.applyTheme(savedTheme);

        const minimapEnabled = localStorage.getItem('opiumware-minimap') !== 'false';
        const minimapCheckbox = $('minimapCheckbox');
        if (minimapCheckbox) minimapCheckbox.checked = minimapEnabled;

        const wordWrapEnabled = localStorage.getItem('opiumware-wordwrap') === 'true';
        const wordWrapCheckbox = $('wordWrapCheckbox');
        if (wordWrapCheckbox) wordWrapCheckbox.checked = wordWrapEnabled;

        this.luauLspEnabled = localStorage.getItem('opiumware-luaulsp') !== 'false';
        const luauLspCheckbox = $('luauLspCheckbox');
        if (luauLspCheckbox) luauLspCheckbox.checked = this.luauLspEnabled;

        this.intellisenseEnabled = localStorage.getItem('opiumware-intellisense') !== 'false';
        const intellisenseCheckbox = $('intellisenseCheckbox');
        if (intellisenseCheckbox) intellisenseCheckbox.checked = this.intellisenseEnabled;

        const robloxLogEnabled = localStorage.getItem('opiumware-robloxlog') !== 'false';
        const robloxLogCheckbox = $('robloxLogCheckbox');
        if (robloxLogCheckbox) robloxLogCheckbox.checked = robloxLogEnabled;

        const alwaysOnTop = localStorage.getItem('opiumware-alwaysontop') === 'true';
        const alwaysOnTopCheckbox = $('alwaysOnTopCheckbox');
        if (alwaysOnTopCheckbox) alwaysOnTopCheckbox.checked = alwaysOnTop;
        if (alwaysOnTop && this.appWindow) this.appWindow.setAlwaysOnTop(true);
    }

    applyTheme(theme) {
        this.currentTheme = theme;
        document.body.className = `theme-${theme}`;
        localStorage.setItem('opiumware-theme', theme);
        const themeRadio = document.querySelector(`input[name="theme"][value="${theme}"]`);
        if (themeRadio) themeRadio.checked = true;
        if (this.editor && typeof monaco !== 'undefined') this.applyMonacoTheme(theme);
    }

    applyMonacoTheme(theme) {
        const themeConfigs = {
            dark: { base: 'vs-dark', background: '#0f0f17', foreground: '#e0e0ec', lineNumber: '#5c5c7a', lineNumberActive: '#e0e0ec', selection: '#2a2a3d', cursor: '#cba6f7', lineHighlight: '#1e1e2e', indent: '#232336', widget: '#13131d', widgetBorder: '#232336', accent: '#cba6f7', keyword: 'cba6f7', string: 'a6e3a1', number: 'fab387', type: 'f9e2af', function: '89b4fa', comment: '5c5c7a', global: '9cdcfe' },
            midnight: { base: 'vs-dark', background: '#000000', foreground: '#ffffff', lineNumber: '#606060', lineNumberActive: '#ffffff', selection: '#1f1f1f', cursor: '#5a4b6b', lineHighlight: '#141414', indent: '#1a1a1a', widget: '#0a0a0a', widgetBorder: '#1a1a1a', accent: '#5a4b6b', keyword: '9d8ab8', string: '7eb89e', number: 'c9a87c', type: 'd4c4a0', function: '7ca6d4', comment: '606060', global: '9cdcfe' },
            purple: { base: 'vs-dark', background: '#1a1525', foreground: '#f0e8ff', lineNumber: '#7a6a9a', lineNumberActive: '#f0e8ff', selection: '#3d3355', cursor: '#a855f7', lineHighlight: '#2d2540', indent: '#3d3355', widget: '#231d30', widgetBorder: '#3d3355', accent: '#a855f7', keyword: 'a855f7', string: '7ee787', number: 'ffa657', type: 'e0c46c', function: '79c0ff', comment: '7a6a9a', global: 'b5a0d8' },
            rose: { base: 'vs-dark', background: '#1a0d14', foreground: '#f5e0ea', lineNumber: '#9a5a78', lineNumberActive: '#f5e0ea', selection: '#402535', cursor: '#e11d48', lineHighlight: '#2f1a24', indent: '#402535', widget: '#221219', widgetBorder: '#402535', accent: '#e11d48', keyword: 'e11d48', string: 'fb7185', number: 'fda4af', type: 'f9a8d4', function: 'f472b6', comment: '9a5a78', global: 'fda4af' },
            ocean: { base: 'vs-dark', background: '#0a1520', foreground: '#e0f0f5', lineNumber: '#5a8a9a', lineNumberActive: '#e0f0f5', selection: '#1f3045', cursor: '#06b6d4', lineHighlight: '#152535', indent: '#1f3045', widget: '#0f1d2a', widgetBorder: '#1f3045', accent: '#06b6d4', keyword: '06b6d4', string: '22d3ee', number: '67e8f9', type: 'a5f3fc', function: '38bdf8', comment: '5a8a9a', global: '67e8f9' },
            light: { base: 'vs', background: '#f8f8f8', foreground: '#1a1a1a', lineNumber: '#8a8a8a', lineNumberActive: '#1a1a1a', selection: '#d8d8d8', cursor: '#8b5cf6', lineHighlight: '#e8e8e8', indent: '#d0d0d0', widget: '#ffffff', widgetBorder: '#d0d0d0', accent: '#8b5cf6', keyword: '8b5cf6', string: '22863a', number: 'e36209', type: 'b08800', function: '005cc5', comment: '8a8a8a', global: '0070c1' }
        };
        const config = themeConfigs[theme] || themeConfigs.dark;
        const themeName = `opiumware-${theme}`;
        monaco.editor.defineTheme(themeName, {
            base: config.base, inherit: true,
            rules: [
                { token: 'comment', foreground: config.comment, fontStyle: 'italic' },
                { token: 'keyword', foreground: config.keyword },
                { token: 'string', foreground: config.string },
                { token: 'number', foreground: config.number },
                { token: 'type', foreground: config.type },
                { token: 'class', foreground: config.type },
                { token: 'function', foreground: config.function },
                { token: 'variable', foreground: config.foreground.replace('#', '') },
                { token: 'constant', foreground: config.number },
                { token: 'operator', foreground: config.accent.replace('#', '') },
                { token: 'punctuation', foreground: config.lineNumber.replace('#', '') },
                { token: 'keyword.lua', foreground: config.keyword },
                { token: 'string.lua', foreground: config.string },
                { token: 'number.lua', foreground: config.number },
                { token: 'comment.lua', foreground: config.comment, fontStyle: 'italic' },
                { token: 'global', foreground: config.global || config.function },
                { token: 'predefined', foreground: config.global || config.function },
                { token: 'variable.predefined', foreground: config.global || config.function },
            ],
            colors: {
                'editor.background': config.background,
                'editor.foreground': config.foreground,
                'editorLineNumber.foreground': config.lineNumber,
                'editorLineNumber.activeForeground': config.lineNumberActive,
                'editor.selectionBackground': config.selection,
                'editorCursor.foreground': config.cursor,
                'editor.lineHighlightBackground': config.lineHighlight,
                'editorIndentGuide.background': config.indent,
                'editorWidget.background': config.widget,
                'editorWidget.border': config.widgetBorder,
                'editorSuggestWidget.background': config.widget,
                'editorSuggestWidget.selectedBackground': config.selection,
                'editorSuggestWidget.highlightForeground': config.accent,
                'focusBorder': '#00000000',
                'contrastBorder': '#00000000',
            }
        });
        monaco.editor.setTheme(themeName);
    }

    async initMonaco() {
        return new Promise(async (resolve) => {
            require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' } });
            const customCompletions = await this.loadLuaCompletions();
            require(['vs/editor/editor.main'], () => {
                this.registerLuaLanguage(customCompletions);
                this.editor = monaco.editor.create($('monacoEditor'), {
                    value: '', language: 'lua', theme: 'vs-dark',
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, Monaco, monospace",
                    fontSize: 14, lineHeight: 22, fontLigatures: true,
                    minimap: { enabled: localStorage.getItem('opiumware-minimap') !== 'false' },
                    scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
                    renderLineHighlight: 'all', smoothScrolling: true,
                    cursorBlinking: 'smooth', cursorSmoothCaretAnimation: 'on',
                    automaticLayout: true, padding: { top: 10, bottom: 10 },
                    bracketPairColorization: { enabled: true },
                    guides: { bracketPairs: true, indentation: true },
                    autoIndent: 'full', formatOnType: true, formatOnPaste: true,
                    tabSize: 4, insertSpaces: true,
                    wordWrap: localStorage.getItem('opiumware-wordwrap') === 'true' ? 'on' : 'off',
                    matchBrackets: 'always', autoClosingBrackets: 'always',
                    autoClosingQuotes: 'always', autoSurround: 'languageDefined',
                    quickSuggestions: this.intellisenseEnabled,
                    suggestOnTriggerCharacters: this.intellisenseEnabled,
                });
                this.applyMonacoTheme(this.currentTheme || 'dark');
                this.editor.onDidChangeCursorPosition((e) => this.updateCursorPosition(e.position));
                this.editor.onDidChangeModelContent(() => {
                    if (this.activeTabId) this.markTabAsModified(this.activeTabId);
                    this.scheduleEditorStateSave();
                });
                this.startLuauAnalysis();
                resolve();
            });
        });
    }

    async loadLuaCompletions() {
        if (window.OPIUMWARE_INTELLISENSE) return window.OPIUMWARE_INTELLISENSE;
        try {
            const response = await fetch('./assets/monaco.json');
            if (response.ok) {
                const data = await response.json();
                return data.completions || [];
            }
        } catch (e) { }
        return [];
    }

    startLuauAnalysis() {
        setInterval(async () => {
            if (!this.editor || !this.invoke || !this.luauLspEnabled) return;
            const editorValue = this.editor.getValue();
            if (!editorValue.trim()) {
                monaco.editor.setModelMarkers(this.editor.getModel(), 'luau-lsp', []);
                this.updateProblemsPanel([]);
                return;
            }
            try {
                const result = await this.invoke('analyze_luau', { source: editorValue });
                const markers = [];
                if (result.output) {
                    const errorPattern = /(?:saved|analysis)\.lua[a-z]*\((\d+),(\d+)\):\s*(\w+):\s*(.*)/g;
                    let match;
                    while ((match = errorPattern.exec(result.output)) !== null) {
                        const [, line, col, errorType, errorMessage] = match;
                        if (/deprecated|Unknown type|Unknown require|could be nil|Unknown global/.test(errorMessage)) continue;
                        let severity = monaco.MarkerSeverity.Error;
                        if (/warning|unused|unreachable/i.test(errorType)) severity = monaco.MarkerSeverity.Warning;
                        else if (/info|hint/i.test(errorType)) severity = monaco.MarkerSeverity.Info;
                        markers.push({ startLineNumber: +line, startColumn: +col, endLineNumber: +line, endColumn: +col + 10, message: `${errorType}: ${errorMessage}`, severity });
                    }
                }
                monaco.editor.setModelMarkers(this.editor.getModel(), 'luau-lsp', markers);
                this.updateProblemsPanel(markers);
            } catch (e) { console.warn('Luau analysis error:', e); }
        }, 2000);
    }

    updateProblemsPanel(markers) {
        const list = $('problemsList');
        if (!list) return;
        if (markers.length === 0) {
            list.innerHTML = '<div class="problems-empty">No problems detected.</div>';
            const ps = $('problemsStatus'); if (ps) ps.innerHTML = '<i data-lucide="x-circle"></i> 0 <i data-lucide="triangle-alert"></i> 0';
            this.refreshLucideIcons();
            return;
        }
        const errors = markers.filter(m => m.severity === monaco.MarkerSeverity.Error).length;
        const warnings = markers.filter(m => m.severity === monaco.MarkerSeverity.Warning).length;
        const ps2 = $('problemsStatus'); if (ps2) ps2.innerHTML = `<i data-lucide="x-circle"></i> ${errors} <i data-lucide="triangle-alert"></i> ${warnings}`;
        list.innerHTML = markers.map(m => {
            const icon = m.severity === monaco.MarkerSeverity.Error ? 'error' : m.severity === monaco.MarkerSeverity.Warning ? 'warning' : 'info';
            return `<div class="problem-item" data-line="${m.startLineNumber}"><span class="problem-icon ${icon}"><i data-lucide="${icon === 'error' ? 'x-circle' : icon === 'warning' ? 'triangle-alert' : 'info'}"></i></span><span>Ln ${m.startLineNumber}: ${m.message}</span></div>`;
        }).join('');
        list.querySelectorAll('.problem-item').forEach(item => {
            item.addEventListener('click', () => {
                const line = parseInt(item.dataset.line);
                if (this.editor) { this.editor.revealLineInCenter(line); this.editor.setPosition({ lineNumber: line, column: 1 }); this.editor.focus(); }
            });
        });
        this.refreshLucideIcons();
    }

    registerLuaLanguage(customCompletions) {
        const luaGlobals = [
            "break","goto","do","end","while","repeat","until","if","then","else","elseif","for","in","function","local","return","continue","export",
            "print","warn","error","type","typeof","tostring","tonumber","pairs","ipairs","next","select","unpack","pcall","xpcall","assert","require","setmetatable","getmetatable","rawset","rawget","wait",
            "game","workspace","script","spawn","delay","tick","time","task","task.wait","task.spawn","task.defer","task.delay","task.cancel",
            "Vector2","Vector3","CFrame","Color3","UDim","UDim2","Instance","TweenInfo","Enum","BrickColor","Ray","Random","RaycastParams","OverlapParams",
            "math","string","table","coroutine","bit32","os","debug",
            "true","false","nil","self","_G","_VERSION","shared"
        ];

        if (!monaco.languages.getLanguages().some(l => l.id === 'lua')) {
            monaco.languages.register({ id: 'lua', extensions: ['.lua'], aliases: ['Lua'] });
        }
        if (!monaco.languages.getLanguages().some(l => l.id === 'luau')) {
            monaco.languages.register({ id: 'luau', extensions: ['.luau'], aliases: ['Luau'] });
        }

        const luaLanguageConfiguration = {
            comments: { lineComment: '--', blockComment: ['--[[', ']]'] },
            brackets: [['{', '}'], ['[', ']'], ['(', ')']],
            autoClosingPairs: [{ open: '{', close: '}' }, { open: '[', close: ']' }, { open: '(', close: ')' }, { open: '"', close: '"' }, { open: "'", close: "'" }],
            surroundingPairs: [{ open: '{', close: '}' }, { open: '[', close: ']' }, { open: '(', close: ')' }, { open: '"', close: '"' }, { open: "'", close: "'" }],
            indentationRules: { increaseIndentPattern: /^\s*(do|then|else|elseif|repeat|function|if|for|while)\b.*$/, decreaseIndentPattern: /^\s*(end|else|elseif|until)\b.*$/ }
        };
        monaco.languages.setLanguageConfiguration('lua', luaLanguageConfiguration);
        monaco.languages.setLanguageConfiguration('luau', luaLanguageConfiguration);

        const completionProvider = {
            provideCompletionItems: (model, position) => {
                const word = model.getWordUntilPosition(position);
                const range = { startLineNumber: position.lineNumber, startColumn: word.startColumn, endLineNumber: position.lineNumber, endColumn: word.endColumn };
                const kindMap = { function: monaco.languages.CompletionItemKind.Function, method: monaco.languages.CompletionItemKind.Method, variable: monaco.languages.CompletionItemKind.Variable, class: monaco.languages.CompletionItemKind.Class, property: monaco.languages.CompletionItemKind.Property, module: monaco.languages.CompletionItemKind.Module, keyword: monaco.languages.CompletionItemKind.Keyword, constant: monaco.languages.CompletionItemKind.Constant };
                const suggestions = [];
                if (customCompletions && customCompletions.length) {
                    customCompletions.forEach(item => { suggestions.push({ label: item.label, kind: kindMap[item.type] || kindMap.function, insertText: item.label, detail: item.detail, documentation: item.documentation ? { value: item.documentation } : undefined, range }); });
                }
                luaGlobals.forEach(kw => {
                    if (!suggestions.some(s => s.label === kw)) {
                        suggestions.push({ label: kw, kind: /^(function|print|warn|error|pcall|xpcall|assert|require|type|typeof|tostring|tonumber|pairs|ipairs|select|unpack|spawn|delay|wait)$/.test(kw) ? kindMap.function : /^(math|string|table|coroutine|bit32|os|debug|task)$/.test(kw) ? kindMap.module : /^(true|false|nil)$/.test(kw) ? kindMap.constant : /^(local|end|do|then|if|else|elseif|for|while|repeat|until|break|return|continue|export|in|not|and|or|function|goto)$/.test(kw) ? kindMap.keyword : kindMap.variable, insertText: kw, range });
                    }
                });
                return { suggestions };
            }
        };
        monaco.languages.registerCompletionItemProvider('lua', completionProvider);
        monaco.languages.registerCompletionItemProvider('luau', completionProvider);
    }

    initTauriEvents() {
        if (!this.event) return;

        this.event.listen('rconsole-bridge', (event) => {
            const payload = event.payload;
            if (!payload) return;
            if (payload.kind === 'log') {
                const message = payload.message || '';
                const level = payload.level || 'info';
                const color = payload.color || null;
                this.appendRconsoleLine(message, level, color);
            } else if (payload.kind === 'clear') {
                const output = $('rconsoleOutput');
                if (output) output.innerHTML = '';
            } else if (payload.kind === 'input') {
                this.pendingRconsoleInputRequestId = payload.request_id;
                const inputRow = $('rconsoleInputRow');
                const inputField = $('rconsoleInputField');
                if (inputRow && inputField) {
                    inputRow.classList.remove('hidden');
                    inputField.focus();
                    inputField.placeholder = 'Type your response...';
                }
            }
        });

        this.event.listen('quick-script-toast', (event) => {
            const payload = event.payload;
            if (payload && payload.message) {
                this.showToast(payload.message, payload.level || 'info');
            }
        });

        this.event.listen('opiumware-ai-docs-progress', (event) => {
            const status = $('aiDocsStatus');
            if (status && event.payload) {
                status.textContent = event.payload.message || 'Indexing...';
                status.classList.add('visible');
            }
        });
    }

    appendRconsoleLine(message, level = 'info', color = null) {
        const output = $('rconsoleOutput');
        if (!output) return;
        const line = document.createElement('div');
        line.className = 'console-line';
        const prefixMap = { 'error': ['log-error', '[Error]: '], 'warning': ['log-warning', '[Warning]: '], 'warn': ['log-warning', '[Warning]: '], 'info': ['log-info', '[Info]: '], 'success': ['log-success', ''] };
        const [cls, txt] = prefixMap[level] || ['log-output', ''];
        const prefix = document.createElement('span');
        prefix.className = cls;
        prefix.textContent = txt;
        const text = document.createElement('span');
        text.className = 'log-text';
        text.textContent = message;
        if (color) text.style.color = color;
        line.appendChild(prefix);
        line.appendChild(text);
        output.appendChild(line);
        output.scrollTop = output.scrollHeight;
    }

    async readFile(path) {
        if (!this.fs) return null;
        try { return await this.fs.readTextFile(path); } catch (e) { return null; }
    }

    async writeFile(path, content) {
        if (!this.fs) return false;
        try { await this.fs.writeTextFile(path, content); return true; } catch (e) { return false; }
    }

    async readDirectory(dirPath) {
        if (!this.fs) return [];
        try {
            const entries = await this.fs.readDir(dirPath);
            return await this.buildDirTree(entries, dirPath);
        } catch (e) { return []; }
    }

    async buildDirTree(entries, parentPath) {
        const result = [];
        for (const e of entries) {
            const name = e.name || (e.path || '').split('/').pop();
            const path = parentPath.replace(/\/$/, '') + '/' + name;
            if (e.isDirectory) {
                let children = [];
                try { children = await this.buildDirTree(await this.fs.readDir(path), path); } catch (_) {}
                result.push({ name, path, type: 'folder', children });
            } else {
                result.push({ name, path, type: 'file' });
            }
        }
        return result.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return (a.name || '').localeCompare(b.name || '');
        });
    }

    async createFileAtPath(filePath) {
        return this.writeFile(filePath, '');
    }

    async createFolderAtPath(folderPath) {
        if (!this.fs) return false;
        try { await this.fs.createDir(folderPath, { recursive: true }); return true; } catch (e) { return false; }
    }

    async deleteItemAtPath(itemPath) {
        if (!this.fs) return false;
        try {
            try { await this.fs.removeFile(itemPath); return true; } catch (e) {
                await this.fs.removeDir(itemPath, { recursive: true }); return true;
            }
        } catch (e) { return false; }
    }

    async renameItemAtPath(oldPath, newPath) {
        if (!this.fs) return false;
        try {
            const targetDir = newPath.substring(0, newPath.lastIndexOf('/'));
            if (targetDir) await this.createFolderAtPath(targetDir);
            if (this.fs.renameItem) {
                await this.fs.renameItem(oldPath, newPath);
                return true;
            }
        } catch (e) { }

        try {
            const content = await this.fs.readTextFile(oldPath);
            await this.fs.writeTextFile(newPath, content);
            await this.fs.removeFile(oldPath);
            return true;
        } catch (e) { return false; }
    }

    async revealInFinder(path) {
        if (!this.invoke) return;
        try { await this.invoke('reveal_in_finder', { path }); } catch (e) { console.error('Reveal in finder failed:', e); }
    }

    async refreshSavedScripts() {
        if (!this.opiumwareScriptsPath) return;
        try {
            await this.createFolderAtPath(this.opiumwareScriptsPath);
            const tree = await this.readDirectory(this.opiumwareScriptsPath);
            this.savedScripts = tree;
            this.scheduleExplorerUpdate();
        } catch (e) { console.error('Failed to load saved scripts:', e); }
    }

    async renderLocalScripts() {
        const list = $('localScriptsList');
        const count = $('localScriptsCount');
        if (!list) return;
        list.innerHTML = '';
        if (count) count.textContent = this.countTreeItems(this.savedScripts);
        if (!Array.isArray(this.savedScripts) || this.savedScripts.length === 0) { list.innerHTML = '<div class="empty-hint">No scripts yet</div>'; return; }

        const autoexecNames = new Set();
        if (this.autoexecPath) {
            try {
                const autoExecEntries = await this.readDirectory(this.autoexecPath);
                autoExecEntries.forEach(e => { if (e.type === 'file') autoexecNames.add(e.name); });
            } catch (e) { }
        }

        this.renderSavedScriptsTree(this.savedScripts, list, autoexecNames, 0);
        this.refreshLucideIcons();
    }

    renderSavedScriptsTree(items, container, autoexecNames, indent = 0) {
        for (const item of items) {
            if (item.type === 'folder') {
                const folderEl = document.createElement('div');
                folderEl.className = 'folder-item expanded';
                folderEl.dataset.path = item.path;
                folderEl.dataset.source = 'saved';
                folderEl.style.paddingLeft = `${8 + indent * 16}px`;
                folderEl.innerHTML = `<i data-lucide="chevron-right" class="chevron"></i><i data-lucide="folder-open" class="file-icon"></i><span class="file-name">${this.escapeHtml(item.name || 'Folder')}</span>`;
                folderEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    folderEl.classList.toggle('expanded');
                    const folderIcon = folderEl.querySelector('.file-icon');
                    if (folderIcon) folderIcon.setAttribute('data-lucide', folderEl.classList.contains('expanded') ? 'folder-open' : 'folder');
                    this.refreshLucideIcons();
                });
                folderEl.addEventListener('dblclick', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await this.openFolderByPath(item.path);
                });
                folderEl.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showContextMenu(e);
                });
                container.appendChild(folderEl);

                const childrenEl = document.createElement('div');
                childrenEl.className = 'folder-children';
                this.renderSavedScriptsTree(item.children || [], childrenEl, autoexecNames, indent + 1);
                container.appendChild(childrenEl);
                continue;
            }

            const file = item;
            const openTab = this.tabs.find(t => t.path === file.path);
            const isActive = openTab && openTab.id === this.activeTabId;
            const isModified = openTab && openTab.modified;
            const isAutoexec = autoexecNames.has(file.name);
            const isOpened = !!openTab;
            let indicators = '';
            if (isModified) indicators += '<span class="status-dot modified" title="Modified"></span>';
            if (isAutoexec) indicators += '<i data-lucide="zap" class="status-icon autoexec" title="Autoexec"></i>';
            if (isOpened && !isModified) indicators += '<span class="status-dot opened" title="Opened"></span>';
            const fileEl = document.createElement('div');
            fileEl.className = `tree-file ${isActive ? 'active' : ''}`;
            fileEl.draggable = false;
            fileEl.dataset.path = file.path;
            fileEl.dataset.source = 'saved';
            fileEl.style.paddingLeft = `${24 + indent * 16}px`;
            fileEl.innerHTML = `<i data-lucide="${this.getFileIconName(file.name)}" class="file-icon"></i><span class="file-name">${this.escapeHtml(file.name || 'Untitled')}</span><button class="script-execute-btn" title="Execute"><i data-lucide="play"></i></button>${indicators ? '<div class="file-status-indicators">' + indicators + '</div>' : ''}`;
            fileEl.addEventListener('click', () => this.openFileFromPath(file.path));
            fileEl.querySelector('.script-execute-btn').addEventListener('click', (e) => { e.stopPropagation(); this.executeScriptFromPath(file.path, file.name); });
            fileEl.addEventListener('contextmenu', (e) => this.showSavedScriptContextMenu(e, file));
            container.appendChild(fileEl);
        }
    }

    flattenTree(tree) {
        const files = [];
        for (const item of tree) {
            if (item.type === 'file') files.push(item);
            else if (item.children) files.push(...this.flattenTree(item.children));
        }
        return files;
    }

    countTreeItems(tree) {
        if (!Array.isArray(tree)) return 0;
        let total = 0;
        for (const item of tree) {
            total += 1;
            if (item.children) total += this.countTreeItems(item.children);
        }
        return total;
    }

    async getAutoexecScripts() {
        if (!this.autoexecPath) return [];
        try {
            await this.createFolderAtPath(this.autoexecPath);
            const entries = await this.readDirectory(this.autoexecPath);
            return entries.filter(e => e.type === 'file');
        } catch (e) { return []; }
    }

    async toggleAutoexec(filePath, fileName) {
        if (!this.autoexecPath) return;
        const autoexecFilePath = this.autoexecPath + '/' + fileName;
        try {
            const content = await this.readFile(autoexecFilePath);
            if (content !== null) {
                await this.fs.removeFile(autoexecFilePath);
                this.updateConsoleOutput(`Removed ${fileName} from autoexec`, 'info');
            } else {
                const srcContent = await this.readFile(filePath);
                if (srcContent !== null) {
                    await this.writeFile(autoexecFilePath, srcContent);
                    this.updateConsoleOutput(`Added ${fileName} to autoexec`, 'info');
                }
            }
            await this.refreshSavedScripts();
            await this.renderAutoexecList();
        } catch (e) { this.showToast('Failed to toggle autoexec: ' + e, 'error'); }
    }

    async renderAutoexecList() {
        const list = $('autoexecList');
        if (!list) return;
        const scripts = await this.getAutoexecScripts();
        if (scripts.length === 0) { list.innerHTML = '<div class="autoexec-empty">No autoexec scripts</div>'; return; }
        list.innerHTML = '';
        for (const script of scripts) {
            const item = document.createElement('div');
            item.className = 'autoexec-item';
            item.innerHTML = `<i data-lucide="${this.getFileIconName(script.name)}" class="file-icon"></i><span class="file-name">${script.name}</span><button class="remove-btn" title="Remove"><i data-lucide="x"></i></button>`;
            item.querySelector('.file-name').addEventListener('click', () => {
                const srcPath = this.opiumwareScriptsPath + '/' + script.name;
                this.openFileFromPath(srcPath);
            });
            item.querySelector('.remove-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                try { await this.fs.removeFile(script.path); this.updateConsoleOutput(`Removed ${script.name} from autoexec`, 'info'); await this.renderAutoexecList(); await this.renderLocalScripts(); } catch (err) { }
            });
            list.appendChild(item);
        }
        this.refreshLucideIcons();
    }

    async executeScript() {
        const tab = this.tabs.find(t => t.id === this.activeTabId);
        const script = this.editor?.getValue() || '';
        const fileName = tab?.name || 'Untitled';
        this.updateConsoleOutput(`Executing: ${fileName}`, 'info');
        await this.runScript(script, fileName);
    }

    async executeScriptFromPath(filePath, name) {
        const content = await this.readFile(filePath);
        if (content !== null) {
            this.updateConsoleOutput(`Executing: ${name}`, 'info');
            await this.runScript(content, name);
        } else {
            this.updateConsoleOutput(`Failed to read: ${name}`, 'error');
        }
    }

    async runScript(content, name) {
        if (!this.invoke) { this.updateConsoleOutput('Script execution not available', 'warning'); return; }
        try {
            const instances = await this.invoke('scan_opiumware_instances');
            if (!Array.isArray(instances) || instances.length === 0) {
                this.showToast('No Opiumware instances found.', 'error');
                this.updateConsoleOutput('No Opiumware instances found.', 'error');
                return;
            }
            let selectedPort = instances[0].port;
            if (instances.length > 1 && this.selectedPort === 'auto') {
                selectedPort = await this.showExecuteTargetDialog(instances);
                if (!selectedPort) return;
            } else if (this.selectedPort !== 'auto') {
                selectedPort = parseInt(this.selectedPort);
            }
            await this.invoke('send_opiumware_script', { script: content, port: selectedPort });
            this.showToast(`Executed ${name} on port ${selectedPort}`, 'success');
            this.updateConsoleOutput(`Executed ${name} on port ${selectedPort}`, 'success');
        } catch (err) {
            this.showToast(`Execution failed: ${err}`, 'error');
            this.updateConsoleOutput(`Execution failed: ${err}`, 'error');
        }
    }

    showExecuteTargetDialog(instances) {
        return new Promise((resolve) => {
            const modal = $('executeTargetModal');
            const list = $('executeTargetList');
            if (!modal || !list) { resolve(instances[0]?.port || null); return; }
            list.innerHTML = '';
            for (const inst of instances) {
                const item = document.createElement('div');
                item.className = 'execute-target-item';
                const previewUrl = inst.previewDataUrl || '';
                item.innerHTML = `${previewUrl ? `<img src="${previewUrl}" alt="">` : '<div style="width:48px;height:48px;background:var(--bg-active);border-radius:6px;"></div>'}<div class="execute-target-info"><div class="execute-target-title">${this.escapeHtml(inst.title || 'Roblox')}</div><div class="execute-target-port">Port ${inst.port} | PID ${inst.pid || '?'}</div></div>`;
                item.addEventListener('click', () => { modal.classList.add('hidden'); resolve(inst.port); });
                list.appendChild(item);
            }
            modal.classList.remove('hidden');
            modal.addEventListener('click', (e) => { if (e.target === modal) { modal.classList.add('hidden'); resolve(null); } }, { once: true });
        });
    }

    getQuickScriptUrl(id) {
        const urls = {
            'infiniteyield': 'https://raw.githubusercontent.com/JadXV/OpiumwareResources/refs/heads/main/modules/infinite_yield.lua',
            'dexexplorer': 'https://raw.githubusercontent.com/JadXV/OpiumwareResources/refs/heads/main/modules/dex_explorer.lua',
            'simplespy': 'https://raw.githubusercontent.com/JadXV/OpiumwareResources/refs/heads/main/modules/simple_spy.lua',
            'projectautov6': 'https://raw.githubusercontent.com/JadXV/OpiumwareResources/refs/heads/main/modules/project_auto_v6.lua',
            'morfos': 'https://raw.githubusercontent.com/JadXV/OpiumwareResources/refs/heads/main/modules/morfos.lua',
        };
        return urls[id] || null;
    }

    async executeQuickScript(scriptId) {
        const url = this.getQuickScriptUrl(scriptId);
        if (!url) { this.showToast('Unknown quick script', 'error'); return; }
        try {
            this.showToast(`Loading ${scriptId}...`, 'info');
            const resp = await fetch(url);
            const script = await resp.text();
            await this.runScript(script, scriptId);
        } catch (e) { this.showToast(`Quick script failed: ${e}`, 'error'); }
    }

    updateConsoleOutput(message, type = 'output') {
        const output = $('consoleOutput');
        if (!output) return;
        const line = document.createElement('div');
        line.className = 'console-line';
        const prefixMap = { 'error': ['log-error', '[Error]: '], 'warning': ['log-warning', '[Warning]: '], 'info': ['log-info', '[Info]: '], 'success': ['log-success', '[Success]: '] };
        const [cls, txt] = prefixMap[type] || ['log-output', '[Output]: '];
        const prefix = document.createElement('span');
        prefix.className = cls;
        prefix.textContent = txt;
        const text = document.createElement('span');
        text.className = 'log-text';
        text.textContent = message;
        line.appendChild(prefix);
        line.appendChild(text);
        output.appendChild(line);
        output.scrollTop = output.scrollHeight;
    }

    clearActivePanel() {
        const activePanel = document.querySelector('.panel-tab.active');
        if (!activePanel) return;
        const target = activePanel.dataset.panelTarget;
        if (target === 'console') { const o = $('consoleOutput'); if (o) o.innerHTML = ''; }
        else if (target === 'terminal') { const o = $('terminalOutput'); if (o) o.innerHTML = ''; }
        else if (target === 'rconsole') { const o = $('rconsoleOutput'); if (o) o.innerHTML = ''; }
    }

    async executeTerminalCommand(commandText) {
        if (!this.invoke || !commandText.trim()) return;
        const output = $('terminalOutput');
        if (!output) return;
        const cmdLine = document.createElement('div');
        cmdLine.className = 'console-line';
        cmdLine.innerHTML = `<span class="log-info">$ </span><span class="log-text">${this.escapeHtml(commandText)}</span>`;
        output.appendChild(cmdLine);
        try {
            const result = await this.invoke('run_console_command', { commandText, cwd: this.opiumwareScriptsPath });
            if (result.stdout) { const l = document.createElement('div'); l.className = 'console-line'; l.innerHTML = `<span class="log-text">${this.escapeHtml(result.stdout)}</span>`; output.appendChild(l); }
            if (result.stderr) { const l = document.createElement('div'); l.className = 'console-line'; l.innerHTML = `<span class="log-error">${this.escapeHtml(result.stderr)}</span>`; output.appendChild(l); }
        } catch (e) {
            const l = document.createElement('div'); l.className = 'console-line'; l.innerHTML = `<span class="log-error">Error: ${this.escapeHtml(String(e))}</span>`; output.appendChild(l);
        }
        output.scrollTop = output.scrollHeight;
    }

    async startRobloxLogMonitor() {
        if (!this.invoke || localStorage.getItem('opiumware-robloxlog') === 'false') return;
        try {
            const startupLines = await this.invoke('start_roblox_log_monitor');
            if (startupLines && startupLines.length) {
                startupLines.forEach(line => this.updateConsoleOutput(line, 'info'));
            }
            this.robloxLogMonitorActive = true;
            this.pollRobloxLogs();
        } catch (e) { console.warn('Failed to start Roblox log monitor:', e); }
    }

    async pollRobloxLogs() {
        if (!this.robloxLogMonitorActive || !this.invoke) return;
        try {
            const lines = await this.invoke('poll_roblox_log_monitor');
            if (lines && lines.length) {
                lines.forEach(line => this.updateConsoleOutput(line, 'output'));
            }
        } catch (e) { }
        this.robloxLogMonitorTimer = setTimeout(() => this.pollRobloxLogs(), 300);
    }

    stopRobloxLogMonitor() {
        this.robloxLogMonitorActive = false;
        if (this.robloxLogMonitorTimer) { clearTimeout(this.robloxLogMonitorTimer); this.robloxLogMonitorTimer = null; }
        if (this.invoke) this.invoke('stop_roblox_log_monitor').catch(() => {});
    }

    async startDecompilerServer() {
        if (!this.invoke) return;
        try { await this.invoke('start_server'); } catch (e) { console.warn('Decompiler server:', e); }
    }

    scheduleEditorStateSave() {
        if (this.editorStateSaveTimer) clearTimeout(this.editorStateSaveTimer);
        this.editorStateSaveTimer = setTimeout(() => this.saveEditorState(), 500);
    }

    async saveEditorState() {
        if (!this.invoke) return;
        try {
            const state = {
                version: 1,
                tabs: this.tabs.slice(0, 64).map(t => ({
                    id: t.id, path: t.path, name: t.name, content: t.id === this.activeTabId && this.editor ? this.editor.getValue() : t.content, language: t.language, modified: t.modified
                })),
                activeTabId: this.activeTabId,
            };
            await this.invoke('save_editor_state', { stateJson: JSON.stringify(state) });
        } catch (e) { }
    }

    async restoreEditorState() {
        if (!this.invoke) return;
        try {
            const raw = await this.invoke('load_editor_state');
            if (!raw || !raw.trim()) return;
            const state = JSON.parse(raw);
            if (!state || !state.tabs || !state.tabs.length) return;
            for (const t of state.tabs) {
                if (!t.name) continue;
                this.tabs.push({ id: t.id || Date.now().toString() + Math.random(), path: t.path, name: t.name, content: t.content || '', language: t.language || 'lua', modified: false });
            }
            if (this.tabs.length > 0) {
                this.renderTabs();
                const target = state.activeTabId && this.tabs.find(t => t.id === state.activeTabId) ? state.activeTabId : this.tabs[0].id;
                this.switchToTab(target);
                this.hideWelcome();
            }
        } catch (e) { console.warn('Failed to restore editor state:', e); }
    }

    async sendAiMessage() {
        if (this.aiSending) return;
        const input = $('aiInput');
        const userMessage = input?.value?.trim();
        if (!userMessage) return;
        input.value = '';

        this.aiMessages.push({ role: 'user', content: userMessage });
        this.renderAiChat();

        this.aiSending = true;
        const sendBtn = $('aiSendBtn');
        if (sendBtn) sendBtn.disabled = true;
        const progress = $('aiProgress');
        if (progress) progress.hidden = false;

        try {
            const context = { openTabs: this.tabs.map(t => ({ name: t.name, language: t.language })) };
            if (this.activeTabId && this.editor) {
                const activeTab = this.tabs.find(t => t.id === this.activeTabId);
                if (activeTab) {
                    context.activeFile = activeTab.name;
                    context.selection = this.editor.getModel()?.getValueInRange(this.editor.getSelection()) || '';
                }
            }

            const result = await this.invoke('opiumware_ai_chat', {
                messages: this.aiMessages.map(m => ({ role: m.role, content: m.content })),
                context,
                model: null,
                useDocsIndex: true,
            });

            const content = result.content || 'No response.';
            const sources = result.sources || [];
            this.aiMessages.push({ role: 'assistant', content, sources });
            this.renderAiChat();
        } catch (e) {
            this.aiMessages.push({ role: 'assistant', content: `Error: ${e}` });
            this.renderAiChat();
        } finally {
            this.aiSending = false;
            if (sendBtn) sendBtn.disabled = false;
            if (progress) progress.hidden = true;
        }
    }

    renderAiChat() {
        const chat = $('aiChat');
        if (!chat) return;
        chat.innerHTML = '';
        if (this.aiMessages.length === 0) {
            chat.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px;">Ask OpiumwareAI about Roblox scripting, Lua, or your code.</div>';
            return;
        }
        for (const msg of this.aiMessages) {
            const el = document.createElement('div');
            el.className = `ai-message ${msg.role}`;
            el.innerHTML = this.escapeHtml(msg.content).replace(/\n/g, '<br>');
            if (msg.sources && msg.sources.length) {
                const sourcesEl = document.createElement('div');
                sourcesEl.className = 'ai-sources';
                sourcesEl.textContent = `Sources: ${msg.sources.map(s => s.title || s.source_id || '').filter(Boolean).join(', ')}`;
                el.appendChild(sourcesEl);
            }
            chat.appendChild(el);
        }
        chat.scrollTop = chat.scrollHeight;
    }

    async loadAiDocsStatus() {
        if (!this.invoke) return;
        try {
            const result = await this.invoke('get_opiumware_ai_docs_status');
            const status = $('aiDocsStatus');
            if (status && result) {
                if (result.ready) {
                    status.textContent = `Docs: ${result.chunkCount || 0} chunks indexed (${result.sourceCount || 0} sources)`;
                    status.classList.add('visible');
                }
            }
        } catch (e) { console.warn('Failed to load AI docs status:', e); }
    }

    async refreshAiDocsIndex() {
        if (!this.invoke) return;
        const status = $('aiDocsStatus');
        if (status) { status.textContent = 'Refreshing docs index...'; status.classList.add('visible'); }
        try {
            const result = await this.invoke('refresh_opiumware_ai_docs_index');
            if (status) { status.textContent = `Docs: ${result.chunkCount || 0} chunks indexed (${result.sourceCount || 0} sources)`; status.classList.add('visible'); }
            this.showToast('AI docs index refreshed', 'success');
        } catch (e) {
            this.showToast('Failed to refresh AI docs: ' + e, 'error');
            if (status) status.classList.remove('visible');
        }
    }

    initPortSelector() {
        const selectorBtn = $('portSelectorBtn');
        const dropdown = $('portSelectorDropdown');
        if (!selectorBtn || !dropdown) return;

        selectorBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
            $('portSelector')?.classList.toggle('open');
            if (dropdown.classList.contains('show')) this.refreshPortStatus();
        });

        document.addEventListener('click', (e) => {
            if (!$('portSelector')?.contains(e.target)) { dropdown.classList.remove('show'); $('portSelector')?.classList.remove('open'); }
        });

        const autoOption = dropdown.querySelector('.port-selector-item[data-port="auto"]');
        if (autoOption) autoOption.addEventListener('click', () => this.selectPort('auto', 'All Instances'));

        if (this.invoke) setTimeout(() => this.refreshPortStatus(), 1000);
    }

    async refreshPortStatus() {
        if (!this.invoke) return;
        const portList = $('portList');
        if (!portList) return;
        try {
            const instances = await this.invoke('scan_opiumware_instances');
            portList.innerHTML = '';
            if (!instances || instances.length === 0) {
                portList.innerHTML = '<div class="port-selector-empty">No instances detected</div>';
            } else {
                instances.forEach(inst => {
                    const item = document.createElement('div');
                    item.className = 'port-selector-item' + (this.selectedPort === String(inst.port) ? ' selected' : '');
                    item.setAttribute('data-port', String(inst.port));
                    const label = inst.title || `Port ${inst.port}`;
                    item.innerHTML = `<span class="port-selector-radio"></span><span>${this.escapeHtml(label)}</span>`;
                    item.addEventListener('click', () => this.selectPort(String(inst.port), label));
                    portList.appendChild(item);
                });
            }
        } catch (e) { portList.innerHTML = '<div class="port-selector-empty">Scan failed</div>'; }
    }

    selectPort(port, label) {
        this.selectedPort = port;
        const labelEl = $('portSelectorLabel');
        if (labelEl) labelEl.textContent = port === 'auto' ? 'All Instances' : label;
        document.querySelectorAll('.port-selector-item').forEach(item => {
            item.classList.toggle('selected', item.getAttribute('data-port') === port);
        });
        $('portSelectorDropdown')?.classList.remove('show');
        $('portSelector')?.classList.remove('open');
    }

    bindEvents() {
        const titleBar = document.querySelector('.title-bar');
        if (titleBar && this.appWindow) {
            titleBar.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                if (e.target.closest('.title-bar-center, .title-bar-right')) return;
                this.appWindow.startDragging();
            });
        }

        const searchInput = $('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.performFileSearch(e.target.value));
            searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.performFileSearch(e.target.value); });
        }

        document.querySelectorAll('.activity-icon[data-panel]').forEach(icon => icon.addEventListener('click', () => this.switchPanel(icon.dataset.panel)));
        document.querySelectorAll('.section-header.collapsible').forEach(header => header.addEventListener('click', () => header.classList.toggle('collapsed')));

        $('quickOpenTrigger')?.addEventListener('click', () => this.showQuickOpen());
        $('quickOpenModal')?.addEventListener('click', (e) => { if (e.target.id === 'quickOpenModal') this.hideQuickOpen(); });
        $('quickOpenSearch')?.addEventListener('input', (e) => this.filterQuickOpen(e.target.value));
        $('quickOpenSearch')?.addEventListener('keydown', (e) => this.handleQuickOpenKeydown(e));

        $('goToLineModal')?.addEventListener('click', (e) => { if (e.target.id === 'goToLineModal') this.hideGoToLine(); });
        $('goToLineInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { const line = parseInt(e.target.value); if (!isNaN(line) && this.editor) { this.editor.setPosition({ lineNumber: line, column: 1 }); this.editor.revealLineInCenter(line); } this.hideGoToLine(); }
            else if (e.key === 'Escape') this.hideGoToLine();
        });

        document.addEventListener('click', () => this.hideContextMenu());
        document.querySelectorAll('#contextMenu .context-item').forEach(item => item.addEventListener('click', () => this.handleContextAction(item.dataset.action)));
        document.querySelectorAll('#savedScriptsContextMenu .context-item').forEach(item => item.addEventListener('click', () => this.handleSavedScriptContextAction(item.dataset.action)));

        $('newFileBtn')?.addEventListener('click', () => this.createNewFileInFolder());
        $('newFolderBtn')?.addEventListener('click', () => this.createNewFolder());
        $('refreshBtn')?.addEventListener('click', () => this.refreshSavedScripts());
        $('addFolderBtn')?.addEventListener('click', () => this.addFolder());
        $('folderBackBtn')?.addEventListener('click', () => this.showDefaultExplorer());
        $('folderNewFileBtn')?.addEventListener('click', () => this.createNewFileInFolder());
        $('folderNewFolderBtn')?.addEventListener('click', () => this.createNewFolder());
        $('folderRefreshBtn')?.addEventListener('click', () => this.refreshFolders());

        $('minimapCheckbox')?.addEventListener('change', (e) => { this.editor?.updateOptions({ minimap: { enabled: e.target.checked } }); localStorage.setItem('opiumware-minimap', e.target.checked); });
        $('wordWrapCheckbox')?.addEventListener('change', (e) => { this.editor?.updateOptions({ wordWrap: e.target.checked ? 'on' : 'off' }); localStorage.setItem('opiumware-wordwrap', e.target.checked); });
        $('luauLspCheckbox')?.addEventListener('change', (e) => { this.luauLspEnabled = e.target.checked; localStorage.setItem('opiumware-luaulsp', e.target.checked); if (!e.target.checked && this.editor) monaco.editor.setModelMarkers(this.editor.getModel(), 'luau-lsp', []); });
        $('intellisenseCheckbox')?.addEventListener('change', (e) => { this.intellisenseEnabled = e.target.checked; localStorage.setItem('opiumware-intellisense', e.target.checked); this.editor?.updateOptions({ quickSuggestions: e.target.checked, suggestOnTriggerCharacters: e.target.checked }); });
        $('alwaysOnTopCheckbox')?.addEventListener('change', (e) => { localStorage.setItem('opiumware-alwaysontop', e.target.checked); if (this.appWindow) this.appWindow.setAlwaysOnTop(e.target.checked); });
        $('robloxLogCheckbox')?.addEventListener('change', (e) => { localStorage.setItem('opiumware-robloxlog', e.target.checked); if (e.target.checked) this.startRobloxLogMonitor(); else this.stopRobloxLogMonitor(); });

        document.querySelectorAll('input[name="theme"]').forEach(radio => radio.addEventListener('change', (e) => this.applyTheme(e.target.value)));

        document.querySelectorAll('.quick-script-btn').forEach(btn => btn.addEventListener('click', () => this.executeQuickScript(btn.dataset.script)));

        $('robloxBtn')?.addEventListener('click', () => this.launchRoblox());
        $('executeBtn')?.addEventListener('click', () => this.executeScript());
        $('consoleClearBtn')?.addEventListener('click', () => this.clearActivePanel());
        $('panelToggleBtn')?.addEventListener('click', () => this.toggleBottomPanel());
        $('welcomeNewFile')?.addEventListener('click', () => this.createNewFile());
        $('welcomeOpenFolder')?.addEventListener('click', () => this.addFolder());
        $('replaceBtn')?.addEventListener('click', () => this.replaceNext());
        $('replaceAllBtn')?.addEventListener('click', () => this.replaceAll());
        $('openScriptsFolderBtn')?.addEventListener('click', () => { if (this.opiumwareScriptsPath) this.revealInFinder(this.opiumwareScriptsPath); });
        $('openAutoexecFolderBtn')?.addEventListener('click', () => { if (this.autoexecPath) this.revealInFinder(this.autoexecPath); });
        $('toolbarOpenWorkspace')?.addEventListener('click', () => { if (this.opiumwareScriptsPath) this.revealInFinder(this.opiumwareScriptsPath); });
        $('toolbarOpenAutoexec')?.addEventListener('click', () => { if (this.autoexecPath) this.revealInFinder(this.autoexecPath); });
        $('openOpiumwareFolderBtn')?.addEventListener('click', async () => { if (this.path) { const h = await this.path.homeDir(); this.revealInFinder(h + 'Opiumware'); } });

        $('aiSendBtn')?.addEventListener('click', () => this.sendAiMessage());
        $('aiInput')?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendAiMessage(); } });
        $('aiDocsRefreshBtn')?.addEventListener('click', () => this.refreshAiDocsIndex());
        $('aiClearMemoryBtn')?.addEventListener('click', () => { this.aiMessages = []; this.renderAiChat(); this.showToast('AI memory cleared', 'info'); });

        $('scripthubSearchInput')?.addEventListener('input', (e) => this.searchScripts(e.target.value));
        $('scripthubSearchInput')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.searchScripts(e.target.value); });

        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchPanelTab(tab.dataset.panelTarget));
        });

        $('terminalCommandInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { const val = e.target.value; e.target.value = ''; this.terminalHistory.push(val); this.terminalHistoryIndex = this.terminalHistory.length; this.executeTerminalCommand(val); }
            else if (e.key === 'ArrowUp') { if (this.terminalHistoryIndex > 0) { this.terminalHistoryIndex--; e.target.value = this.terminalHistory[this.terminalHistoryIndex] || ''; } e.preventDefault(); }
            else if (e.key === 'ArrowDown') { if (this.terminalHistoryIndex < this.terminalHistory.length - 1) { this.terminalHistoryIndex++; e.target.value = this.terminalHistory[this.terminalHistoryIndex] || ''; } else { this.terminalHistoryIndex = this.terminalHistory.length; e.target.value = ''; } e.preventDefault(); }
        });

        $('rconsoleInputField')?.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && this.pendingRconsoleInputRequestId != null) {
                const value = e.target.value;
                e.target.value = '';
                try {
                    await this.invoke('submit_rconsole_input', { requestId: this.pendingRconsoleInputRequestId, value });
                    this.pendingRconsoleInputRequestId = null;
                    $('rconsoleInputRow')?.classList.add('hidden');
                } catch (err) { console.error('Failed to submit rconsole input:', err); }
            }
        });

        this.initSidebarResize();
        this.setupDropZones();
    }

    switchPanelTab(target) {
        document.querySelectorAll('.panel-tab').forEach(t => t.classList.toggle('active', t.dataset.panelTarget === target));
        document.querySelectorAll('.panel-tab-content').forEach(c => c.classList.toggle('active', c.id === target + 'Content'));
    }

    toggleBottomPanel() {
        const panel = $('bottomPanel');
        if (panel) panel.classList.toggle('minimized');
    }

    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const modifier = isMac ? e.metaKey : e.ctrlKey;
            if (modifier && e.key === 'f') { e.preventDefault(); this.switchPanel('search'); $('searchInput')?.focus(); }
            else if (modifier && e.key === 'o') { e.preventDefault(); this.openFileDialog(); }
            else if (modifier && e.key === 'p') { e.preventDefault(); this.showQuickOpen(); }
            else if (modifier && e.shiftKey && e.key === 'e') { e.preventDefault(); this.executeScript(); }
            else if (modifier && e.key === 's') { e.preventDefault(); e.shiftKey ? this.saveCurrentFileAs() : this.saveCurrentFile(); }
            else if (modifier && e.key === 't') { e.preventDefault(); this.createNewFile(); }
            else if (modifier && e.key === 'w') { e.preventDefault(); this.closeActiveTab(); }
            else if (modifier && e.key === 'b') { e.preventDefault(); this.toggleSidebar(); }
            else if (modifier && e.key === 'g') { e.preventDefault(); this.showGoToLine(); }
            else if (modifier && e.key === '`') { e.preventDefault(); this.toggleBottomPanel(); }
            else if (e.key === 'Escape') { this.hideQuickOpen(); this.hideGoToLine(); this.hideContextMenu(); }
        }, true);
    }

    async performFileSearch(query) {
        const resultsContainer = $('searchResults');
        resultsContainer.innerHTML = '';
        if (!query?.trim()) return;
        let filesToSearch = [];
        for (const tab of this.tabs) {
            let content = tab.content;
            if (this.activeTabId === tab.id && this.editor) content = this.editor.getValue();
            filesToSearch.push({ name: tab.name, path: tab.path || `untitled:${tab.id}`, content, isTab: true, tabId: tab.id });
        }
        const savedFiles = this.flattenTree(this.savedScripts);
        for (const file of savedFiles) { if (!filesToSearch.some(f => f.path === file.path)) filesToSearch.push(file); }
        if (this.allFiles.length > 0) { for (const file of this.allFiles) { if (!filesToSearch.some(f => f.path === file.path)) filesToSearch.push(file); } }

        let totalMatches = 0;
        for (const file of filesToSearch) {
            if (!file.name) continue;
            if (!/\.(lua|luau|txt|js|json|md|py|ts|c|cpp|cs|java|rb|sh|toml|yaml|yml|css|html)$/i.test(file.name) && !file.isTab) continue;
            try {
                let content = file.content;
                if (content == null) content = await this.readFile(file.path);
                if (!content) continue;
                const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                let match, matchCount = 0, lineMatches = [];
                const lines = content.split(/\r?\n/);
                for (let i = 0; i < lines.length; i++) {
                    let line = lines[i], lineMatch = false, lineHtml = '', lastIndex = 0;
                    regex.lastIndex = 0;
                    while ((match = regex.exec(line)) !== null) { lineMatch = true; matchCount++; lineHtml += this.escapeHtml(line.substring(lastIndex, match.index)) + `<span class="search-highlight">${this.escapeHtml(match[0])}</span>`; lastIndex = match.index + match[0].length; }
                    if (lineMatch) { lineHtml += this.escapeHtml(line.substring(lastIndex)); lineMatches.push({ lineNumber: i + 1, lineHtml }); }
                }
                if (matchCount > 0) {
                    totalMatches += matchCount;
                    const resultEl = document.createElement('div');
                    resultEl.className = 'search-result-file';
                    resultEl.innerHTML = `<span class="search-result-filename">${file.name}</span> <span class="search-result-count">${matchCount}</span>`;
                    const linesEl = document.createElement('div');
                    linesEl.className = 'search-result-lines';
                    for (const ml of lineMatches) {
                        const lineEl = document.createElement('div');
                        lineEl.className = 'search-result-line';
                        lineEl.innerHTML = `<span style="color:var(--text-muted);margin-right:8px;">${ml.lineNumber}</span>${ml.lineHtml}`;
                        lineEl.addEventListener('click', (e) => { e.stopPropagation(); if (file.isTab) { this.switchToTab(file.tabId); setTimeout(() => { if (this.editor) { this.editor.revealLineInCenter(ml.lineNumber); this.editor.setPosition({ lineNumber: ml.lineNumber, column: 1 }); this.editor.focus(); } }, 50); } else { this.openFileFromPath(file.path, ml.lineNumber); } });
                        linesEl.appendChild(lineEl);
                    }
                    resultEl.appendChild(linesEl);
                    resultEl.addEventListener('click', () => { if (file.isTab) this.switchToTab(file.tabId); else this.openFileFromPath(file.path); });
                    resultsContainer.appendChild(resultEl);
                }
            } catch (e) { }
        }
        if (totalMatches === 0) resultsContainer.innerHTML = '<div class="search-no-results">No results found.</div>';
    }

    switchPanel(panelName) {
        document.querySelectorAll('.activity-icon[data-panel]').forEach(icon => icon.classList.toggle('active', icon.dataset.panel === panelName));
        document.querySelectorAll('.sidebar-panel').forEach(panel => panel.classList.add('hidden'));
        $(`${panelName}Panel`)?.classList.remove('hidden');
        if (panelName === 'autoexec') this.renderAutoexecList();
        if (panelName === 'opiumwareai') this.renderAiChat();
    }

    toggleSidebar() {
        const sidebar = $('sidebar');
        if (sidebar.offsetWidth > 0) {
            sidebar.dataset.prevWidth = sidebar.offsetWidth;
            sidebar.style.width = '0px'; sidebar.style.minWidth = '0px'; sidebar.style.borderRight = 'none';
        } else {
            sidebar.style.width = (sidebar.dataset.prevWidth || 270) + 'px'; sidebar.style.minWidth = '180px'; sidebar.style.borderRight = '';
        }
    }

    async openFileDialog() {
        if (!this.dialog) return;
        const selected = await this.dialog.open({ multiple: false, filters: [{ name: 'Scripts', extensions: ['lua', 'luau', 'txt', 'json', 'js', 'ts', 'py', 'rs', 'md', 'toml', 'yaml', 'yml', 'html', 'css'] }] });
        if (selected) {
            const content = await this.readFile(selected);
            if (content !== null) this.openFile(selected, content);
        }
    }

    async addFolder() {
        if (!this.dialog) return;
        const selected = await this.dialog.open({ directory: true });
        if (!selected) return;
        await this.openFolderByPath(selected);
    }

    async openFolderByPath(folderPath) {
        if (!folderPath) return;
        const tree = await this.readDirectory(folderPath);
        this.currentFolder = { path: folderPath, name: folderPath.split('/').pop(), tree };
        this.updateAllFiles();
        this.showFolderView();
    }

    showFolderView() {
        const title = $('folderViewTitle');
        if (title) title.textContent = (this.currentFolder?.name || 'FOLDER').toUpperCase();
        const container = $('folderTreeContent');
        if (container) {
            container.innerHTML = '';
            if (this.currentFolder) this.renderTreeItems(this.currentFolder.tree, container, 0);
        }
        $('explorerDefaultView')?.classList.add('hidden');
        $('explorerFoldersView')?.classList.remove('hidden');
        this.refreshLucideIcons();
    }

    showDefaultExplorer() {
        $('explorerFoldersView')?.classList.add('hidden');
        $('explorerDefaultView')?.classList.remove('hidden');
        this.refreshLucideIcons();
    }

    updateAllFiles() {
        this.allFiles = this.currentFolder ? this.flattenFileTree(this.currentFolder.tree, this.currentFolder.name) : [];
    }

    flattenFileTree(tree, parentPath = '') {
        let files = [];
        for (const item of tree) {
            const fullPath = parentPath ? `${parentPath}/${item.name}` : item.name;
            if (item.type === 'file') files.push({ ...item, relativePath: fullPath });
            else if (item.children) files = files.concat(this.flattenFileTree(item.children, fullPath));
        }
        return files;
    }

    async openFileFromPath(filePath, lineNumber = 1) {
        const existingTab = this.tabs.find(t => t.path === filePath);
        if (existingTab) {
            this.switchToTab(existingTab.id);
            setTimeout(() => { if (this.editor) { this.editor.revealLineInCenter(lineNumber); this.editor.setPosition({ lineNumber, column: 1 }); this.editor.focus(); } }, 50);
            return;
        }
        const content = await this.readFile(filePath);
        if (content !== null) {
            this.openFile(filePath, content);
            setTimeout(() => { if (this.editor && lineNumber > 1) { this.editor.revealLineInCenter(lineNumber); this.editor.setPosition({ lineNumber, column: 1 }); this.editor.focus(); } }, 100);
        }
    }

    openFile(filePath, content) {
        const existingTab = this.tabs.find(t => t.path === filePath);
        if (existingTab) { this.switchToTab(existingTab.id); return; }
        const tab = { id: Date.now().toString(), path: filePath, name: filePath.split('/').pop(), content, language: this.getLanguageFromPath(filePath), modified: false };
        this.tabs.push(tab);
        this.renderTabs();
        this.switchToTab(tab.id);
        this.hideWelcome();
    }

    createNewFile() {
        let baseName = 'Untitled', counter = 1, fileName = `${baseName}.lua`;
        const existingNames = new Set(this.tabs.map(t => t.name));
        while (existingNames.has(fileName)) { fileName = `${baseName}-${counter}.lua`; counter++; }
        const tab = { id: Date.now().toString(), path: null, name: fileName, content: '', language: 'lua', modified: true };
        this.tabs.push(tab);
        this.renderTabs();
        this.switchToTab(tab.id);
        this.hideWelcome();
    }

    createNewTab(name, content) {
        const tab = { id: Date.now().toString(), path: null, name, content, language: this.getLanguageFromPath(name), modified: true };
        this.tabs.push(tab);
        this.renderTabs();
        this.switchToTab(tab.id);
        this.hideWelcome();
    }

    async createNewFileInFolder(targetDir = null) {
        const targetFolder = targetDir || this.currentFolder?.path || this.opiumwareScriptsPath;
        if (!targetFolder) { this.createNewFile(); return; }
        const name = await this.showInputDialog('Enter file name:', 'script.lua');
        if (!name) return;
        const fullPath = targetFolder + '/' + name;
        if (await this.createFileAtPath(fullPath)) { await this.refreshFolders(); await this.refreshSavedScripts(); this.openFile(fullPath, ''); }
        else this.showToast('Failed to create file', 'error');
    }

    async createNewFolder(targetDir = null) {
        const targetFolder = targetDir || this.currentFolder?.path || this.opiumwareScriptsPath;
        if (!targetFolder) { this.showToast('Open a folder first', 'warning'); return; }
        const name = (await this.showInputDialog('Enter folder name:', 'New Folder'))?.trim();
        if (!name) return;
        if (await this.createFolderAtPath(targetFolder + '/' + name)) {
            await this.refreshFolders();
            await this.refreshSavedScripts();
        }
        else this.showToast('Failed to create folder', 'error');
    }

    async saveCurrentFile() {
        const tab = this.tabs.find(t => t.id === this.activeTabId);
        if (!tab) return;
        if (!tab.path) return this.saveCurrentFileAs();
        const content = this.editor.getValue();
        if (await this.writeFile(tab.path, content)) {
            tab.content = content; tab.modified = false; this.renderTabs(); this.scheduleEditorStateSave();
        }
    }

    async saveCurrentFileAs() {
        const tab = this.tabs.find(t => t.id === this.activeTabId);
        if (!tab) return;
        const result = await this.showSaveModal(tab.name || 'script.lua');
        if (!result) return;
        const content = this.editor.getValue();
        if (result.location === 'opiumware' && this.opiumwareScriptsPath) {
            const savePath = `${this.opiumwareScriptsPath}/${result.name}`;
            if (await this.writeFile(savePath, content)) {
                tab.path = savePath; tab.name = result.name; tab.language = this.getLanguageFromPath(savePath); tab.content = content; tab.modified = false;
                this.renderTabs(); await this.refreshSavedScripts();
                const model = this.editor.getModel(); monaco.editor.setModelLanguage(model, tab.language); this.updateLanguageStatus(tab.language);
            }
        } else if (this.dialog) {
            const filePath = await this.dialog.save({ defaultPath: result.name });
            if (filePath && await this.writeFile(filePath, content)) {
                tab.path = filePath; tab.name = filePath.split('/').pop(); tab.language = this.getLanguageFromPath(filePath); tab.content = content; tab.modified = false;
                this.renderTabs();
                const model = this.editor.getModel(); monaco.editor.setModelLanguage(model, tab.language); this.updateLanguageStatus(tab.language);
            }
        }
    }

    showSaveModal(defaultName) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'save-modal-overlay';
            overlay.innerHTML = `<div class="save-modal"><h3>Save Script</h3><div class="save-modal-input-container"><label>File Name</label><input type="text" class="save-modal-input" value="${defaultName}" placeholder="script.lua"></div><div class="save-modal-buttons"><button class="save-modal-btn save-modal-opiumware"><i data-lucide="folder-heart"></i><span>Save to Opiumware</span></button><button class="save-modal-btn save-modal-custom"><i data-lucide="folder-open"></i><span>Save to Custom Location</span></button></div><button class="save-modal-cancel">Cancel</button></div>`;
            document.body.appendChild(overlay); this.refreshLucideIcons();
            const input = overlay.querySelector('.save-modal-input'); input.focus(); input.select();
            const cleanup = (result) => { overlay.remove(); resolve(result); };
            overlay.querySelector('.save-modal-opiumware').addEventListener('click', () => cleanup({ location: 'opiumware', name: input.value.trim() || 'script.lua' }));
            overlay.querySelector('.save-modal-custom').addEventListener('click', () => cleanup({ location: 'custom', name: input.value.trim() || 'script.lua' }));
            overlay.querySelector('.save-modal-cancel').addEventListener('click', () => cleanup(null));
            overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(null); });
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') cleanup({ location: 'opiumware', name: input.value.trim() || 'script.lua' }); else if (e.key === 'Escape') cleanup(null); });
        });
    }

    async refreshFolders() {
        if (!this.currentFolder) return;
        this.currentFolder.tree = await this.readDirectory(this.currentFolder.path);
        this.updateAllFiles();
        if (!$('explorerFoldersView')?.classList.contains('hidden')) this.showFolderView();
    }

    renderTabs() {
        const container = $('tabsScroll');
        container.innerHTML = '';
        for (const tab of this.tabs) {
            const tabEl = document.createElement('div');
            tabEl.className = `tab ${tab.id === this.activeTabId ? 'active' : ''} ${tab.modified ? 'modified' : ''}`;
            tabEl.dataset.tabId = tab.id;
            tabEl.innerHTML = `<i data-lucide="${this.getFileIconName(tab.name)}" class="file-icon"></i><span class="tab-name">${tab.name}</span><span class="tab-close"><i data-lucide="x"></i></span><span class="tab-modified"></span>`;
            tabEl.addEventListener('click', (e) => { if (!e.target.closest('.tab-close')) this.switchToTab(tab.id); });
            tabEl.querySelector('.tab-close').addEventListener('click', (e) => { e.stopPropagation(); this.closeTab(tab.id); });
            container.appendChild(tabEl);
        }
        this.refreshLucideIcons();
        this.scheduleExplorerUpdate();
    }

    scheduleExplorerUpdate() {
        if (this.explorerUpdateTimeout) clearTimeout(this.explorerUpdateTimeout);
        this.explorerUpdateTimeout = setTimeout(() => { this.renderLocalScripts(); }, 50);
    }

    switchToTab(tabId) {
        if (this.activeTabId) {
            const currentTab = this.tabs.find(t => t.id === this.activeTabId);
            if (currentTab && this.editor) { currentTab.content = this.editor.getValue(); currentTab.viewState = this.editor.saveViewState(); }
        }
        this.activeTabId = tabId;
        const tab = this.tabs.find(t => t.id === tabId);
        if (tab) {
            const model = monaco.editor.createModel(tab.content, tab.language);
            this.editor.setModel(model);
            if (tab.viewState) this.editor.restoreViewState(tab.viewState);
            this.updateBreadcrumb(tab.path || tab.name);
            this.updateLanguageStatus(tab.language);
            this.renderTabs();
            this.editor.focus();
        }
    }

    async closeTab(tabId) {
        if (this.isClosingTab) return;
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;
        if (tab.modified) {
            this.isClosingTab = true;
            const result = await this.showSaveDialog(`Save changes to ${tab.name}?`);
            this.isClosingTab = false;
            if (result === 'save') await this.saveCurrentFile();
            else if (result === 'cancel') return;
        }
        const index = this.tabs.findIndex(t => t.id === tabId);
        this.tabs.splice(index, 1);
        if (this.activeTabId === tabId) {
            if (this.tabs.length > 0) this.switchToTab(this.tabs[Math.min(index, this.tabs.length - 1)].id);
            else { this.activeTabId = null; this.showWelcome(); }
        }
        this.renderTabs();
        this.scheduleEditorStateSave();
    }

    closeActiveTab() { if (this.activeTabId && !this.isClosingTab) this.closeTab(this.activeTabId); }

    markTabAsModified(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (tab && !tab.modified) { tab.modified = true; this.renderTabs(); }
    }

    updateCursorPosition(position) { const el = $('cursorPosition'); if (el) el.textContent = `Ln ${position.lineNumber}, Col ${position.column}`; }

    updateBreadcrumb(path) {
        const container = $('breadcrumb');
        if (!path) { container.innerHTML = ''; return; }
        const parts = path.split('/');
        container.innerHTML = parts.map((part, i) => `<span class="breadcrumb-item">${part}</span>${i < parts.length - 1 ? '<span class="breadcrumb-separator">></span>' : ''}`).join('');
    }

    updateLanguageStatus(language) {
        const langNames = { 'javascript': 'JavaScript', 'typescript': 'TypeScript', 'python': 'Python', 'rust': 'Rust', 'html': 'HTML', 'css': 'CSS', 'json': 'JSON', 'markdown': 'Markdown', 'plaintext': 'Plain Text', 'lua': 'Lua', 'luau': 'Luau' };
        const el = $('languageStatus'); if (el) el.textContent = langNames[language] || language;
    }

    hideWelcome() { $('welcomeTab')?.classList.add('hidden'); $('monacoEditor')?.classList.remove('editor-hidden'); }
    showWelcome() { $('welcomeTab')?.classList.remove('hidden'); $('monacoEditor')?.classList.add('editor-hidden'); if (this.editor) this.editor.setValue(''); $('breadcrumb').innerHTML = ''; }

    showQuickOpen() { const modal = $('quickOpenModal'), input = $('quickOpenSearch'); modal.classList.remove('hidden'); input.value = ''; input.focus(); this.renderSmartSearchResults(''); }
    hideQuickOpen() { $('quickOpenModal').classList.add('hidden'); }
    filterQuickOpen(query) { clearTimeout(this.smartSearchTimeout); this.smartSearchTimeout = setTimeout(() => this.renderSmartSearchResults(query), 200); }

    async renderSmartSearchResults(query) {
        const container = $('quickOpenResults');
        container.innerHTML = '';
        const lowerQuery = query.toLowerCase().trim();
        const savedFiles = this.flattenTree(this.savedScripts);
        const filteredSaved = lowerQuery ? savedFiles.filter(f => f.name.toLowerCase().includes(lowerQuery)) : savedFiles;
        const filteredFolders = lowerQuery ? this.allFiles.filter(f => f.name.toLowerCase().includes(lowerQuery) || (f.relativePath && f.relativePath.toLowerCase().includes(lowerQuery))) : this.allFiles;

        let scripthubResults = [];
        if (lowerQuery && lowerQuery.length >= 2) {
            try { const url = `https://scriptblox.com/api/script/search?q=${encodeURIComponent(lowerQuery)}`; const response = await fetch(url); const data = await response.json(); scripthubResults = (data.result?.scripts || []).slice(0, 5); } catch (e) { }
        }

        if (filteredSaved.length === 0 && filteredFolders.length === 0 && scripthubResults.length === 0) {
            container.innerHTML = '<div class="quick-open-empty"><i data-lucide="search-x"></i><span>No scripts found</span></div>'; this.refreshLucideIcons(); return;
        }

        if (filteredSaved.length > 0) {
            container.innerHTML += '<div class="search-category">Saved Scripts</div>';
            for (const file of filteredSaved.slice(0, 5)) container.appendChild(this.createSmartSearchItem({ type: 'saved', name: file.name, path: file.path, subtitle: 'Local Scripts', icon: this.getFileIconName(file.name) }));
        }
        if (filteredFolders.length > 0) {
            container.innerHTML += '<div class="search-category">Folders</div>';
            for (const file of filteredFolders.slice(0, 5)) container.appendChild(this.createSmartSearchItem({ type: 'folder', name: file.name, path: file.path, subtitle: file.relativePath, icon: this.getFileIconName(file.name) }));
        }
        if (scripthubResults.length > 0) {
            container.innerHTML += '<div class="search-category">ScriptHub</div>';
            for (const script of scripthubResults) container.appendChild(this.createSmartSearchItem({ type: 'scripthub', name: script.title || 'Untitled', subtitle: script.game?.name || 'Universal', script }));
        }
        this.refreshLucideIcons();
    }

    createSmartSearchItem(item) {
        const itemEl = document.createElement('div');
        itemEl.className = 'quick-open-item';
        let actionsHtml = '';
        if (item.type === 'saved') actionsHtml = '<button class="quick-open-btn execute" title="Execute"><i data-lucide="play"></i></button><button class="quick-open-btn load" title="Open"><i data-lucide="file-input"></i></button>';
        else if (item.type === 'folder') actionsHtml = '<button class="quick-open-btn load" title="Open"><i data-lucide="file-input"></i></button>';
        else if (item.type === 'scripthub') actionsHtml = '<button class="quick-open-btn execute" title="Execute"><i data-lucide="play"></i></button><button class="quick-open-btn load" title="Load"><i data-lucide="file-input"></i></button>';
        const iconHtml = item.type === 'scripthub' && item.script?.game?.imageUrl?.startsWith('http') ? `<img src="${item.script.game.imageUrl}" class="file-icon game-icon" alt="" onerror="this.style.display='none'">` : `<i data-lucide="${item.icon || 'file'}" class="file-icon"></i>`;
        itemEl.innerHTML = `${iconHtml}<div class="quick-open-item-info"><span class="quick-open-item-name">${this.escapeHtml(item.name)}</span><span class="quick-open-item-path">${this.escapeHtml(item.subtitle || '')}</span></div><div class="quick-open-item-actions">${actionsHtml}</div>`;
        itemEl.addEventListener('click', (e) => { if (e.target.closest('.quick-open-btn')) return; if (item.type === 'scripthub') this.loadScriptHubScript(item.script); else this.openFileFromPath(item.path); this.hideQuickOpen(); });
        itemEl.querySelector('.quick-open-btn.execute')?.addEventListener('click', (e) => { e.stopPropagation(); if (item.type === 'scripthub') this.directExecuteScript(item.script); else this.executeScriptFromPath(item.path, item.name); this.hideQuickOpen(); });
        itemEl.querySelector('.quick-open-btn.load')?.addEventListener('click', (e) => { e.stopPropagation(); if (item.type === 'scripthub') this.loadScriptHubScript(item.script); else this.openFileFromPath(item.path); this.hideQuickOpen(); });
        return itemEl;
    }

    handleQuickOpenKeydown(e) {
        const items = document.querySelectorAll('.quick-open-item');
        const selected = document.querySelector('.quick-open-item.selected');
        let index = Array.from(items).indexOf(selected);
        if (e.key === 'ArrowDown') { e.preventDefault(); selected?.classList.remove('selected'); if (index < items.length - 1) items[index + 1].classList.add('selected'); else if (items.length > 0) items[0].classList.add('selected'); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); if (index > 0) { selected?.classList.remove('selected'); items[index - 1].classList.add('selected'); } }
        else if (e.key === 'Enter') { e.preventDefault(); (document.querySelector('.quick-open-item.selected') || items[0])?.click(); }
        else if (e.key === 'Escape') this.hideQuickOpen();
    }

    showGoToLine() { const modal = $('goToLineModal'), input = $('goToLineInput'); modal.classList.remove('hidden'); input.value = ''; input.focus(); }
    hideGoToLine() { $('goToLineModal').classList.add('hidden'); }

    initScriptHub() { this.fetchScripts(); }

    async fetchScripts(query = '') {
        const loading = $('scripthubLoading'), list = $('scripthubList');
        loading?.classList.remove('hidden');
        list.innerHTML = '';
        try {
            const url = query ? `https://scriptblox.com/api/script/search?q=${encodeURIComponent(query)}` : 'https://scriptblox.com/api/script/fetch';
            const response = await fetch(url);
            const data = await response.json();
            this.scripthubScripts = data.result?.scripts || [];
            this.renderScriptHub();
        } catch (e) { list.innerHTML = '<div class="scripthub-empty"><i data-lucide="x-circle"></i><p>Failed to load scripts.</p></div>'; this.refreshLucideIcons(); }
        finally { loading?.classList.add('hidden'); }
    }

    searchScripts(query) { clearTimeout(this.searchTimeout); this.searchTimeout = setTimeout(() => this.fetchScripts(query), 500); }

    renderScriptHub() {
        const list = $('scripthubList');
        list.innerHTML = '';
        if (this.scripthubScripts.length === 0) { list.innerHTML = '<div class="scripthub-empty"><i data-lucide="book-open"></i><p>No scripts found.</p></div>'; this.refreshLucideIcons(); return; }
        for (const script of this.scripthubScripts) {
            const card = document.createElement('div');
            card.className = 'script-card';
            const title = script.title || 'Untitled Script';
            const game = script.game?.name || 'Universal';
            const date = script.createdAt ? new Date(script.createdAt).toLocaleDateString() : '';
            const isKey = script.key;
            const rawImageUrl = script.game?.imageUrl;
            const imageUrl = rawImageUrl && rawImageUrl.startsWith('http') ? rawImageUrl : '';
            card.innerHTML = `${imageUrl ? '<div class="script-card-image" style="background-image: url(\'' + imageUrl + '\')"></div>' : ''}<div class="script-card-overlay"></div><div class="script-card-content"><div class="script-title">${this.escapeHtml(title)}</div><div class="script-game">${this.escapeHtml(game)}</div><div class="script-meta">${date ? '<span>Added: ' + date + '</span>' : ''}${isKey ? '<span class="script-key-badge">Likely requires key</span>' : ''}</div><div class="script-actions"><button class="script-btn" data-action="direct">Direct Execute</button><button class="script-btn primary" data-action="load">Load Script</button></div></div>`;
            card.querySelector('[data-action="direct"]').addEventListener('click', (e) => { e.stopPropagation(); this.directExecuteScript(script); });
            card.querySelector('[data-action="load"]').addEventListener('click', (e) => { e.stopPropagation(); this.loadScriptInEditor(script); });
            list.appendChild(card);
        }
        this.refreshLucideIcons();
    }

    loadScriptHubScript(script) { this.createNewTab((script.title || 'Script') + '.lua', script.script || ''); }
    loadScriptInEditor(script) { this.loadScriptHubScript(script); this.updateConsoleOutput(`Script "${script.title}" loaded`, 'success'); }
    directExecuteScript(script) { this.updateConsoleOutput(`Executing: "${script.title}"`, 'info'); this.runScript(script.script || '', script.title || 'Script'); }

    async launchRoblox() {
        if (!this.invoke) return;
        try {
            const response = await this.invoke('launchroblox');
            if (response) this.showToast(response, 'success');
        } catch (e) { this.showToast(`Failed to launch Roblox: ${e}`, 'error'); }
    }

    showContextMenu(e) { const menu = $('contextMenu'); menu.classList.remove('hidden'); menu.style.left = `${e.clientX}px`; menu.style.top = `${e.clientY}px`; this.contextMenuTarget = e.target.closest('.tree-file, .folder-item'); }
    hideContextMenu() { $('contextMenu')?.classList.add('hidden'); $('savedScriptsContextMenu')?.classList.add('hidden'); this.contextMenuTarget = null; }

    async showSavedScriptContextMenu(event, file) {
        event.preventDefault(); event.stopPropagation();
        const menu = $('savedScriptsContextMenu');
        if (!menu) return;
        this.contextMenuFile = file;
        const autoexecLabel = $('autoexecLabel');
        if (autoexecLabel && this.autoexecPath) {
            const autoContent = await this.readFile(this.autoexecPath + '/' + file.name);
            autoexecLabel.textContent = autoContent !== null ? 'Remove from Autoexec' : 'Add to Autoexec';
        }
        menu.style.left = `${event.clientX}px`; menu.style.top = `${event.clientY}px`; menu.classList.remove('hidden');
        const closeMenu = (e) => { if (!menu.contains(e.target)) { menu.classList.add('hidden'); document.removeEventListener('click', closeMenu); } };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }

    async handleContextAction(action) {
        const target = this.contextMenuTarget;
        const path = target?.dataset?.path;
        this.hideContextMenu();
        let contextDir = null;
        if (path) {
            const isDir = target?.classList.contains('folder-item') || target?.closest('.folder-item');
            contextDir = isDir ? path : path.substring(0, path.lastIndexOf('/'));
        }
        switch (action) {
            case 'newFile': await this.createNewFileInFolder(contextDir); break;
            case 'newFolder': await this.createNewFolder(contextDir); break;
            case 'rename': if (path) { const newName = await this.showInputDialog('New name:', path.split('/').pop()); if (newName) { const dir = path.substring(0, path.lastIndexOf('/')); if (await this.renameItemAtPath(path, `${dir}/${newName}`)) { await this.refreshFolders(); this.refreshSavedScripts(); } } } break;
            case 'delete': if (path) { if (await this.showConfirmDialog(`Delete ${path.split('/').pop()}?`)) { if (await this.deleteItemAtPath(path)) { await this.refreshFolders(); this.refreshSavedScripts(); } } } break;
            case 'revealInFinder': if (path) this.revealInFinder(path); break;
            case 'copyPath': if (path) navigator.clipboard.writeText(path); break;
        }
    }

    async handleSavedScriptContextAction(action) {
        const file = this.contextMenuFile;
        if (!file) return;
        $('savedScriptsContextMenu')?.classList.add('hidden');
        switch (action) {
            case 'open': await this.openFileFromPath(file.path); break;
            case 'execute': await this.executeScriptFromPath(file.path, file.name); break;
            case 'toggleAutoexec': await this.toggleAutoexec(file.path, file.name); break;
            case 'rename': { const newName = await this.showInputDialog('New name:', file.name); if (newName && newName !== file.name) { const dir = file.path.substring(0, file.path.lastIndexOf('/')); if (await this.renameItemAtPath(file.path, `${dir}/${newName}`)) await this.refreshSavedScripts(); } break; }
            case 'delete': if (await this.showConfirmDialog(`Delete "${file.name}"?`)) { if (await this.deleteItemAtPath(file.path)) await this.refreshSavedScripts(); } break;
        }
    }

    replaceNext() {
        const searchText = $('searchInput')?.value;
        const replaceText = $('replaceInput')?.value || '';
        if (!searchText || !this.editor) return;
        const model = this.editor.getModel();
        const searchResult = model.findNextMatch(searchText, this.editor.getPosition(), false, false, null, false);
        if (searchResult) { this.editor.setSelection(searchResult.range); this.editor.revealLineInCenter(searchResult.range.startLineNumber); this.editor.executeEdits('replace', [{ range: searchResult.range, text: replaceText }]); }
    }

    replaceAll() {
        const searchText = $('searchInput')?.value;
        const replaceText = $('replaceInput')?.value || '';
        if (!searchText || !this.editor) return;
        const model = this.editor.getModel();
        const matches = model.findMatches(searchText, true, false, false, null, false);
        if (matches.length > 0) { this.editor.executeEdits('replace-all', matches.reverse().map(m => ({ range: m.range, text: replaceText }))); this.updateConsoleOutput(`Replaced ${matches.length} occurrence(s)`, 'info'); }
        else this.updateConsoleOutput('No matches found', 'info');
    }

    initSidebarResize() {
        const handle = $('sidebarResizeHandle'), sidebar = $('sidebar');
        if (!handle || !sidebar) return;
        let isResizing = false, startX = 0, startWidth = 0;
        handle.addEventListener('mousedown', (e) => { isResizing = true; startX = e.clientX; startWidth = sidebar.offsetWidth; sidebar.classList.add('resizing'); document.body.style.cursor = 'ew-resize'; e.preventDefault(); });
        document.addEventListener('mousemove', (e) => { if (!isResizing) return; sidebar.style.width = Math.max(180, Math.min(500, startWidth + e.clientX - startX)) + 'px'; });
        document.addEventListener('mouseup', () => { if (isResizing) { isResizing = false; sidebar.classList.remove('resizing'); document.body.style.cursor = ''; } });
    }

    initConsoleResize() {
        const handle = $('consoleResizeHandle'), container = $('bottomPanel');
        if (!handle || !container) return;
        let isResizing = false, startY = 0, startHeight = 0;
        handle.addEventListener('mousedown', (e) => { isResizing = true; startY = e.clientY; startHeight = container.offsetHeight; container.classList.add('resizing'); document.body.style.cursor = 'ns-resize'; e.preventDefault(); });
        document.addEventListener('mousemove', (e) => { if (!isResizing) return; container.style.height = Math.max(50, Math.min(window.innerHeight * 0.5, startHeight + startY - e.clientY)) + 'px'; });
        document.addEventListener('mouseup', () => { if (isResizing) { isResizing = false; container.classList.remove('resizing'); document.body.style.cursor = ''; } });
        this.initScriptsSectionResize();
    }

    initScriptsSectionResize() {
        const handle = $('sidebarSectionsResizeHandle'), topSection = $('sidebarTopSections');
        if (!handle || !topSection) return;
        let isResizing = false, startY = 0, startHeight = 0;
        handle.addEventListener('mousedown', (e) => { isResizing = true; startY = e.clientY; startHeight = topSection.offsetHeight; handle.classList.add('dragging'); document.body.style.cursor = 'ns-resize'; e.preventDefault(); });
        document.addEventListener('mousemove', (e) => { if (!isResizing) return; const sidebar = topSection.closest('.sidebar-content-wrapper'); const maxHeight = sidebar ? sidebar.offsetHeight - 150 : 400; topSection.style.flex = 'none'; topSection.style.height = Math.max(100, Math.min(maxHeight, startHeight + e.clientY - startY)) + 'px'; });
        document.addEventListener('mouseup', () => { if (isResizing) { isResizing = false; handle.classList.remove('dragging'); document.body.style.cursor = ''; } });
    }

    renderTreeItems(items, container, indent) {
        for (const item of items) {
            if (item.type === 'folder') {
                const folderEl = document.createElement('div');
                folderEl.className = 'folder-item';
                folderEl.dataset.path = item.path;
                folderEl.style.paddingLeft = `${8 + indent * 16}px`;
                folderEl.innerHTML = `<i data-lucide="chevron-right" class="chevron"></i><i data-lucide="folder" class="file-icon folder"></i><span class="file-name">${this.escapeHtml(item.name || 'Folder')}</span>`;
                folderEl.addEventListener('click', (e) => {
                    e.stopPropagation(); folderEl.classList.toggle('expanded');
                    const folderIcon = folderEl.querySelector('.file-icon'); const chevronIcon = folderEl.querySelector('.chevron');
                    if (folderEl.classList.contains('expanded')) { folderIcon.setAttribute('data-lucide', 'folder-open'); chevronIcon.style.transform = 'rotate(90deg)'; } else { folderIcon.setAttribute('data-lucide', 'folder'); chevronIcon.style.transform = 'rotate(0deg)'; }
                    this.refreshLucideIcons();
                });
                folderEl.addEventListener('dblclick', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await this.openFolderByPath(item.path);
                });
                folderEl.addEventListener('contextmenu', (e) => { e.preventDefault(); this.contextMenuTarget = folderEl; this.showContextMenu(e); });
                container.appendChild(folderEl);
                if (item.children && item.children.length > 0) {
                    const childrenEl = document.createElement('div'); childrenEl.className = 'folder-children';
                    this.renderTreeItems(item.children, childrenEl, indent + 1);
                    container.appendChild(childrenEl);
                }
            } else {
                const fileEl = document.createElement('div');
                fileEl.dataset.path = item.path;
                fileEl.draggable = false;
                fileEl.style.paddingLeft = `${24 + indent * 16}px`;
                const openTab = this.tabs.find(t => t.path === item.path);
                const isActive = openTab && openTab.id === this.activeTabId;
                fileEl.className = `tree-file ${isActive ? 'active' : ''}`;
                fileEl.innerHTML = `<i data-lucide="${this.getFileIconName(item.name)}" class="file-icon"></i><span class="file-name">${this.escapeHtml(item.name || 'Untitled')}</span>`;
                fileEl.addEventListener('click', () => this.openFileFromPath(item.path));
                fileEl.addEventListener('contextmenu', (e) => { e.preventDefault(); this.contextMenuTarget = fileEl; this.showContextMenu(e); });
                container.appendChild(fileEl);
            }
        }
    }

    createPointerDragGhost(fileName) {
        const ghost = document.createElement('div');
        ghost.className = 'pointer-drag-ghost';
        ghost.textContent = fileName || 'script';
        Object.assign(ghost.style, {
            position: 'fixed',
            top: '0px',
            left: '0px',
            zIndex: '20000',
            pointerEvents: 'none',
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid var(--accent-color)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.35)',
            opacity: '0.95'
        });
        return ghost;
    }

    clearDragHighlights() {
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    }

    resolvePointerDropTarget(clientX, clientY) {
        const element = document.elementFromPoint(clientX, clientY);
        const folderEl = element?.closest?.('.folder-item[data-path]');
        if (folderEl?.dataset?.path) {
            return { dir: folderEl.dataset.path, highlightEl: folderEl };
        }

        const localContainer = element?.closest?.('#localScriptsList');
        if (localContainer && this.opiumwareScriptsPath) {
            return { dir: this.opiumwareScriptsPath, highlightEl: localContainer };
        }

        const folderContainer = element?.closest?.('#folderTreeContent');
        if (folderContainer && this.currentFolder?.path) {
            return { dir: this.currentFolder.path, highlightEl: folderContainer };
        }

        return { dir: null, highlightEl: null };
    }

    beginPointerDrag(e, row) {
        const path = row?.dataset?.path;
        if (!path) return;
        const name = row.querySelector('.file-name')?.textContent?.trim() || path.split('/').pop();
        this.pointerDragState = {
            startX: e.clientX,
            startY: e.clientY,
            active: false,
            path,
            name,
            sourceRow: row,
            ghost: null,
            targetDir: null
        };
    }

    cleanupPointerDrag() {
        const st = this.pointerDragState;
        if (!st) return;
        if (st.ghost) st.ghost.remove();
        this.pointerDragState = null;
        this.clearDragHighlights();
        document.body.style.cursor = '';
    }

    setupPointerDragDrop() {
        if (this.pointerDragSetupDone) return;
        this.pointerDragSetupDone = true;

        document.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            const row = e.target?.closest?.('.tree-file[data-path]');
            if (!row) return;
            if (!row.closest('#localScriptsList, #folderTreeContent')) return;
            if (e.target.closest('.script-execute-btn')) return;
            this.beginPointerDrag(e, row);
        }, true);

        document.addEventListener('mousemove', (e) => {
            const st = this.pointerDragState;
            if (!st) return;

            const moved = Math.abs(e.clientX - st.startX) + Math.abs(e.clientY - st.startY);
            if (!st.active && moved < 6) return;

            if (!st.active) {
                st.active = true;
                st.ghost = this.createPointerDragGhost(st.name);
                document.body.appendChild(st.ghost);
            }

            e.preventDefault();
            st.ghost.style.transform = `translate(${e.clientX + 12}px, ${e.clientY + 12}px)`;
            document.body.style.cursor = 'grabbing';

            const target = this.resolvePointerDropTarget(e.clientX, e.clientY);
            this.clearDragHighlights();
            if (target.highlightEl) target.highlightEl.classList.add('drag-over');
            st.targetDir = target.dir;
        }, true);

        document.addEventListener('mouseup', async (e) => {
            if (e.button !== 0 || !this.pointerDragState) return;
            const st = this.pointerDragState;
            const wasActive = st.active;
            const fromPath = st.path;
            const fileName = st.name;
            const targetDir = st.targetDir;
            this.cleanupPointerDrag();

            if (!wasActive || !targetDir) return;
            await this.moveScriptToDirectory({ path: fromPath, name: fileName, type: 'file' }, targetDir);
        }, true);

        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape' || !this.pointerDragState) return;
            this.cleanupPointerDrag();
        }, true);
    }

    async moveScriptToDirectory(sourceItem, targetDirPath) {
        const sourcePath = sourceItem?.path;
        const fileName = sourceItem?.name || (sourcePath ? sourcePath.split('/').pop() : '');
        const targetDir = (targetDirPath || '').replace(/\/$/, '');
        if (!sourcePath || !targetDir || !fileName) return;

        const targetPath = `${targetDir}/${fileName}`;
        if (sourcePath === targetPath) return;

        if (await this.readFile(targetPath) !== null) {
            this.showToast(`\"${fileName}\" already exists`, 'warning');
            return;
        }

        if (!await this.renameItemAtPath(sourcePath, targetPath)) {
            this.showToast('Failed to move script', 'error');
            return;
        }

        this.updateOpenTabsAfterMove(sourcePath, targetPath, fileName);
        await this.refreshSavedScripts();
        await this.refreshFolders();
    }

    updateOpenTabsAfterMove(oldPath, newPath, fileName) {
        let changed = false;
        for (const tab of this.tabs) {
            if (tab.path !== oldPath) continue;
            tab.path = newPath;
            tab.name = fileName;
            tab.language = this.getLanguageFromPath(newPath);
            changed = true;
            if (tab.id === this.activeTabId) this.updateBreadcrumb(newPath);
        }
        if (changed) this.renderTabs();
    }

    setupDropZones() {
        this.setupPointerDragDrop();
    }

    refreshLucideIcons() { if (typeof lucide !== 'undefined') lucide.createIcons(); }
    escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

    getFileIconName(filename) {
        const ext = (filename || '').split('.').pop().toLowerCase();
        return { 'js': 'file-code', 'jsx': 'file-code', 'ts': 'file-code', 'tsx': 'file-code', 'rs': 'file-code', 'py': 'file-code', 'lua': 'file-code', 'luau': 'file-code', 'html': 'file-code', 'css': 'file-code', 'json': 'file-json', 'md': 'file-text', 'txt': 'file-text', 'toml': 'file-cog', 'yaml': 'file-cog', 'yml': 'file-cog' }[ext] || 'file';
    }

    getLanguageFromPath(filePath) {
        const ext = (filePath || '').split('.').pop().toLowerCase();
        return { 'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript', 'rs': 'rust', 'py': 'python', 'lua': 'lua', 'luau': 'luau', 'html': 'html', 'css': 'css', 'json': 'json', 'md': 'markdown', 'toml': 'ini', 'yaml': 'yaml', 'yml': 'yaml' }[ext] || 'plaintext';
    }

    showToast(message, type = 'info') {
        const container = $('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; setTimeout(() => toast.remove(), 200); }, 3000);
    }

    createDialogOverlay(content) {
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        overlay.innerHTML = `<div class="dialog-modal">${content}</div>`;
        document.body.appendChild(overlay);
        return overlay;
    }

    showInputDialog(title, defaultValue = '') {
        return new Promise((resolve) => {
            const overlay = this.createDialogOverlay(`<h3>${title}</h3><input type="text" class="dialog-input" value="${defaultValue}" /><div class="dialog-buttons"><button class="dialog-btn dialog-cancel">Cancel</button><button class="dialog-btn dialog-confirm">OK</button></div>`);
            const input = overlay.querySelector('.dialog-input'); input.focus(); input.select();
            const cleanup = (value) => { overlay.remove(); resolve(value); };
            overlay.querySelector('.dialog-cancel').onclick = () => cleanup(null);
            overlay.querySelector('.dialog-confirm').onclick = () => cleanup(input.value);
            input.onkeydown = (e) => { if (e.key === 'Enter') cleanup(input.value); if (e.key === 'Escape') cleanup(null); };
            overlay.onclick = (e) => { if (e.target === overlay) cleanup(null); };
        });
    }

    showConfirmDialog(message) {
        return new Promise((resolve) => {
            const overlay = this.createDialogOverlay(`<p>${message}</p><div class="dialog-buttons"><button class="dialog-btn dialog-cancel">Cancel</button><button class="dialog-btn dialog-confirm">OK</button></div>`);
            const cleanup = (value) => { overlay.remove(); resolve(value); };
            overlay.querySelector('.dialog-cancel').onclick = () => cleanup(false);
            overlay.querySelector('.dialog-confirm').onclick = () => cleanup(true);
            overlay.onclick = (e) => { if (e.target === overlay) cleanup(false); };
        });
    }

    showSaveDialog(message) {
        return new Promise((resolve) => {
            const overlay = this.createDialogOverlay(`<p>${message}</p><div class="dialog-buttons"><button class="dialog-btn dialog-cancel">Cancel<span class="kbd-hint">Esc</span></button><button class="dialog-btn dialog-dontsave">Don't Save<span class="kbd-hint">&#9003;</span></button><button class="dialog-btn dialog-confirm">Save<span class="kbd-hint">&#8629;</span></button></div>`);
            const cleanup = (value) => { document.removeEventListener('keydown', handleKeydown, true); overlay.remove(); resolve(value); };
            const handleKeydown = (e) => { if (e.key === 'Escape') { e.preventDefault(); cleanup('cancel'); } else if (e.key === 'Backspace') { e.preventDefault(); cleanup('dontsave'); } else if (e.key === 'Enter') { e.preventDefault(); cleanup('save'); } };
            document.addEventListener('keydown', handleKeydown, true);
            overlay.querySelector('.dialog-cancel').onclick = () => cleanup('cancel');
            overlay.querySelector('.dialog-dontsave').onclick = () => cleanup('dontsave');
            overlay.querySelector('.dialog-confirm').onclick = () => cleanup('save');
            overlay.onclick = (e) => { if (e.target === overlay) cleanup('cancel'); };
        });
    }
}

const opiumwareEditor = new OpiumwareEditor();
