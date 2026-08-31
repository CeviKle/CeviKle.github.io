const Questions = (() => {
    let list = [];
    let statusByQuestion = {}; // questionId -> 'unattempted' | 'attempted' | 'solved'

    function setData(questions) {
        list = questions.slice().sort((a, b) => a.order - b.order);
        list.forEach((q) => { if (!(q.id in statusByQuestion)) statusByQuestion[q.id] = 'unattempted'; });
    }

    function getAll() {
        return list;
    }

    function getById(id) {
        return list.find((q) => q.id === id);
    }

    function setStatus(questionId, status) {
        statusByQuestion[questionId] = status;
    }

    function getStatus(questionId) {
        return statusByQuestion[questionId] || 'unattempted';
    }

    function renderNav(containerEl, currentId, onSelect) {
        const attempted = Object.values(statusByQuestion).filter((s) => s !== 'unattempted').length;
        let html = `<div class="nav-progress">${attempted} / ${list.length} attempted</div>`;
        list.forEach((q) => {
            const status = getStatus(q.id);
            const statusClass = status === 'solved' ? 'solved' : status === 'attempted' ? 'attempted' : '';
            const statusGlyph = status === 'solved' ? '&#10003;' : status === 'attempted' ? '&middot;' : '';
            html += `
                <div class="nav-item ${q.id === currentId ? 'active' : ''}" data-qid="${q.id}">
                    <div class="n-top">
                        <span class="n-title">${q.order}. ${UI.escapeHtml(q.title)}</span>
                        <span class="nav-status ${statusClass}">${statusGlyph}</span>
                    </div>
                    <div class="n-meta">
                        <span class="badge badge-${q.difficulty}">${q.difficulty}</span>
                        <span class="badge badge-points">${q.points} pts</span>
                    </div>
                </div>`;
        });
        containerEl.innerHTML = html;
        containerEl.querySelectorAll('.nav-item').forEach((el) => {
            el.addEventListener('click', () => onSelect(el.dataset.qid));
        });
    }

    function renderDescription(containerEl, question) {
        let html = `
            <div class="desc-header">
                <span class="badge badge-${question.difficulty}">${question.difficulty}</span>
                <span class="badge badge-points">${question.points} points</span>
            </div>
            <h2>${question.order}. ${UI.escapeHtml(question.title)}</h2>
            <div>${question.prompt_html}</div>`;

        if (question.examples && question.examples.length) {
            html += `<div class="desc-section-label">Example</div>`;
            question.examples.forEach((ex) => {
                html += `
                    <div class="example-card">
                        <div class="ex-label">Input</div>
                        <pre>${UI.escapeHtml(ex.input)}</pre>
                        <div class="ex-label">Output</div>
                        <pre>${UI.escapeHtml(ex.output)}</pre>
                        ${ex.explanation ? `<div class="ex-explain">${UI.escapeHtml(ex.explanation)}</div>` : ''}
                    </div>`;
            });
        }

        if (question.constraints && question.constraints.length) {
            html += `<div class="desc-section-label">Constraints</div><ul class="constraint-list">`;
            question.constraints.forEach((c) => { html += `<li>${c}</li>`; });
            html += `</ul>`;
        }

        containerEl.innerHTML = html;
        containerEl.scrollTop = 0;
    }

    return { setData, getAll, getById, setStatus, getStatus, renderNav, renderDescription };
})();
