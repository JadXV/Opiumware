
const $ = id => document.getElementById(id);

class OpiumwareEditor {
    constructor() {
        this.editor = null;
        this.tabs = [];
        this.activeTabId = null;
        this.workspaceFolders = [];
        this.opiumwareScriptsPath = null;
        this.savedScripts = [];
        this.allFiles = [];
        this.contextMenuTarget = null;
        this.scripthubScripts = [];
        this.draggedItem = null;
        this.currentTheme = 'dark';
        this.isClosingTab = false;
        
        this.init();
    }

    async init() {
        this.loadSettings();
        await this.initMonaco();
        await this.initOpiumwareScripts();
        this.bindEvents();
        this.bindElectronEvents();
        this.bindKeyboardShortcuts();
        this.initConsoleResize();
        this.initScriptHub();
        this.refreshLucideIcons();
        document.body.classList.remove('app-loading');
    }

    loadSettings() {
        const savedTheme = localStorage.getItem('opiumware-theme') || 'dark';
        this.applyTheme(savedTheme);
        
        const minimapEnabled = localStorage.getItem('opiumware-minimap') !== 'false';
        const minimapCheckbox = $('minimapCheckbox');
        if (minimapCheckbox) minimapCheckbox.checked = minimapEnabled;
        if (this.editor) this.editor.updateOptions({ minimap: { enabled: minimapEnabled } });
        
        this.loadVersion();
    }

    async loadVersion() {
        if (window.electronAPI?.getVersion) {
            try {
                const response = await window.electronAPI.getVersion();
                if (response?.version) {
                    const versionEl = document.getElementById('versionNumber');
                    if (versionEl) versionEl.textContent = response.version;
                    const welcomeVersionEl = document.getElementById('welcomeVersion');
                    if (welcomeVersionEl) welcomeVersionEl.textContent = response.version;
                }
            } catch (error) {
                console.error('Error loading version:', error);
            }
        }
    }

    applyTheme(theme) {
        this.currentTheme = theme;
        document.body.className = `theme-${theme}`;
        localStorage.setItem('opiumware-theme', theme);
        
        const themeRadio = document.querySelector(`input[name="theme"][value="${theme}"]`);
        if (themeRadio) themeRadio.checked = true;
        
        if (this.editor && typeof monaco !== 'undefined') {
            this.applyMonacoTheme(theme);
        }
    }

    applyMonacoTheme(theme) {
        const themeConfigs = {
            dark: {
                base: 'vs-dark',
                background: '#0f0f17',
                foreground: '#e0e0ec',
                lineNumber: '#5c5c7a',
                lineNumberActive: '#e0e0ec',
                selection: '#2a2a3d',
                cursor: '#cba6f7',
                lineHighlight: '#1e1e2e',
                indent: '#232336',
                widget: '#13131d',
                widgetBorder: '#232336',
                accent: '#cba6f7',
                keyword: 'cba6f7',
                string: 'a6e3a1',
                number: 'fab387',
                type: 'f9e2af',
                function: '89b4fa',
                comment: '5c5c7a',
                global: '9cdcfe'
            },
            midnight: {
                base: 'vs-dark',
                background: '#000000',
                foreground: '#ffffff',
                lineNumber: '#606060',
                lineNumberActive: '#ffffff',
                selection: '#1f1f1f',
                cursor: '#5a4b6b',
                lineHighlight: '#141414',
                indent: '#1a1a1a',
                widget: '#0a0a0a',
                widgetBorder: '#1a1a1a',
                accent: '#5a4b6b',
                keyword: '9d8ab8',
                string: '7eb89e',
                number: 'c9a87c',
                type: 'd4c4a0',
                function: '7ca6d4',
                comment: '606060',
                global: '9cdcfe'
            },
            purple: {
                base: 'vs-dark',
                background: '#1a1525',
                foreground: '#f0e8ff',
                lineNumber: '#7a6a9a',
                lineNumberActive: '#f0e8ff',
                selection: '#3d3355',
                cursor: '#a855f7',
                lineHighlight: '#2d2540',
                indent: '#3d3355',
                widget: '#231d30',
                widgetBorder: '#3d3355',
                accent: '#a855f7',
                keyword: 'a855f7',
                string: '7ee787',
                number: 'ffa657',
                type: 'e0c46c',
                function: '79c0ff',
                comment: '7a6a9a',
                global: 'b5a0d8'
            },
            rose: {
                base: 'vs-dark',
                background: '#1a0d14',
                foreground: '#f5e0ea',
                lineNumber: '#9a5a78',
                lineNumberActive: '#f5e0ea',
                selection: '#402535',
                cursor: '#e11d48',
                lineHighlight: '#2f1a24',
                indent: '#402535',
                widget: '#221219',
                widgetBorder: '#402535',
                accent: '#e11d48',
                keyword: 'e11d48',
                string: 'fb7185',
                number: 'fda4af',
                type: 'f9a8d4',
                function: 'f472b6',
                comment: '9a5a78',
                global: 'fda4af'
            },
            ocean: {
                base: 'vs-dark',
                background: '#0a1520',
                foreground: '#e0f0f5',
                lineNumber: '#5a8a9a',
                lineNumberActive: '#e0f0f5',
                selection: '#1f3045',
                cursor: '#06b6d4',
                lineHighlight: '#152535',
                indent: '#1f3045',
                widget: '#0f1d2a',
                widgetBorder: '#1f3045',
                accent: '#06b6d4',
                keyword: '06b6d4',
                string: '22d3ee',
                number: '67e8f9',
                type: 'a5f3fc',
                function: '38bdf8',
                comment: '5a8a9a',
                global: '67e8f9'
            },
            light: {
                base: 'vs',
                background: '#f8f8f8',
                foreground: '#1a1a1a',
                lineNumber: '#8a8a8a',
                lineNumberActive: '#1a1a1a',
                selection: '#d8d8d8',
                cursor: '#8b5cf6',
                lineHighlight: '#e8e8e8',
                indent: '#d0d0d0',
                widget: '#ffffff',
                widgetBorder: '#d0d0d0',
                accent: '#8b5cf6',
                keyword: '8b5cf6',
                string: '22863a',
                number: 'e36209',
                type: 'b08800',
                function: '005cc5',
                comment: '8a8a8a',
                global: '0070c1'
            }
        };

        const config = themeConfigs[theme] || themeConfigs.dark;
        const themeName = `opiumware-${theme}`;

        monaco.editor.defineTheme(themeName, {
            base: config.base,
            inherit: true,
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
                { token: 'parameter', foreground: config.keyword },
                { token: 'operator', foreground: config.accent.replace('#', '') },
                { token: 'punctuation', foreground: config.lineNumber.replace('#', '') },
                { token: 'keyword.lua', foreground: config.keyword },
                { token: 'keyword.luau', foreground: config.keyword },
                { token: 'string.lua', foreground: config.string },
                { token: 'string.luau', foreground: config.string },
                { token: 'number.lua', foreground: config.number },
                { token: 'number.luau', foreground: config.number },
                { token: 'comment.lua', foreground: config.comment, fontStyle: 'italic' },
                { token: 'comment.luau', foreground: config.comment, fontStyle: 'italic' },
                { token: 'identifier.lua', foreground: config.foreground.replace('#', '') },
                { token: 'identifier.luau', foreground: config.foreground.replace('#', '') },
                { token: 'delimiter.parenthesis', foreground: config.lineNumber.replace('#', '') },
                { token: 'delimiter.bracket', foreground: config.lineNumber.replace('#', '') },
                { token: 'delimiter.brace', foreground: config.lineNumber.replace('#', '') },
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

    async initOpiumwareScripts() {
        if (window.electronAPI) {
            const result = await window.electronAPI.getOpiumwareScriptsPath();
            if (result.success) {
                this.opiumwareScriptsPath = result.path;
                await this.refreshSavedScripts();
            }
        }
    }

    async refreshSavedScripts() {
        if (!this.opiumwareScriptsPath || !window.electronAPI) return;
        
        try {
            const result = await window.electronAPI.readDirectory(this.opiumwareScriptsPath);
            if (result.success) {
                this.savedScripts = result.tree || [];
                this.scheduleExplorerUpdate();
            }
        } catch (error) {
            console.error('Failed to load saved scripts:', error);
        }
    }

    async renderLocalScripts() {
        const list = $('localScriptsList');
        const count = $('localScriptsCount');
        
        if (!list) return;
        
        list.innerHTML = '';
        
        const savedFiles = this.flattenTree(this.savedScripts);
        count.textContent = savedFiles.length;
        
        if (savedFiles.length === 0) {
            list.innerHTML = '<div class="empty-hint">No scripts yet</div>';
            return;
        }
        
        const autoexecNames = new Set();
        if (window.electronAPI?.getAutoexecScripts) {
            const result = await window.electronAPI.getAutoexecScripts();
            if (result.success) {
                result.scripts.forEach(s => autoexecNames.add(s.name));
            }
        }
        
        for (const file of savedFiles) {
            const openTab = this.tabs.find(t => t.path === file.path);
            const isActive = openTab && openTab.id === this.activeTabId;
            const isModified = openTab && openTab.modified;
            const isAutoexec = autoexecNames.has(file.name);
            const isOpened = !!openTab;
            
            let indicators = '';
            if (isModified) indicators += '<span class="status-dot modified" title="Modified - unsaved changes"></span>';
            if (isAutoexec) indicators += '<i data-lucide="zap" class="status-icon autoexec" title="Autoexec - runs on launch"></i>';
            if (isOpened && !isModified) indicators += '<span class="status-dot opened" title="Opened in editor"></span>';
            
            const item = document.createElement('div');
            item.className = `tree-file ${isActive ? 'active' : ''}`;
            item.draggable = true;
            item.dataset.path = file.path;
            item.dataset.source = 'saved';
            item.innerHTML = `
                <i data-lucide="${this.getFileIconName(file.name)}" class="file-icon"></i>
                <span class="file-name">${file.name}</span>
                <button class="script-execute-btn" title="Execute script"><i data-lucide="play"></i></button>
                ${indicators ? `<div class="file-status-indicators">${indicators}</div>` : ''}
            `;
            item.addEventListener('click', () => this.openFileFromPath(file.path));
            item.querySelector('.script-execute-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.executeScriptFromPath(file.path, file.name);
            });
            item.addEventListener('contextmenu', (e) => this.showSavedScriptContextMenu(e, file));
            item.addEventListener('dragstart', (e) => this.handleDragStart(e, file));
            item.addEventListener('dragover', (e) => this.handleDragOver(e));
            item.addEventListener('drop', (e) => this.handleDrop(e, 'saved'));
            list.appendChild(item);
        }
        
        this.refreshLucideIcons();
    }


    async renameScript(filePath, currentName) {
        const newName = await this.showInputDialog('Enter new name:', currentName);
        if (!newName || newName === currentName) return;

        const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
        const newPath = `${dirPath}/${newName}`;

        if (window.electronAPI) {
            const result = await window.electronAPI.renameItem(filePath, newPath);
            if (result.success) {
                await this.refreshSavedScripts();
                window.electronAPI.refreshTrayMenu?.();
            } else {
                await this.showAlertDialog('Failed to rename: ' + (result.error || 'Unknown error'));
            }
        }
    }

    async deleteScript(filePath, name) {
        if (!await this.showConfirmDialog(`Delete "${name}"? This cannot be undone.`)) return;
        if (window.electronAPI) {
            const result = await window.electronAPI.deleteItem(filePath);
            if (result.success) {
                await window.electronAPI.removeAutoexecScript(name);
                await this.refreshSavedScripts();
                window.electronAPI.refreshTrayMenu?.();
            }
            else await this.showAlertDialog('Failed to delete: ' + (result.error || 'Unknown error'));
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

    handleDragStart(e, item) {
        this.draggedItem = item;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.path);
    }

    handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }

    async handleDrop(e, targetZone) {
        e.preventDefault();
        if (!this.draggedItem) return;
        
        const sourcePath = this.draggedItem.path;
        const fileName = this.draggedItem.name;
        let targetPath = targetZone === 'saved' ? `${this.opiumwareScriptsPath}/${fileName}` 
            : (targetZone === 'workspace' && this.workspacePath) ? `${this.workspacePath}/${fileName}` : null;
        
        if (!targetPath || sourcePath === targetPath) return;
        
        if (window.electronAPI) {
            const result = await window.electronAPI.moveFile(sourcePath, targetPath);
            if (result.success) { await this.refreshSavedScripts(); await this.refreshFolders(); }
            else await this.showAlertDialog('Failed to move file: ' + (result.error || 'Unknown error'));
        }
        this.draggedItem = null;
    }

    setupDropZones() {
        const localScriptsList = $('localScriptsList');
        if (localScriptsList) {
            localScriptsList.addEventListener('dragover', (e) => { e.preventDefault(); localScriptsList.classList.add('drag-over'); });
            localScriptsList.addEventListener('dragleave', () => localScriptsList.classList.remove('drag-over'));
            localScriptsList.addEventListener('drop', (e) => { localScriptsList.classList.remove('drag-over'); this.handleDrop(e, 'saved'); });
        }

        const foldersList = $('foldersList');
        if (foldersList) {
            foldersList.addEventListener('dragover', (e) => { e.preventDefault(); if (this.workspaceFolders.length > 0) foldersList.classList.add('drag-over'); });
            foldersList.addEventListener('dragleave', () => foldersList.classList.remove('drag-over'));
            foldersList.addEventListener('drop', (e) => { foldersList.classList.remove('drag-over'); if (this.workspaceFolders.length > 0) this.handleDropToFolder(this.workspaceFolders[0].path); });
        }
    }

    refreshLucideIcons() { if (typeof lucide !== 'undefined') lucide.createIcons(); }

    async initMonaco() {
        return new Promise(async (resolve) => {
            require.config({ 
                paths: { 
                    'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' 
                }
            });

            const customCompletions = await this.loadLuaCompletions();

            require(['vs/editor/editor.main'], () => {
                this.registerLuaLanguage(customCompletions);

                this.editor = monaco.editor.create($('monacoEditor'), {
                    value: '',
                    language: 'lua',
                    theme: 'vs-dark',
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, Monaco, monospace",
                    fontSize: 14,
                    lineHeight: 22,
                    fontLigatures: true,
                    minimap: { enabled: true },
                    scrollbar: {
                        verticalScrollbarSize: 10,
                        horizontalScrollbarSize: 10,
                    },
                    renderLineHighlight: 'all',
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                    automaticLayout: true,
                    padding: { top: 10, bottom: 10 },
                    bracketPairColorization: { enabled: true },
                    guides: { bracketPairs: true, indentation: true },
                    autoIndent: 'full',
                    formatOnType: true,
                    formatOnPaste: true,
                    tabSize: 4,
                    insertSpaces: true,
                    wordWrap: 'off',
                    matchBrackets: 'always',
                    autoClosingBrackets: 'always',
                    autoClosingQuotes: 'always',
                    autoSurround: 'languageDefined'
                });

                this.applyMonacoTheme(this.currentTheme || 'dark');

                this.editor.onDidChangeCursorPosition((e) => {
                    this.updateCursorPosition(e.position);
                });

                this.editor.onDidChangeModelContent(() => {
                    if (this.activeTabId) {
                        this.markTabAsModified(this.activeTabId);
                    }
                });

                this.startLuauAnalysis();

                resolve();
            });
        });
    }

    async loadLuaCompletions() {
        try {
            const response = await fetch('./assets/monaco.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.completions || [];
        } catch (error) {
            console.warn('Failed to load Lua completions:', error);
            return [];
        }
    }

    startLuauAnalysis() {
        setInterval(async () => {
            if (!this.editor || !window.electronAPI?.analyzeLuau) return;
            
            const editorValue = this.editor.getValue();
            if (!editorValue.trim()) {
                monaco.editor.setModelMarkers(this.editor.getModel(), 'luau-lsp', []);
                return;
            }
            
            try {
                const result = await window.electronAPI.analyzeLuau(editorValue);
                
                monaco.editor.setModelMarkers(this.editor.getModel(), 'luau-lsp', []);
                
                if (result.success && result.output) {
                    const errorPattern = /analysis\.lua\((\d+),(\d+)\):\s*(\w+):\s*(.*)/g;
                    let match;
                    const errorMarkers = [];
                    
                    while ((match = errorPattern.exec(result.output)) !== null) {
                        const errorLine = parseInt(match[1]);
                        const errorColumn = parseInt(match[2]);
                        const errorType = match[3];
                        const errorMessage = match[4];
                        
                        if (errorMessage.includes('deprecated')) continue;
                        if (errorMessage.includes('Unknown type')) continue;
                        if (errorMessage.includes('Unknown require')) continue;
                        if (errorMessage.includes('could be nil')) continue;
                        if (errorMessage.includes('Unknown global')) continue;
                        
                        let severity = monaco.MarkerSeverity.Error;
                        if (errorType.toLowerCase() === 'warning') {
                            severity = monaco.MarkerSeverity.Warning;
                        } else if (errorType.toLowerCase() === 'info' || errorType.toLowerCase() === 'hint') {
                            severity = monaco.MarkerSeverity.Info;
                        }
                        
                        errorMarkers.push({
                            startLineNumber: errorLine,
                            startColumn: errorColumn,
                            endLineNumber: errorLine,
                            endColumn: errorColumn + 10,
                            message: `${errorType}: ${errorMessage}`,
                            severity: severity
                        });
                    }
                    
                    if (errorMarkers.length > 0) {
                        monaco.editor.setModelMarkers(this.editor.getModel(), 'luau-lsp', errorMarkers);
                    }
                }
            } catch (error) {
                console.warn('Luau analysis error:', error);
            }
        }, 2000);
    }

    registerLuaLanguage(customCompletions) {
        const luaGlobals = [
            "break", "goto", "do", "end", "while", "repeat", "until", "if", "then", "else", "elseif",
            "for", "in", "function", "local", "return", "continue", "export",
            "dofile", "getmetatable", "load", "loadfile", "next", "rawequal", "rawget", "rawlen", "rawset", "setmetatable", "warn",
            "coroutine", "coroutine.create", "coroutine.resume", "coroutine.running", "coroutine.status", "coroutine.wrap", "coroutine.yield", "coroutine.isyieldable", "coroutine.close",
            "table", "table.move", "table.pack", "table.unpack", "table.foreach", "table.foreachi", "table.getn", "table.isfrozen", "table.maxn",
            "table.insert", "table.remove", "table.sort", "table.concat", "table.clear", "table.clone", "table.create", "table.find", "table.freeze",
            "string", "string.byte", "string.char", "string.dump", "string.gmatch", "string.rep", "string.reverse", "string.pack", "string.packsize", "string.unpack", "string.split",
            "string.find", "string.format", "string.gsub", "string.len", "string.lower", "string.match", "string.sub", "string.upper",
            "math", "math.abs", "math.acos", "math.asin", "math.atan", "math.atan2", "math.ceil", "math.cos", "math.cosh", "math.deg", "math.exp",
            "math.floor", "math.fmod", "math.frexp", "math.huge", "math.ldexp", "math.log", "math.log10", "math.max", "math.min", "math.modf",
            "math.pi", "math.pow", "math.rad", "math.random", "math.randomseed", "math.sin", "math.sinh", "math.sqrt", "math.tan", "math.tanh",
            "math.clamp", "math.noise", "math.sign", "math.round", "math.lerp",
            "bit32", "bit32.arshift", "bit32.band", "bit32.bnot", "bit32.bor", "bit32.btest", "bit32.bxor", "bit32.extract", "bit32.lrotate", "bit32.lshift", "bit32.replace", "bit32.rrotate", "bit32.rshift",
            "getfenv", "setfenv", "shared", "script", "spawn", "delay", "tick", "time", "UserSettings", "settings", "game", "workspace", "Delay", "ElapsedTime", "elapsedTime",
            "task", "task.wait", "task.spawn", "task.defer", "task.delay", "task.cancel",
            "Vector2", "Vector3", "Vector2int16", "Vector3int16", "CFrame", "Color3", "ColorSequence", "NumberRange", "NumberSequence", "Rect", "UDim", "UDim2", "Faces", "Axes", "BrickColor", "Enum", "Instance", "TweenInfo", "Region3", "Region3int16", "Ray", "Random", "RaycastResult",
            "RaycastParams", "OverlapParams", "PathWaypoint", "NumberSequenceKeypoint", "ColorSequenceKeypoint", "PhysicalProperties",
            "print", "warn", "error", "type", "typeof", "tostring", "tonumber", "pairs", "ipairs", "next", "select", "unpack", "pack",
            "pcall", "xpcall", "assert", "require", "setmetatable", "getmetatable", "rawset", "rawget", "wait",
            "true", "false", "nil", "self", "_G", "_VERSION"
        ];

        if (!monaco.languages.getLanguages().some(l => l.id === 'lua')) {
            monaco.languages.register({ id: 'lua', extensions: ['.lua'], aliases: ['Lua', 'lua'] });
        }

        if (!monaco.languages.getLanguages().some(l => l.id === 'luau')) {
            monaco.languages.register({ id: 'luau', extensions: ['.luau'], aliases: ['Luau', 'luau'] });
        }

        const luaLanguageConfiguration = {
            comments: {
                lineComment: '--',
                blockComment: ['--[[', ']]']
            },
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ],
            autoClosingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '"', close: '"' },
                { open: "'", close: "'" },
                { open: '--[[', close: ']]' }
            ],
            surroundingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '"', close: '"' },
                { open: "'", close: "'" }
            ],
            indentationRules: {
                increaseIndentPattern: /^\s*(do|then|else|elseif|repeat|function|if|for|while)\b.*$/,
                decreaseIndentPattern: /^\s*(end|else|elseif|until)\b.*$/
            },
            onEnterRules: [
                {
                    beforeText: /^\s*(do|then|else|elseif|repeat|function|if|for|while)\b.*$/,
                    action: { indentAction: monaco.languages.IndentAction.Indent }
                },
                {
                    beforeText: /^\s*(end|else|elseif|until)\b.*$/,
                    action: { indentAction: monaco.languages.IndentAction.Outdent }
                },
                {
                    beforeText: /^\s*--.*$/,
                    action: { indentAction: monaco.languages.IndentAction.None }
                }
            ]
        };

        monaco.languages.setLanguageConfiguration('lua', luaLanguageConfiguration);
        monaco.languages.setLanguageConfiguration('luau', luaLanguageConfiguration);

        const completionProvider = {
            provideCompletionItems: (model, position) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endLineNumber: position.lineNumber,
                    endColumn: word.endColumn,
                };

                const kindMap = {
                    function: monaco.languages.CompletionItemKind.Function,
                    method: monaco.languages.CompletionItemKind.Method,
                    variable: monaco.languages.CompletionItemKind.Variable,
                    class: monaco.languages.CompletionItemKind.Class,
                    property: monaco.languages.CompletionItemKind.Property,
                    field: monaco.languages.CompletionItemKind.Field,
                    module: monaco.languages.CompletionItemKind.Module,
                    keyword: monaco.languages.CompletionItemKind.Keyword,
                    constant: monaco.languages.CompletionItemKind.Constant,
                    enum: monaco.languages.CompletionItemKind.Enum,
                    interface: monaco.languages.CompletionItemKind.Interface,
                    struct: monaco.languages.CompletionItemKind.Struct,
                    event: monaco.languages.CompletionItemKind.Event,
                    operator: monaco.languages.CompletionItemKind.Operator,
                    type: monaco.languages.CompletionItemKind.TypeParameter,
                    service: monaco.languages.CompletionItemKind.Module,
                    library: monaco.languages.CompletionItemKind.Module,
                };

                function getKind(kw) {
                    if (/^(function|spawn|delay|wait|pcall|xpcall|coroutine|assert|print|warn|error|pairs|ipairs|type|typeof|tostring|tonumber|select|unpack|require|setmetatable|getmetatable|rawset|rawget|rawequal|next|task\.wait|task\.spawn|task\.defer|task\.delay|task\.cancel)$/.test(kw))
                        return kindMap.function;
                    if (/^(math|string|table|os|io|debug|package|utf8|bit32|task|coroutine)$/.test(kw))
                        return kindMap.module;
                    if (/^[A-Z][A-Za-z0-9_]*$/.test(kw)) return kindMap.class;
                    if (/^(true|false|nil)$/.test(kw)) return kindMap.constant;
                    if (/^(local|end|do|then|if|else|elseif|for|while|repeat|until|break|return|continue|export|in|not|and|or|function)$/.test(kw))
                        return kindMap.keyword;
                    return kindMap.variable;
                }

                const suggestions = [];

                customCompletions.forEach(item => {
                    suggestions.push({
                        label: item.label,
                        kind: kindMap[item.type] || kindMap.function,
                        insertText: item.label,
                        detail: item.detail,
                        documentation: {
                            value: item.documentation
                        },
                        range: range
                    });
                });

                luaGlobals.forEach((kw) => {
                    if (!customCompletions.some(c => c.label === kw)) {
                        suggestions.push({
                            label: kw,
                            kind: getKind(kw),
                            insertText: kw,
                            range: range
                        });
                    }
                });

                return { suggestions };
            },
        };

        monaco.languages.registerCompletionItemProvider('lua', completionProvider);
        monaco.languages.registerCompletionItemProvider('luau', completionProvider);
    }


    bindEvents() {
        const searchInput = $('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.performFileSearch(e.target.value));
            searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.performFileSearch(e.target.value); });
        }
    }

    async performFileSearch(query) {
        const resultsContainer = $('searchResults');
        resultsContainer.innerHTML = '';
        if (!query?.trim()) return;

        let filesToSearch = [];
        
        for (const tab of this.tabs) {
            let content = tab.content;
            if (this.activeTabId === tab.id && this.editor) {
                content = this.editor.getValue();
            }
            filesToSearch.push({
                name: tab.name,
                path: tab.path || `untitled:${tab.id}`,
                content: content,
                isTab: true,
                tabId: tab.id
            });
        }
        
        const savedFiles = this.flattenTree(this.savedScripts);
        for (const file of savedFiles) {
            if (!filesToSearch.some(f => f.path === file.path)) {
                filesToSearch.push(file);
            }
        }
        
        if (this.allFiles && this.allFiles.length > 0) {
            for (const file of this.allFiles) {
                if (!filesToSearch.some(f => f.path === file.path)) {
                    filesToSearch.push(file);
                }
            }
        }

        let totalMatches = 0;
        for (const file of filesToSearch) {
            if (!file.name) continue;
            if (!/\.(lua|txt|js|json|md|py|ts|c|cpp|cs|java|rb|sh)$/i.test(file.name) && !file.isTab) continue;
            try {
                let content = file.content;
                if (content == null && window.electronAPI) {
                    const res = await window.electronAPI.readFile(file.path);
                    if (res.success) content = res.content;
                }
                if (!content) continue;
                const regex = new RegExp(query.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'gi');
                let match;
                let matchCount = 0;
                let lineMatches = [];
                const lines = content.split(/\r?\n/);
                for (let i = 0; i < lines.length; i++) {
                    let line = lines[i];
                    let lineMatch = false;
                    let lineHtml = '';
                    let lastIndex = 0;
                    regex.lastIndex = 0;
                    while ((match = regex.exec(line)) !== null) {
                        lineMatch = true;
                        matchCount++;
                        lineHtml += line.substring(lastIndex, match.index) + `<span class=\"search-highlight\">${match[0]}</span>`;
                        lastIndex = match.index + match[0].length;
                    }
                    if (lineMatch) {
                        lineHtml += line.substring(lastIndex);
                        lineMatches.push({
                            lineNumber: i + 1,
                            lineHtml,
                            raw: line
                        });
                    }
                }
                if (matchCount > 0) {
                    totalMatches += matchCount;
                    const resultEl = document.createElement('div');
                    resultEl.className = 'search-result-file';
                    resultEl.innerHTML = `<span class=\"search-result-filename\">${file.name}</span> <span class=\"search-result-count\">${matchCount}</span>`;
                    const linesEl = document.createElement('div');
                    linesEl.className = 'search-result-lines';
                    for (const matchLine of lineMatches) {
                        const lineEl = document.createElement('div');
                        lineEl.className = 'search-result-line';
                        lineEl.innerHTML = `<span style=\"color:var(--text-muted);margin-right:8px;\">${matchLine.lineNumber}</span>${matchLine.lineHtml}`;
                        lineEl.title = `Line ${matchLine.lineNumber}`;
                        lineEl.addEventListener('click', (e) => {
                            e.stopPropagation();
                            if (file.isTab) {
                                this.switchToTab(file.tabId);
                                setTimeout(() => {
                                    if (this.editor) {
                                        this.editor.revealLineInCenter(matchLine.lineNumber);
                                        this.editor.setPosition({ lineNumber: matchLine.lineNumber, column: 1 });
                                        this.editor.focus();
                                    }
                                }, 50);
                            } else {
                                this.openFileFromPath(file.path, matchLine.lineNumber);
                            }
                        });
                        linesEl.appendChild(lineEl);
                    }
                    resultEl.appendChild(linesEl);
                    const firstLineNumber = (lineMatches.length > 0 && lineMatches[0].lineNumber) ? lineMatches[0].lineNumber : 1;
                    resultEl.addEventListener('click', () => {
                        if (file.isTab) {
                            this.switchToTab(file.tabId);
                            setTimeout(() => {
                                if (this.editor) {
                                    this.editor.revealLineInCenter(firstLineNumber);
                                    this.editor.setPosition({ lineNumber: firstLineNumber, column: 1 });
                                    this.editor.focus();
                                }
                            }, 50);
                        } else {
                            this.openFileFromPath(file.path, firstLineNumber);
                        }
                    });
                    resultsContainer.appendChild(resultEl);
                }
            } catch (err) { }
        }
        if (totalMatches === 0) {
            resultsContainer.innerHTML = '<div class="search-no-results">No results found.</div>';
        }
    }

    bindEvents() {
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
            if (e.key === 'Enter') {
                const line = parseInt(e.target.value);
                if (!isNaN(line)) {
                    this.editor.setPosition({ lineNumber: line, column: 1 });
                    this.editor.revealLineInCenter(line);
                }
                this.hideGoToLine();
            } else if (e.key === 'Escape') {
                this.hideGoToLine();
            }
        });

        document.addEventListener('click', () => this.hideContextMenu());
        $('fileExplorer')?.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e);
        });

        document.querySelectorAll('.context-item').forEach(item => {
            item.addEventListener('click', () => {
                this.handleContextAction(item.dataset.action);
            });
        });

        document.querySelectorAll('#savedScriptsContextMenu .context-item').forEach(item => {
            item.addEventListener('click', () => {
                this.handleSavedScriptContextAction(item.dataset.action);
            });
        });

        $('newFileBtn')?.addEventListener('click', () => this.createNewFileInFolder());
        $('newFolderBtn')?.addEventListener('click', () => this.createNewFolder());
        $('refreshBtn')?.addEventListener('click', () => this.refreshFolders());
        $('addFolderBtn')?.addEventListener('click', () => this.addFolder());

        this.setupDropZones();

        $('minimapCheckbox')?.addEventListener('change', (e) => {
            this.editor.updateOptions({ minimap: { enabled: e.target.checked } });
            localStorage.setItem('opiumware-minimap', e.target.checked);
        });

        document.querySelectorAll('input[name="theme"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.applyTheme(e.target.value));
        });

        $('robloxBtn')?.addEventListener('click', () => this.openRoblox());
        $('openScriptsFolderBtn')?.addEventListener('click', () => this.openScriptsFolder());
        $('openOpiumwareFolderBtn')?.addEventListener('click', () => this.openOpiumwareFolder());
        $('welcomeNewFile')?.addEventListener('click', () => this.createNewFile());
        $('welcomeOpenFolder')?.addEventListener('click', () => this.addFolder());
        $('replaceBtn')?.addEventListener('click', () => this.replaceNext());
        $('replaceAllBtn')?.addEventListener('click', () => this.replaceAll());

        this.initSidebarResize();
        this.initConsoleResize();

        $('executeBtn')?.addEventListener('click', () => this.executeScript());
        $('consoleClearBtn')?.addEventListener('click', () => this.clearConsole());

        this.initPortSelector();

        $('scripthubSearchInput')?.addEventListener('input', (e) => this.searchScripts(e.target.value));
        $('scripthubSearchInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.searchScripts(e.target.value);
        });
    }

    updateConsoleOutput(message, type = 'output') {
        const output = $('consoleOutput');
        if (!output) return;

        const line = document.createElement('div');
        line.className = 'console-line';

        const prefixMap = {
            'error': ['log-error', '[Error]: '],
            'warning': ['log-warning', '[Warning]: '],
            'info': ['log-info', '[Info]: '],
            'success': ['log-success', '[Success]: ']
        };
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

    clearConsole() {
        const output = $('consoleOutput');
        if (output) { output.innerHTML = ''; this.updateConsoleOutput('Console cleared', 'info'); }
    }

    toggleConsole() {
        const container = $('consoleContainer');
        if (container) { container.classList.toggle('minimized'); this.refreshLucideIcons(); }
    }

    
    initPortSelector() {
        this.selectedPort = 'auto';
        
        const selectorBtn = $('portSelectorBtn');
        const dropdown = $('portSelectorDropdown');
        const portList = $('portList');
        
        if (!selectorBtn || !dropdown) return;
        
        selectorBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
            if (dropdown.classList.contains('show')) {
                this.refreshPortStatus();
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!$('portSelector')?.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
        
        const autoOption = dropdown.querySelector('.port-selector-item[data-port="auto"]');
        if (autoOption) {
            autoOption.addEventListener('click', () => this.selectPort('auto', 'All Ports'));
        }
        
        if (window.electronAPI?.checkPortStatus) {
            setTimeout(() => this.refreshPortStatus(), 1000);
        }
    }
    
    async refreshPortStatus() {
        if (!window.electronAPI?.checkPortStatus) return;
        
        const portList = $('portList');
        if (!portList) return;
        
        try {
            const ports = await window.electronAPI.checkPortStatus();
            portList.innerHTML = '';
            
            const onlinePorts = ports.filter(p => p.online);
            
            if (onlinePorts.length === 0) {
                portList.innerHTML = '<div class="port-selector-empty">No instances detected</div>';
            } else {
                onlinePorts.forEach(portInfo => {
                    const item = document.createElement('div');
                    item.className = 'port-selector-item' + (this.selectedPort === portInfo.port.toString() ? ' selected' : '');
                    item.setAttribute('data-port', portInfo.port.toString());
                    item.innerHTML = `
                        <span class="port-selector-radio"></span>
                        <span>${portInfo.label}</span>
                    `;
                    item.addEventListener('click', () => this.selectPort(portInfo.port.toString(), portInfo.label));
                    portList.appendChild(item);
                });
            }
            
            if (this.selectedPort !== 'auto') {
                const selectedPortInfo = ports.find(p => p.port.toString() === this.selectedPort);
                if (!selectedPortInfo || !selectedPortInfo.online) {
                    this.selectPort('auto', 'All Ports');
                }
            }
        } catch (error) {
            console.error('Failed to refresh port status:', error);
        }
    }
    
    selectPort(port, label) {
        this.selectedPort = port;
        const labelEl = $('portSelectorLabel');
        if (labelEl) {
            labelEl.textContent = port === 'auto' ? 'All Ports' : label || `Port ${port}`;
        }
        
        document.querySelectorAll('.port-selector-item').forEach(item => {
            item.classList.toggle('selected', item.getAttribute('data-port') === port);
        });
        
        $('portSelectorDropdown')?.classList.remove('show');
    }

    async openRoblox() {
        if (window.electronAPI) {
            try {
                const result = await window.electronAPI.openRoblox();
                this.updateConsoleOutput(result.success ? 'Roblox launched successfully' : 'Failed to launch Roblox: ' + result.error, result.success ? 'success' : 'error');
            } catch (error) {
                this.updateConsoleOutput('Failed to open Roblox. Make sure Roblox is installed.', 'error');
            }
        } else {
            window.open('roblox://', '_blank');
            this.updateConsoleOutput('Roblox launch requested', 'info');
        }
    }

    openScriptsFolder() { window.electronAPI?.openScriptsFolder(); }
    openOpiumwareFolder() { window.electronAPI?.openOpiumwareFolder(); }

    replaceNext() {
        const searchText = $('searchInput')?.value;
        const replaceText = $('replaceInput')?.value || '';
        if (!searchText || !this.editor) return;

        const model = this.editor.getModel();
        if (!model) return;

        const searchResult = model.findNextMatch(searchText, this.editor.getPosition(), false, false, null, false);
        if (searchResult) {
            this.editor.setSelection(searchResult.range);
            this.editor.revealLineInCenter(searchResult.range.startLineNumber);
            this.editor.executeEdits('replace', [{ range: searchResult.range, text: replaceText }]);
        }
    }

    replaceAll() {
        const searchText = $('searchInput')?.value;
        const replaceText = $('replaceInput')?.value || '';
        if (!searchText || !this.editor) return;

        const model = this.editor.getModel();
        if (!model) return;

        const matches = model.findMatches(searchText, true, false, false, null, false);
        if (matches.length > 0) {
            const edits = matches.reverse().map(match => ({ range: match.range, text: replaceText }));
            this.editor.executeEdits('replace-all', edits);
            this.updateConsoleOutput(`Replaced ${matches.length} occurrence(s)`, 'info');
        } else {
            this.updateConsoleOutput('No matches found', 'info');
        }
    }

    initSidebarResize() {
        const handle = $('sidebarResizeHandle'), sidebar = $('sidebar');
        if (!handle || !sidebar) return;
        let isResizing = false, startX = 0, startWidth = 0;

        handle.addEventListener('mousedown', (e) => {
            isResizing = true; startX = e.clientX; startWidth = sidebar.offsetWidth;
            sidebar.classList.add('resizing'); document.body.style.cursor = 'ew-resize'; e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            sidebar.style.width = Math.max(180, Math.min(500, startWidth + e.clientX - startX)) + 'px';
        });
        document.addEventListener('mouseup', () => {
            if (isResizing) { isResizing = false; sidebar.classList.remove('resizing'); document.body.style.cursor = ''; }
        });
    }

    initConsoleResize() {
        const handle = $('consoleResizeHandle'), container = $('consoleContainer');
        if (!handle || !container) return;
        let isResizing = false, startY = 0, startHeight = 0;

        handle.addEventListener('mousedown', (e) => {
            isResizing = true; startY = e.clientY; startHeight = container.offsetHeight;
            container.classList.add('resizing'); document.body.style.cursor = 'ns-resize'; e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            container.style.height = Math.max(50, Math.min(window.innerHeight * 0.5, startHeight + startY - e.clientY)) + 'px';
        });
        document.addEventListener('mouseup', () => {
            if (isResizing) { isResizing = false; container.classList.remove('resizing'); document.body.style.cursor = ''; }
        });

        this.initScriptsSectionResize();
    }

    initScriptsSectionResize() {
        const handle = $('sidebarSectionsResizeHandle'), topSection = $('sidebarTopSections');
        if (!handle || !topSection) return;
        let isResizing = false, startY = 0, startHeight = 0;

        handle.addEventListener('mousedown', (e) => {
            isResizing = true; startY = e.clientY; startHeight = topSection.offsetHeight;
            handle.classList.add('dragging'); document.body.style.cursor = 'ns-resize'; e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const sidebar = topSection.closest('.sidebar-content-wrapper');
            const maxHeight = sidebar ? sidebar.offsetHeight - 150 : 400;
            const newHeight = Math.max(100, Math.min(maxHeight, startHeight + (e.clientY - startY)));
            topSection.style.flex = 'none';
            topSection.style.height = newHeight + 'px';
        });
        document.addEventListener('mouseup', () => {
            if (isResizing) { isResizing = false; handle.classList.remove('dragging'); document.body.style.cursor = ''; }
        });
    }

    updateScriptsSectionResizeHandle() {
        const handle = $('sidebarSectionsResizeHandle');
        if (handle) {
            handle.classList.toggle('visible', this.workspaceFolders.length > 0);
        }
    }

    async renderAutoexecList() {
        const list = $('autoexecList');
        if (!list || !window.electronAPI?.getAutoexecScripts) return;
        
        const result = await window.electronAPI.getAutoexecScripts();
        if (!result.success || result.scripts.length === 0) {
            list.innerHTML = '<div class="autoexec-empty">No autoexec scripts</div>';
            return;
        }
        
        list.innerHTML = '';
        for (const script of result.scripts) {
            const item = document.createElement('div');
            item.className = 'autoexec-item';
            item.innerHTML = `
                <i data-lucide="${this.getFileIconName(script.name)}" class="file-icon"></i>
                <span class="file-name">${script.name}</span>
                <button class="remove-btn" title="Remove from autoexec"><i data-lucide="x"></i></button>
            `;
            item.querySelector('.file-name').addEventListener('click', () => this.openFileFromPath(script.path));
            item.querySelector('.remove-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                const result = await window.electronAPI.removeAutoexecScript(script.name);
                if (result.success) {
                    this.updateConsoleOutput(`Removed ${script.name} from autoexec`, 'info');
                    await this.renderAutoexecList();
                    await this.renderLocalScripts();
                }
            });
            
            list.appendChild(item);
        }
        
        this.refreshLucideIcons();
    }

    async toggleAutoexec(filePath, fileName) {
        if (!window.electronAPI) return;
        
        const result = await window.electronAPI.toggleAutoexec(filePath, fileName);
        if (result.success) {
            this.updateConsoleOutput(
                result.enabled 
                    ? `Added ${fileName} to autoexec` 
                    : `Removed ${fileName} from autoexec`,
                'info'
            );
            await this.refreshSavedScripts();
            await this.renderAutoexecList();
        } else {
            await this.showAlertDialog('Failed to toggle autoexec: ' + result.error);
        }
    }

    async isAutoexecEnabled(fileName) {
        if (!window.electronAPI) return false;
        const result = await window.electronAPI.isAutoexecEnabled(fileName);
        return result.enabled || false;
    }

    async showSavedScriptContextMenu(event, file) {
        event.preventDefault();
        event.stopPropagation();
        
        const menu = $('savedScriptsContextMenu');
        if (!menu) return;
        
        this.contextMenuFile = file;
        
        const autoexecLabel = $('autoexecLabel');
        if (autoexecLabel) {
            const isEnabled = await this.isAutoexecEnabled(file.name);
            autoexecLabel.textContent = isEnabled ? 'Remove from Autoexec' : 'Add to Autoexec';
        }
        
        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;
        menu.classList.remove('hidden');
        
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) { menu.classList.add('hidden'); document.removeEventListener('click', closeMenu); }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }

    async handleSavedScriptContextAction(action) {
        const file = this.contextMenuFile;
        if (!file) return;
        
        $('savedScriptsContextMenu')?.classList.add('hidden');
        
        switch (action) {
            case 'open': await this.openFileFromPath(file.path); break;
            case 'execute': await this.openFileFromPath(file.path); this.executeScript(); break;
            case 'toggleAutoexec': await this.toggleAutoexec(file.path, file.name); break;
            case 'rename': await this.renameScript(file.path, file.name); break;
            case 'delete': await this.deleteScript(file.path, file.name); break;
        }
    }

    bindElectronEvents() {
        if (!window.electronAPI) return;

        window.electronAPI.onFileOpened((data) => {
            this.openFile(data.path, data.content);
        });

        window.electronAPI.onFolderOpened((data) => {
            if (!this.workspaceFolders.some(f => f.path === data.path)) {
                const folderName = data.path.split('/').pop();
                this.workspaceFolders.push({
                    path: data.path,
                    name: folderName,
                    tree: data.tree,
                    expanded: true
                });
                this.updateAllFiles();
                this.renderFolders();
            }
        });

        window.electronAPI.onConsoleOutput((data) => {
            this.updateConsoleOutput(data.message, data.type);
        });

        window.electronAPI.onConsoleBatch((logs) => {
            for (const log of logs) {
                this.updateConsoleOutput(log.message, log.type);
            }
        });

        window.electronAPI.onTrayExecuteScript((data) => {
            this.updateConsoleOutput(`Executing from tray: "${data.name}"`, 'info');
            this.runScript(data.content, data.name);
        });

        this.startLogMonitoring();

        window.electronAPI.onMenuNewFile(() => this.createNewFile());
        window.electronAPI.onMenuSave(() => this.saveCurrentFile());
        window.electronAPI.onMenuSaveAs(() => this.saveCurrentFileAs());
        window.electronAPI.onMenuCloseTab(() => this.closeActiveTab());
        window.electronAPI.onMenuFind(() => this.editor?.getAction('actions.find')?.run());
        window.electronAPI.onMenuReplace(() => this.editor?.getAction('editor.action.startFindReplaceAction')?.run());
        window.electronAPI.onMenuGoToFile(() => this.showQuickOpen());
        window.electronAPI.onMenuGoToLine(() => this.showGoToLine());
    }

    async startLogMonitoring() {
        if (window.electronAPI?.startLogMonitoring) {
            try {
                await window.electronAPI.startLogMonitoring();
            } catch (error) {
                console.error('[Opiumware] Failed to start log monitoring:', error);
            }
        }
    }

    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const modifier = isMac ? e.metaKey : e.ctrlKey;

            if (modifier && e.key === 'f') {
                e.preventDefault();
                e.stopPropagation();
                this.switchPanel('search');
                $('searchInput')?.focus();
            } else if (modifier && e.key === 'o') {
                e.preventDefault();
                e.stopPropagation();
                this.openFileDialog();
            } else if (modifier && e.key === 'p') {
                e.preventDefault();
                e.stopPropagation();
                this.showQuickOpen();
            } else if (modifier && e.shiftKey && e.key === 'e') {
                e.preventDefault();
                e.stopPropagation();
                this.runScript();
            } else if (modifier && e.key === 's') {
                e.preventDefault();
                e.shiftKey ? this.saveCurrentFileAs() : this.saveCurrentFile();
            } else if (modifier && e.key === 't') {
                e.preventDefault(); this.createNewFile();
            } else if (modifier && e.key === 'w') {
                e.preventDefault(); this.closeActiveTab();
            } else if (e.key === 'Escape') {
                this.hideQuickOpen(); this.hideGoToLine(); this.hideContextMenu();
            }
        }, true);
    }

    async openFileDialog() {
        const result = await window.electronAPI.openFileDialog();
        if (result.success) {
            this.openFile(result.path, result.content);
        }
    }

    switchPanel(panelName) {
        document.querySelectorAll('.activity-icon[data-panel]').forEach(icon => icon.classList.toggle('active', icon.dataset.panel === panelName));
        document.querySelectorAll('.sidebar-panel').forEach(panel => panel.classList.add('hidden'));
        $(`${panelName}Panel`)?.classList.remove('hidden');
        if (panelName === 'autoexec') this.renderAutoexecList();
    }

    toggleSidebar() {
        const sidebar = $('sidebar');
        const currentWidth = sidebar.offsetWidth;
        if (currentWidth > 0) {
            sidebar.dataset.prevWidth = currentWidth;
            sidebar.style.width = '0px'; sidebar.style.minWidth = '0px'; sidebar.style.borderRight = 'none';
        } else {
            const prevWidth = sidebar.dataset.prevWidth || 280;
            sidebar.style.width = prevWidth + 'px'; sidebar.style.minWidth = '180px'; sidebar.style.borderRight = '';
        }
    }

    async addFolder() {
        if (!window.electronAPI) return;
        const result = await window.electronAPI.openFolderDialog();
        if (result.success && !this.workspaceFolders.some(f => f.path === result.path)) {
            this.workspaceFolders.push({
                path: result.path,
                name: result.path.split('/').pop(),
                tree: result.tree,
                expanded: true
            });
            this.updateAllFiles();
            this.renderFolders();
        }
    }

    removeFolder(folderPath) {
        this.workspaceFolders = this.workspaceFolders.filter(f => f.path !== folderPath);
        this.updateAllFiles();
        this.renderFolders();
    }

    updateAllFiles() {
        this.allFiles = [];
        for (const folder of this.workspaceFolders) {
            const files = this.flattenFileTree(folder.tree, folder.name);
            this.allFiles = this.allFiles.concat(files);
        }
    }

    renderFolders() {
        const container = $('foldersList');
        container.innerHTML = '';
        this.updateScriptsSectionResizeHandle();
        
        for (const folder of this.workspaceFolders) {
            const folderSection = document.createElement('div');
            folderSection.className = 'folder-section';
            folderSection.dataset.path = folder.path;
            
            const header = document.createElement('div');
            header.className = `folder-section-header ${folder.expanded ? 'expanded' : ''}`;
            header.innerHTML = `
                <i data-lucide="${folder.expanded ? 'chevron-down' : 'chevron-right'}" class="chevron"></i>
                <i data-lucide="folder${folder.expanded ? '-open' : ''}" class="folder-icon"></i>
                <span class="folder-section-name">${folder.name.toUpperCase()}</span>
                <button class="folder-remove-btn" title="Remove Folder">
                    <i data-lucide="x"></i>
                </button>
            `;
            
            header.addEventListener('click', (e) => {
                if (e.target.closest('.folder-remove-btn')) {
                    e.stopPropagation();
                    this.removeFolder(folder.path);
                    return;
                }
                folder.expanded = !folder.expanded;
                this.renderFolders();
            });
            
            folderSection.appendChild(header);
            
            if (folder.expanded) {
                const content = document.createElement('div');
                content.className = 'folder-section-content';
                this.renderTreeItems(folder.tree, content, 0, folder.path);
                folderSection.appendChild(content);
            }
            
            container.appendChild(folderSection);
        }
        
        this.refreshLucideIcons();
    }

    flattenFileTree(tree, parentPath = '') {
        let files = [];
        for (const item of tree) {
            const fullPath = parentPath ? `${parentPath}/${item.name}` : item.name;
            if (item.type === 'file') {
                files.push({ ...item, relativePath: fullPath });
            } else if (item.children) {
                files = files.concat(this.flattenFileTree(item.children, fullPath));
            }
        }
        return files;
    }

    renderTreeItems(items, container, indent) {
        for (const item of items) {
            if (item.type === 'folder') {
                const folderEl = document.createElement('div');
                folderEl.className = 'folder-item';
                folderEl.dataset.path = item.path;
                folderEl.style.paddingLeft = `${8 + indent * 16}px`;
                folderEl.innerHTML = `
                    <i data-lucide="chevron-right" class="chevron"></i>
                    <i data-lucide="folder" class="file-icon folder"></i>
                    <span class="file-name">${item.name}</span>
                `;

                folderEl.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    folderEl.classList.add('drag-over');
                });
                
                folderEl.addEventListener('dragleave', () => {
                    folderEl.classList.remove('drag-over');
                });
                
                folderEl.addEventListener('drop', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    folderEl.classList.remove('drag-over');
                    await this.handleDropToFolder(item.path);
                });

                folderEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    folderEl.classList.toggle('expanded');
                    const folderIcon = folderEl.querySelector('.file-icon');
                    const chevronIcon = folderEl.querySelector('.chevron');
                    if (folderEl.classList.contains('expanded')) {
                        folderIcon.setAttribute('data-lucide', 'folder-open');
                        chevronIcon.style.transform = 'rotate(90deg)';
                    } else {
                        folderIcon.setAttribute('data-lucide', 'folder');
                        chevronIcon.style.transform = 'rotate(0deg)';
                    }
                    this.refreshLucideIcons();
                });

                container.appendChild(folderEl);

                if (item.children && item.children.length > 0) {
                    const childrenEl = document.createElement('div');
                    childrenEl.className = 'folder-children';
                    this.renderTreeItems(item.children, childrenEl, indent + 1);
                    container.appendChild(childrenEl);
                }
            } else {
                const fileEl = document.createElement('div');
                fileEl.dataset.path = item.path;
                fileEl.dataset.source = 'workspace';
                fileEl.draggable = true;
                fileEl.style.paddingLeft = `${24 + indent * 16}px`;
                
                const openTab = this.tabs.find(t => t.path === item.path);
                const isActive = openTab && openTab.id === this.activeTabId;
                const isModified = openTab && openTab.modified;
                const isOpened = !!openTab;
                
                fileEl.className = `tree-file ${isActive ? 'active' : ''}`;
                
                let indicators = '';
                if (isModified) indicators += '<span class="status-dot modified" title="Modified - unsaved changes"></span>';
                if (isOpened && !isModified) indicators += '<span class="status-dot opened" title="Opened in editor"></span>';
                
                const iconName = this.getFileIconName(item.name);
                fileEl.innerHTML = `
                    <i data-lucide="${iconName}" class="file-icon"></i>
                    <span class="file-name">${item.name}</span>
                    ${indicators ? `<div class="file-status-indicators">${indicators}</div>` : ''}
                `;

                fileEl.addEventListener('click', () => this.openFileFromPath(item.path));
                fileEl.addEventListener('dblclick', () => this.openFileFromPath(item.path));
                fileEl.addEventListener('dragstart', (e) => this.handleDragStart(e, item));

                container.appendChild(fileEl);
            }
        }
    }

    async handleDropToFolder(folderPath) {
        if (!this.draggedItem) return;
        const sourcePath = this.draggedItem.path;
        const targetPath = `${folderPath}/${this.draggedItem.name}`;
        if (sourcePath === targetPath) return;
        
        if (window.electronAPI) {
            const result = await window.electronAPI.moveFile(sourcePath, targetPath);
            if (result.success) { await this.refreshSavedScripts(); await this.refreshFolders(); }
            else await this.showAlertDialog('Failed to move file: ' + (result.error || 'Unknown error'));
        }
        this.draggedItem = null;
    }

    async openFileFromPath(filePath, lineNumber = 1) {
        const existingTab = this.tabs.find(t => t.path === filePath);
        if (existingTab) {
            this.switchToTab(existingTab.id);
            setTimeout(() => {
                if (this.editor?.revealLineInCenter) {
                    this.editor.revealLineInCenter(lineNumber);
                    this.editor.setPosition({ lineNumber, column: 1 });
                    this.editor.focus();
                }
            }, 50);
            return;
        }
        if (!window.electronAPI) return;
        const result = await window.electronAPI.readFile(filePath);
        if (result.success) {
            this.openFile(filePath, result.content);
            setTimeout(() => {
                if (this.editor?.revealLineInCenter) {
                    this.editor.revealLineInCenter(lineNumber);
                    this.editor.setPosition({ lineNumber, column: 1 });
                    this.editor.focus();
                }
            }, 100);
        }
    }

    openFile(filePath, content) {
        const existingTab = this.tabs.find(t => t.path === filePath);
        if (existingTab) { this.switchToTab(existingTab.id); return; }

        const tab = {
            id: Date.now().toString(),
            path: filePath,
            name: filePath.split('/').pop(),
            content: content,
            language: this.getLanguageFromPath(filePath),
            modified: false
        };
        this.tabs.push(tab);
        this.renderTabs();
        this.switchToTab(tab.id);
        this.hideWelcome();
    }

    createNewFile() {
        let baseName = 'Untitled', counter = 1, fileName = `${baseName}.lua`;
        const existingNames = new Set(this.tabs.map(t => t.name));
        while (existingNames.has(fileName)) { fileName = `${baseName}-${counter}.lua`; counter++; }
        
        const tab = {
            id: Date.now().toString(),
            path: null,
            name: fileName,
            content: '',
            language: 'lua',
            modified: true
        };

        this.tabs.push(tab);
        this.renderTabs();
        this.switchToTab(tab.id);
        this.hideWelcome();
    }

    async createNewFileInFolder() {
        if (this.workspaceFolders.length === 0) { this.createNewFile(); return; }
        
        let targetFolder = this.workspaceFolders[0].path;
        if (this.workspaceFolders.length > 1) {
            const folderChoice = await this.showFolderChoice('Create file in:');
            if (!folderChoice) return;
            targetFolder = folderChoice;
        }
        
        const name = await this.showInputDialog('Enter file name:', 'script.lua');
        if (!name) return;

        if (window.electronAPI) {
            const result = await window.electronAPI.createFile(`${targetFolder}/${name}`);
            if (result.success) { await this.refreshFolders(); this.openFile(`${targetFolder}/${name}`, ''); }
            else await this.showAlertDialog('Failed to create file: ' + (result.error || 'Unknown error'));
        }
    }

    async createNewFolder() {
        if (this.workspaceFolders.length === 0) { await this.showAlertDialog('Please add a folder first'); return; }
        
        let targetFolder = this.workspaceFolders[0].path;
        if (this.workspaceFolders.length > 1) {
            const folderChoice = await this.showFolderChoice('Create folder in:');
            if (!folderChoice) return;
            targetFolder = folderChoice;
        }
        
        const name = await this.showInputDialog('Enter folder name:', 'New Folder');
        if (!name) return;

        if (window.electronAPI) {
            const result = await window.electronAPI.createFolder(`${targetFolder}/${name}`);
            if (result.success) await this.refreshFolders();
            else await this.showAlertDialog('Failed to create folder: ' + (result.error || 'Unknown error'));
        }
    }

    showFolderChoice(title) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'save-choice-overlay';
            overlay.innerHTML = `
                <div class="save-choice-modal">
                    <h3>${title}</h3>
                    ${this.workspaceFolders.map(f => `
                        <button class="save-choice-btn folder-choice" data-path="${f.path}">
                            <i data-lucide="folder"></i>
                            <span>${f.name}</span>
                        </button>
                    `).join('')}
                    <button class="save-choice-cancel">Cancel</button>
                </div>
            `;
            
            document.body.appendChild(overlay);
            this.refreshLucideIcons();
            
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay || e.target.classList.contains('save-choice-cancel')) {
                    overlay.remove();
                    resolve(null);
                }
                const btn = e.target.closest('.folder-choice');
                if (btn) {
                    overlay.remove();
                    resolve(btn.dataset.path);
                }
            });
        });
    }

    async saveCurrentFile() {
        const tab = this.tabs.find(t => t.id === this.activeTabId);
        if (!tab) return;

        if (!tab.path) {
            return this.saveCurrentFileAs();
        }

        if (window.electronAPI) {
            const content = this.editor.getValue();
            const result = await window.electronAPI.writeFile(tab.path, content);
            if (result.success) {
                tab.content = content;
                tab.modified = false;
                this.renderTabs();
            }
        }
    }

    async saveCurrentFileAs() {
        const tab = this.tabs.find(t => t.id === this.activeTabId);
        if (!tab) return;

        const result = await this.showSaveModal(tab.name || 'script.lua');
        if (!result) return;

        if (window.electronAPI) {
            const content = this.editor.getValue();
            
            if (result.location === 'opiumware') {
                const savePath = `${this.opiumwareScriptsPath}/${result.name}`;
                const saveResult = await window.electronAPI.writeFile(savePath, content);
                if (saveResult.success) {
                    tab.path = savePath;
                    tab.name = result.name;
                    tab.language = this.getLanguageFromPath(savePath);
                    tab.content = content;
                    tab.modified = false;
                    this.renderTabs();
                    await this.refreshSavedScripts();
                    window.electronAPI.refreshTrayMenu?.();
                    
                    const model = this.editor.getModel();
                    monaco.editor.setModelLanguage(model, tab.language);
                    this.updateLanguageStatus(tab.language);
                }
            } else {
                const dialogResult = await window.electronAPI.saveFileDialog(result.name);
                if (dialogResult.success) {
                    tab.path = dialogResult.path;
                    tab.name = dialogResult.path.split('/').pop();
                    tab.language = this.getLanguageFromPath(dialogResult.path);
                    await this.saveCurrentFile();
                    
                    const model = this.editor.getModel();
                    monaco.editor.setModelLanguage(model, tab.language);
                    this.updateLanguageStatus(tab.language);
                }
            }
        }
    }

    showSaveModal(defaultName) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'save-modal-overlay';
            overlay.innerHTML = `
                <div class="save-modal">
                    <h3>Save Script</h3>
                    <div class="save-modal-input-container">
                        <label>File Name</label>
                        <input type="text" class="save-modal-input" value="${defaultName}" placeholder="script.lua">
                    </div>
                    <div class="save-modal-buttons">
                        <button class="save-modal-btn save-modal-opiumware">
                            <i data-lucide="folder-heart"></i>
                            <span>Save to Opiumware</span>
                        </button>
                        <button class="save-modal-btn save-modal-custom">
                            <i data-lucide="folder-open"></i>
                            <span>Save to Custom Location</span>
                        </button>
                    </div>
                    <button class="save-modal-cancel">Cancel</button>
                </div>
            `;
            
            document.body.appendChild(overlay);
            this.refreshLucideIcons();
            
            const input = overlay.querySelector('.save-modal-input');
            input.focus();
            input.select();
            
            const cleanup = (result) => {
                overlay.remove();
                resolve(result);
            };
            
            overlay.querySelector('.save-modal-opiumware').addEventListener('click', () => {
                const name = input.value.trim() || 'script.lua';
                cleanup({ location: 'opiumware', name });
            });
            
            overlay.querySelector('.save-modal-custom').addEventListener('click', () => {
                const name = input.value.trim() || 'script.lua';
                cleanup({ location: 'custom', name });
            });
            
            overlay.querySelector('.save-modal-cancel').addEventListener('click', () => cleanup(null));
            
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) cleanup(null);
            });
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const name = input.value.trim() || 'script.lua';
                    cleanup({ location: 'opiumware', name });
                } else if (e.key === 'Escape') {
                    cleanup(null);
                }
            });
        });
    }

    async refreshFolders() {
        if (this.workspaceFolders.length === 0) return;
        if (!window.electronAPI) return;

        try {
            for (const folder of this.workspaceFolders) {
                const result = await window.electronAPI.readDirectory(folder.path);
                if (result.success) {
                    folder.tree = result.tree;
                }
            }
            this.updateAllFiles();
            this.renderFolders();
        } catch (error) {
            console.error('Failed to refresh folders:', error);
        }
    }


    renderTabs() {
        const container = $('tabsScroll');
        container.innerHTML = '';

        for (const tab of this.tabs) {
            const isExternal = tab.path && this.opiumwareScriptsPath && 
                !tab.path.startsWith(this.opiumwareScriptsPath + '/') && 
                tab.path !== this.opiumwareScriptsPath;
            
            const tabEl = document.createElement('div');
            tabEl.className = `tab ${tab.id === this.activeTabId ? 'active' : ''} ${tab.modified ? 'modified' : ''} ${isExternal ? 'external' : ''}`;
            tabEl.dataset.tabId = tab.id;

            const iconName = this.getFileIconName(tab.name);
            tabEl.innerHTML = `
                <i data-lucide="${iconName}" class="file-icon"></i>
                <span class="tab-name">${tab.name}</span>
                <span class="tab-close"><i data-lucide="x"></i></span>
                <span class="tab-modified"></span>
                <span class="tab-external" title="External file - not saved to Opium"></span>
            `;

            tabEl.addEventListener('click', (e) => {
                if (!e.target.closest('.tab-close')) {
                    this.switchToTab(tab.id);
                }
            });

            tabEl.querySelector('.tab-close').addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeTab(tab.id);
            });

            container.appendChild(tabEl);
        }

        this.refreshLucideIcons();
        this.scheduleExplorerUpdate();
    }
    
    scheduleExplorerUpdate() {
        if (this.explorerUpdateTimeout) {
            clearTimeout(this.explorerUpdateTimeout);
        }
        this.explorerUpdateTimeout = setTimeout(() => {
            this.renderLocalScripts();
            this.refreshFolders();
        }, 50);
    }

    switchToTab(tabId) {
        if (this.activeTabId) {
            const currentTab = this.tabs.find(t => t.id === this.activeTabId);
            if (currentTab) {
                currentTab.content = this.editor.getValue();
                currentTab.viewState = this.editor.saveViewState();
            }
        }

        this.activeTabId = tabId;
        const tab = this.tabs.find(t => t.id === tabId);
        
        if (tab) {
            const model = monaco.editor.createModel(tab.content, tab.language);
            this.editor.setModel(model);
            
            if (tab.viewState) {
                this.editor.restoreViewState(tab.viewState);
            }

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
            const result = await this.showSaveDialog(`Do you want to save changes to ${tab.name}?`);
            this.isClosingTab = false;
            
            if (result === 'save') {
                await this.saveCurrentFile();
            } else if (result === 'cancel') {
                return;
            }
        }

        const index = this.tabs.findIndex(t => t.id === tabId);
        this.tabs.splice(index, 1);

        if (this.activeTabId === tabId) {
            if (this.tabs.length > 0) {
                const newIndex = Math.min(index, this.tabs.length - 1);
                this.switchToTab(this.tabs[newIndex].id);
            } else {
                this.activeTabId = null;
                this.showWelcome();
            }
        }

        this.renderTabs();
    }

    closeActiveTab() {
        if (this.activeTabId && !this.isClosingTab) {
            this.closeTab(this.activeTabId);
        }
    }

    markTabAsModified(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (tab && !tab.modified) {
            tab.modified = true;
            this.renderTabs();
        }
    }


    updateCursorPosition(position) {
        $('cursorPosition').textContent = `Ln ${position.lineNumber}, Col ${position.column}`;
    }

    updateBreadcrumb(path) {
        const container = $('breadcrumb');
        if (!path) { container.innerHTML = ''; return; }
        const parts = path.split('/');
        container.innerHTML = parts.map((part, i) => {
            const isLast = i === parts.length - 1;
            return `<span class="breadcrumb-item">${part}</span>${isLast ? '' : '<span class="breadcrumb-separator">›</span>'}`;
        }).join('');
    }

    updateLanguageStatus(language) {
        const langNames = { 'javascript': 'JavaScript', 'typescript': 'TypeScript', 'python': 'Python', 
            'rust': 'Rust', 'html': 'HTML', 'css': 'CSS', 'json': 'JSON', 'markdown': 'Markdown', 'plaintext': 'Plain Text' };
        $('languageStatus').textContent = langNames[language] || language;
    }

    hideWelcome() {
        $('welcomeTab')?.classList.add('hidden');
        $('monacoEditor')?.classList.remove('editor-hidden');
    }

    showWelcome() {
        $('welcomeTab')?.classList.remove('hidden');
        $('monacoEditor')?.classList.add('editor-hidden');
        this.editor.setValue('');
        $('breadcrumb').innerHTML = '';
    }

    showQuickOpen() {
        const modal = $('quickOpenModal'), input = $('quickOpenSearch');
        modal.classList.remove('hidden');
        input.value = '';
        input.focus();
        this.renderSmartSearchResults('');
    }

    hideQuickOpen() {
        $('quickOpenModal').classList.add('hidden');
    }

    filterQuickOpen(query) {
        clearTimeout(this.smartSearchTimeout);
        this.smartSearchTimeout = setTimeout(() => {
            this.renderSmartSearchResults(query);
        }, 200);
    }

    async renderSmartSearchResults(query) {
        const container = $('quickOpenResults');
        container.innerHTML = '';
        
        const lowerQuery = query.toLowerCase().trim();
        
        const savedFiles = this.flattenTree(this.savedScripts);
        const filteredSaved = lowerQuery 
            ? savedFiles.filter(f => f.name.toLowerCase().includes(lowerQuery))
            : savedFiles;
        
        const filteredFolders = lowerQuery
            ? this.allFiles.filter(f => f.name.toLowerCase().includes(lowerQuery) || f.relativePath.toLowerCase().includes(lowerQuery))
            : this.allFiles;
        
        let scripthubResults = [];
        if (lowerQuery && lowerQuery.length >= 2) {
            try {
                const url = `https://scriptblox.com/api/script/search?q=${encodeURIComponent(lowerQuery)}`;
                const response = await fetch(url);
                const data = await response.json();
                scripthubResults = (data.result?.scripts || []).slice(0, 5);
            } catch (error) {
                console.log('ScriptHub search failed:', error);
            }
        }
        
        if (filteredSaved.length === 0 && filteredFolders.length === 0 && scripthubResults.length === 0) {
            container.innerHTML = `
                <div class="quick-open-empty">
                    <i data-lucide="search-x"></i>
                    <span>No scripts found</span>
                </div>
            `;
            this.refreshLucideIcons();
            return;
        }
        
        if (filteredSaved.length > 0) {
            const categoryEl = document.createElement('div');
            categoryEl.className = 'search-category';
            categoryEl.textContent = 'Saved Scripts';
            container.appendChild(categoryEl);
            
            for (const file of filteredSaved.slice(0, 5)) {
                const itemEl = this.createSmartSearchItem({
                    type: 'saved',
                    name: file.name,
                    path: file.path,
                    subtitle: 'Local Scripts',
                    icon: this.getFileIconName(file.name)
                });
                container.appendChild(itemEl);
            }
        }
        
        if (filteredFolders.length > 0) {
            const categoryEl = document.createElement('div');
            categoryEl.className = 'search-category';
            categoryEl.textContent = 'Folders';
            container.appendChild(categoryEl);
            
            for (const file of filteredFolders.slice(0, 5)) {
                const itemEl = this.createSmartSearchItem({
                    type: 'folder',
                    name: file.name,
                    path: file.path,
                    subtitle: file.relativePath,
                    icon: this.getFileIconName(file.name)
                });
                container.appendChild(itemEl);
            }
        }
        
        if (scripthubResults.length > 0) {
            const categoryEl = document.createElement('div');
            categoryEl.className = 'search-category';
            categoryEl.textContent = 'ScriptHub';
            container.appendChild(categoryEl);
            
            for (const script of scripthubResults) {
                const itemEl = this.createSmartSearchItem({
                    type: 'scripthub',
                    name: script.title || 'Untitled',
                    subtitle: script.game?.name || 'Universal',
                    icon: null,
                    script: script
                });
                container.appendChild(itemEl);
            }
        }
        
        this.refreshLucideIcons();
    }

    createSmartSearchItem(item) {
        const itemEl = document.createElement('div');
        itemEl.className = 'quick-open-item';
        itemEl.dataset.type = item.type;
        if (item.path) itemEl.dataset.path = item.path;
        
        let actionsHtml = '';
        if (item.type === 'saved') {
            actionsHtml = `
                <button class="quick-open-btn execute" title="Execute"><i data-lucide="play"></i></button>
                <button class="quick-open-btn load" title="Open"><i data-lucide="file-input"></i></button>
            `;
        } else if (item.type === 'folder') {
            actionsHtml = `
                <button class="quick-open-btn load" title="Open"><i data-lucide="file-input"></i></button>
            `;
        } else if (item.type === 'scripthub') {
            actionsHtml = `
                <button class="quick-open-btn execute" title="Direct Execute"><i data-lucide="play"></i></button>
                <button class="quick-open-btn load" title="Load Script"><i data-lucide="file-input"></i></button>
            `;
        }
        
        let iconHtml = '';
        if (item.type === 'scripthub' && item.script && item.script.game && item.script.game.imageUrl) {
            const imgUrl = item.script.game.imageUrl.startsWith('http') ? item.script.game.imageUrl : '';
            iconHtml = `<img src="${imgUrl}" class="file-icon game-icon" alt="Game Icon" onerror="this.style.display='none'">`;
        } else {
            iconHtml = `<i data-lucide="${item.icon}" class="file-icon"></i>`;
        }
        itemEl.innerHTML = `
            ${iconHtml}
            <div class="quick-open-item-info">
                <span class="quick-open-item-name">${this.escapeHtml(item.name)}</span>
                <span class="quick-open-item-path">${this.escapeHtml(item.subtitle)}</span>
            </div>
            <div class="quick-open-item-actions">${actionsHtml}</div>
        `;
        
        itemEl.addEventListener('click', (e) => {
            if (e.target.closest('.quick-open-btn')) return;
            if (item.type === 'scripthub') {
                this.loadScriptHubScript(item.script);
            } else {
                this.openFileFromPath(item.path);
            }
            this.hideQuickOpen();
        });
        
        itemEl.querySelector('.quick-open-btn.execute')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (item.type === 'scripthub') {
                this.directExecuteScript(item.script);
            } else {
                this.executeScriptFromPath(item.path, item.name);
            }
            this.hideQuickOpen();
        });
        
        itemEl.querySelector('.quick-open-btn.load')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (item.type === 'scripthub') {
                this.loadScriptHubScript(item.script);
            } else {
                this.openFileFromPath(item.path);
            }
            this.hideQuickOpen();
        });
        
        return itemEl;
    }

    loadScriptHubScript(script) {
        const content = script.script || '';
        const title = script.title || 'ScriptHub Script';
        this.createNewTab(title + '.lua', content);
    }

    handleQuickOpenKeydown(e) {
        const items = document.querySelectorAll('.quick-open-item');
        const selected = document.querySelector('.quick-open-item.selected');
        let index = Array.from(items).indexOf(selected);

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (index < items.length - 1) {
                selected?.classList.remove('selected');
                items[index + 1].classList.add('selected');
                items[index + 1].scrollIntoView({ block: 'nearest' });
            } else if (index === -1 && items.length > 0) {
                items[0].classList.add('selected');
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (index > 0) {
                selected?.classList.remove('selected');
                items[index - 1].classList.add('selected');
                items[index - 1].scrollIntoView({ block: 'nearest' });
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selectedItem = document.querySelector('.quick-open-item.selected') || items[0];
            if (selectedItem) {
                selectedItem.click();
            }
        } else if (e.key === 'Escape') {
            this.hideQuickOpen();
        }
    }


    showGoToLine() {
        const modal = $('goToLineModal'), input = $('goToLineInput');
        modal.classList.remove('hidden');
        input.value = '';
        input.focus();
    }

    hideGoToLine() { $('goToLineModal').classList.add('hidden'); }

    showContextMenu(e) {
        const menu = $('contextMenu');
        menu.classList.remove('hidden');
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;
        this.contextMenuTarget = e.target.closest('.tree-file, .folder-item');
    }

    hideContextMenu() { $('contextMenu').classList.add('hidden'); this.contextMenuTarget = null; }

    async handleContextAction(action) {
        const target = this.contextMenuTarget;
        if (!target) return;

        const path = target.dataset.path;

        switch (action) {
            case 'newFile':
                await this.createNewFileInFolder();
                break;
            case 'newFolder':
                await this.createNewFolder();
                break;
            case 'rename':
                const newName = await this.showInputDialog('Enter new name:', path.split('/').pop());
                if (newName && window.electronAPI) {
                    const dir = path.substring(0, path.lastIndexOf('/'));
                    const newPath = `${dir}/${newName}`;
                    await window.electronAPI.renameItem(path, newPath);
                    this.refreshFolders();
                }
                break;
            case 'delete':
                const confirmDelete = await this.showConfirmDialog(`Delete ${path.split('/').pop()}?`);
                if (confirmDelete && window.electronAPI) {
                    await window.electronAPI.deleteItem(path);
                    this.refreshFolders();
                }
                break;
            case 'copyPath':
                navigator.clipboard.writeText(path);
                break;
        }

        this.hideContextMenu();
    }

    initScriptHub() { this.fetchScripts(); }

    async fetchScripts(query = '') {
        const loading = $('scripthubLoading'), list = $('scripthubList');
        loading?.classList.remove('hidden');
        list.innerHTML = '';

        try {
            const url = query 
                ? `https://scriptblox.com/api/script/search?q=${encodeURIComponent(query)}`
                : 'https://scriptblox.com/api/script/fetch';
            const response = await fetch(url);
            const data = await response.json();
            this.scripthubScripts = data.result?.scripts || [];
            this.renderScriptHub();
        } catch (error) {
            list.innerHTML = `<div class="scripthub-empty"><i data-lucide="x-circle"></i><p>Failed to load scripts.</p></div>`;
            this.refreshLucideIcons();
        } finally {
            loading?.classList.add('hidden');
        }
    }

    searchScripts(query) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.fetchScripts(query), 500);
    }

    renderScriptHub() {
        const list = $('scripthubList');
        list.innerHTML = '';

        if (this.scripthubScripts.length === 0) {
            list.innerHTML = `<div class="scripthub-empty"><i data-lucide="book-open"></i><p>No scripts found.</p></div>`;
            this.refreshLucideIcons();
            return;
        }

        for (const script of this.scripthubScripts) {
            const card = document.createElement('div');
            card.className = 'script-card';
            
            const title = script.title || 'Untitled Script';
            const game = script.game?.name || 'Universal';
            const date = script.createdAt ? new Date(script.createdAt).toLocaleDateString() : '';
            const isKey = script.key;
            
            const fallbackImage = 'https://www.publicdomainpictures.net/pictures/220000/velka/planet-1494403454Zmz.jpg';
            const rawImageUrl = script.game?.imageUrl;
            const imageUrl = rawImageUrl && rawImageUrl.startsWith('http') ? rawImageUrl : fallbackImage;

            card.innerHTML = `
                <div class="script-card-image" style="background-image: url('${imageUrl}')"></div>
                <div class="script-card-overlay"></div>
                <div class="script-card-content">
                    <div class="script-title">${this.escapeHtml(title)}</div>
                    <div class="script-game">${this.escapeHtml(game)}</div>
                    <div class="script-meta">
                        ${date ? `<span>Added: ${date}</span>` : ''}
                        ${isKey ? '<span class="script-key-badge">Likely requires key</span>' : ''}
                    </div>
                    <div class="script-actions">
                        <button class="script-btn" data-action="direct" title="Direct Execute">Direct Execute</button>
                        <button class="script-btn primary" data-action="load" title="Load Script">Load Script</button>
                    </div>
                </div>
            `;

            card.querySelector('[data-action="direct"]').addEventListener('click', (e) => {
                e.stopPropagation();
                this.directExecuteScript(script);
            });

            card.querySelector('[data-action="load"]').addEventListener('click', (e) => {
                e.stopPropagation();
                this.loadScriptInEditor(script);
            });

            list.appendChild(card);
        }
        this.refreshLucideIcons();
    }

    async copyScriptToClipboard(script) {
        try {
            await navigator.clipboard.writeText(script.script || '');
            this.updateConsoleOutput(`Script "${script.title}" copied to clipboard`, 'success');
        } catch (error) {
            this.updateConsoleOutput('Failed to copy script: ' + error.message, 'error');
        }
    }

    loadScriptInEditor(script) {
        const tab = {
            id: Date.now().toString(),
            path: null,
            name: `${(script.title || 'Script').substring(0, 30)}.lua`,
            content: script.script || '',
            language: 'lua',
            modified: true
        };
        this.tabs.push(tab);
        this.renderTabs();
        this.switchToTab(tab.id);
        this.hideWelcome();
        this.updateConsoleOutput(`Script "${script.title}" loaded in editor`, 'success');
    }

    directExecuteScript(script) {
        const title = script.title || 'Script';
        this.updateConsoleOutput(`Executing: "${title}"`, 'info');
        this.runScript(script.script || '', title);
    }

    async executeScriptFromPath(filePath, name) {
        if (window.electronAPI?.readFile) {
            const result = await window.electronAPI.readFile(filePath);
            if (result.success) {
                this.updateConsoleOutput(`Executing script: ${name}`, 'info');
                this.runScript(result.content, name);
            } else {
                this.updateConsoleOutput(`Failed to read script: ${result.error}`, 'error');
            }
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    executeScript() {
        const tab = this.tabs.find(t => t.id === this.activeTabId);
        const fileName = tab?.name || 'Untitled';
        this.updateConsoleOutput(`Executing script: ${fileName}`, 'info');
        this.runScript(this.editor?.getValue() || '', fileName);
    }

    runScript(content, name) {
        const executeMethod = this.selectedPort === 'auto' 
            ? window.electronAPI?.executeScript 
            : window.electronAPI?.executeScriptOnPort;
        
        if (!executeMethod) {
            this.updateConsoleOutput('Script execution not available in this environment', 'warning');
            return;
        }
        
        const executePromise = this.selectedPort === 'auto'
            ? window.electronAPI.executeScript(content)
            : window.electronAPI.executeScriptOnPort(content, this.selectedPort);
        
        executePromise.then(result => {
            if (result.success) {
                this.updateConsoleOutput(result.message || `${name} executed successfully`, 'success');
            } else {
                this.updateConsoleOutput(result.message || 'Execution failed', 'error');
            }
        }).catch(error => {
            this.updateConsoleOutput('Execution error: ' + error.message, 'error');
        });
    }

    getFileIconName(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const iconMap = { 'js': 'file-code', 'jsx': 'file-code', 'ts': 'file-code', 'tsx': 'file-code', 
            'rs': 'file-code', 'py': 'file-code', 'lua': 'file-code', 'html': 'file-code', 'css': 'file-code', 
            'scss': 'file-code', 'json': 'file-json', 'md': 'file-text', 'txt': 'file-text', 'toml': 'file-cog', 
            'yaml': 'file-cog', 'yml': 'file-cog', 'lock': 'lock', 'gitignore': 'git-branch' };
        return iconMap[ext] || 'file';
    }

    getLanguageFromPath(filePath) {
        const ext = filePath.split('.').pop().toLowerCase();
        const langMap = { 'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript', 
            'rs': 'rust', 'py': 'python', 'lua': 'lua', 'html': 'html', 'css': 'css', 'scss': 'scss', 
            'json': 'json', 'md': 'markdown', 'toml': 'ini', 'yaml': 'yaml', 'yml': 'yaml' };
        return langMap[ext] || 'plaintext';
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
            const overlay = this.createDialogOverlay(`
                <h3>${title}</h3>
                <input type="text" class="dialog-input" value="${defaultValue}" />
                <div class="dialog-buttons">
                    <button class="dialog-btn dialog-cancel">Cancel</button>
                    <button class="dialog-btn dialog-confirm">OK</button>
                </div>
            `);
            const input = overlay.querySelector('.dialog-input');
            input.focus();
            input.select();

            const cleanup = (value) => { overlay.remove(); resolve(value); };

            overlay.querySelector('.dialog-cancel').onclick = () => cleanup(null);
            overlay.querySelector('.dialog-confirm').onclick = () => cleanup(input.value);
            input.onkeydown = (e) => {
                if (e.key === 'Enter') cleanup(input.value);
                if (e.key === 'Escape') cleanup(null);
            };
            overlay.onclick = (e) => { if (e.target === overlay) cleanup(null); };
        });
    }

    showConfirmDialog(message) {
        return new Promise((resolve) => {
            const overlay = this.createDialogOverlay(`
                <p>${message}</p>
                <div class="dialog-buttons">
                    <button class="dialog-btn dialog-cancel">Cancel</button>
                    <button class="dialog-btn dialog-confirm">OK</button>
                </div>
            `);
            const cleanup = (value) => { overlay.remove(); resolve(value); };

            overlay.querySelector('.dialog-cancel').onclick = () => cleanup(false);
            overlay.querySelector('.dialog-confirm').onclick = () => cleanup(true);
            overlay.onclick = (e) => { if (e.target === overlay) cleanup(false); };
        });
    }

    showSaveDialog(message) {
        return new Promise((resolve) => {
            const overlay = this.createDialogOverlay(`
                <p>${message}</p>
                <div class="dialog-buttons">
                    <button class="dialog-btn dialog-cancel">Cancel<span class="kbd-hint">Esc</span></button>
                    <button class="dialog-btn dialog-dontsave">Don't Save<span class="kbd-hint">⌫</span></button>
                    <button class="dialog-btn dialog-confirm">Save<span class="kbd-hint">↵</span></button>
                </div>
            `);
            const cleanup = (value) => {
                document.removeEventListener('keydown', handleKeydown, true);
                overlay.remove();
                resolve(value);
            };
            const handleKeydown = (e) => {
                if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cleanup('cancel'); }
                else if (e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); cleanup('dontsave'); }
                else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); cleanup('save'); }
            };
            document.addEventListener('keydown', handleKeydown, true);

            overlay.querySelector('.dialog-cancel').onclick = () => cleanup('cancel');
            overlay.querySelector('.dialog-dontsave').onclick = () => cleanup('dontsave');
            overlay.querySelector('.dialog-confirm').onclick = () => cleanup('save');
            overlay.onclick = (e) => { if (e.target === overlay) cleanup('cancel'); };
        });
    }

    showAlertDialog(message) {
        return new Promise((resolve) => {
            const overlay = this.createDialogOverlay(`
                <p>${message}</p>
                <div class="dialog-buttons">
                    <button class="dialog-btn dialog-confirm">OK</button>
                </div>
            `);
            const cleanup = () => { overlay.remove(); resolve(); };

            overlay.querySelector('.dialog-confirm').onclick = cleanup;
            overlay.onclick = (e) => { if (e.target === overlay) cleanup(); };
        });
    }
}

const opiumwareEditor = new OpiumwareEditor();
