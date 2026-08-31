const Editor = (() => {
    let monacoInstance = null;
    let editorWidget = null;
    const models = new Map(); // questionId -> monaco.editor.ITextModel
    let changeListeners = [];

    function loadMonaco() {
        return new Promise((resolve, reject) => {
            if (window.monaco) return resolve(window.monaco);
            window.addEventListener('monaco-ready', () => resolve(window.monaco), { once: true });
            setTimeout(() => reject(new Error('Monaco failed to load (timed out)')), 20000);
        });
    }

    async function init(containerId) {
        monacoInstance = await loadMonaco();
        editorWidget = monacoInstance.editor.create(document.getElementById(containerId), {
            language: 'python',
            theme: 'vs-dark',
            fontSize: 14,
            minimap: { enabled: false },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            tabSize: 4,
            insertSpaces: true,
            renderWhitespace: 'selection',
        });
        return editorWidget;
    }

    function getOrCreateModel(questionId, initialCode) {
        if (!models.has(questionId)) {
            const model = monacoInstance.editor.createModel(initialCode, 'python');
            model.onDidChangeContent(() => changeListeners.forEach((fn) => fn(questionId)));
            models.set(questionId, model);
        }
        return models.get(questionId);
    }

    function setActiveQuestion(questionId, fallbackCode) {
        const model = getOrCreateModel(questionId, fallbackCode);
        editorWidget.setModel(model);
        editorWidget.focus();
    }

    function getCode(questionId) {
        const model = models.get(questionId);
        return model ? model.getValue() : '';
    }

    function getCurrentCode() {
        return editorWidget ? editorWidget.getValue() : '';
    }

    function resetQuestion(questionId, starterCode) {
        const model = models.get(questionId);
        if (model) model.setValue(starterCode);
    }

    function onChange(fn) {
        changeListeners.push(fn);
    }

    function blockClipboard(onBlocked) {
        const node = editorWidget.getDomNode();
        if (!node) return;
        ['paste', 'copy', 'cut', 'drop'].forEach((evt) => {
            node.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                onBlocked(evt);
            }, true);
        });
        node.addEventListener('contextmenu', (e) => e.preventDefault(), true);
    }

    return { init, setActiveQuestion, getCode, getCurrentCode, resetQuestion, onChange, blockClipboard };
})();
