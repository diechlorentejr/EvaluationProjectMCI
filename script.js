const uid = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const CURRENT_USER_ID = 'currentUser';

const state = {
  view: 'landing',
  previousView: 'sessions',
  courses: [],
  activeCourse: null,
  activeSession: null,
  editingEntry: null,
  role: 'student',
  student: { pin: '' },
  studentAnswers: {},
  studentHistory: [],
  toast: '',
  draftCourse: { name: '' },
  builder: { type: 'scale', title: '', options: '' },
  preview: null,
};

function init() {
  if (state.courses.length) {
    state.activeCourse = state.courses[0];
    state.activeSession = state.courses[0]?.sessions[0] || null;
  }
  attachNav();
  render();
}

function attachNav() {
  document.getElementById('nav-home').addEventListener('click', () => {
    state.view = 'landing';
    state.role = 'student';
    render();
  });
  document.getElementById('nav-courses').addEventListener('click', () => {
    if (state.role !== 'lecturer') {
      showToast('Lecturer area only. Sign in with WebSSO first.');
      return;
    }
    state.view = 'courses';
    render();
  });
  document.getElementById('nav-help').addEventListener('click', () => {
    showToast('Help is on the way – reach us at help@biggie-cheese.bombastic');
  });
}

function render() {
  const main = document.getElementById('main');
  main.innerHTML = renderView(state.view);
  bindHandlers(state.view);
  updateToast();
}

function renderView(view) {
  switch (view) {
    case 'landing':
      return renderLanding();
    case 'studentSession':
      return renderStudentSession();
    case 'completion':
      return renderCompletion();
    case 'history':
      return renderHistory();
    case 'editResponse':
      return renderEditResponse();
    case 'courses':
      return renderCourses();
    case 'sessions':
      return renderSessions();
    case 'share':
      return renderShare();
    case 'builder':
      return renderBuilder();
    case 'analytics':
      return renderAnalytics();
    default:
      return '<p class="muted">Unknown view.</p>';
  }
}

function renderLanding() {
  return `
    <section class="screen active">
      <div class="hero">
        <div class="hero-copy">
        </div>
        <div class="role-grid">
          <div class="role-card student">
            <h2>For Students</h2>
            <p class="muted">Join an active session with a PIN or scan a QR code.</p>
            <div class="input-row">
              <input id="student-pin" type="text" placeholder="PIN" maxlength="6" value="${state.student.pin || ''}" />
              <button class="primary" id="join-pin" type="button">Join</button>
            </div>
            <button class="secondary" id="use-camera" type="button">Use camera 📷</button>
          </div>
          <div class="role-card lecturer">
            <h2>For Lecturers</h2>
            <p class="muted">Create and manage sessions with WebSSO.</p>
            <button class="primary stretch" id="start-lecturer">Sign in with WebSSO</button>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderStudentSession() {
  if (!state.activeSession || !state.activeCourse) {
    return `
      <section class="screen">
        <div class="panel center">
          <p class="muted">No active session joined yet.</p>
          <button class="primary" id="back-home">Back</button>
        </div>
      </section>
    `;
  }
  const questions = state.activeSession.questions
    .map((question) => {
      if (question.type === 'scale') {
        return `
          <div class="question" data-type="scale">
            <div class="question-title">${question.title}</div>
            <div class="scale">
              <div class="scale-row">
                <input type="range" min="1" max="10" data-question="${question.id}" value="${state.studentAnswers[question.id] ?? 5}" />
                <div class="pill value-pill" id="pill-${question.id}">${state.studentAnswers[question.id] ?? 5}</div>
              </div>
              ${renderScaleLabels()}
            </div>
          </div>
        `;
      }
      if (question.type === 'multiple') {
        return `
          <div class="question" data-type="multiple">
            <div class="question-title">${question.title}</div>
            <div class="chips">
              ${question.choices
                .map(
                  (choice) => `
                    <button
                      type="button"
                      class="chip ${selectedChoice(question.id, choice) ? 'selected' : ''}"
                      data-choice="${choice}"
                      data-question="${question.id}"
                    >
                      ${choice}
                    </button>
                  `,
                )
                .join('')}
            </div>
          </div>
        `;
      }
      return `
        <div class="question" data-type="text">
          <div class="question-title">${question.title}</div>
          <div class="text-answer">
            <textarea data-question="${question.id}" placeholder="Write your answer here">${state.studentAnswers[question.id] || ''}</textarea>
          </div>
        </div>
      `;
    })
    .join('');

  const questionBlock = questions || '<p class="muted">No questions yet. Please wait for the lecturer to add some.</p>';

  return `
    <section class="screen">
      <div class="panel">
        <header class="panel-header">
          <div>
            <p class="eyebrow">Session</p>
            <h2>${state.activeSession.title}</h2>
            <p class="muted small">${state.activeCourse.name} • ${state.activeCourse.code}</p>
          </div>
          <div class="pill">PIN <span>${state.activeSession.pin}</span></div>
        </header>
        ${questionBlock}
        <div class="question-actions">
          <button class="primary" id="submit-answers">Submit</button>
          <button class="ghost" id="cancel-session">Cancel</button>
        </div>
      </div>
    </section>
  `;
}

function renderCompletion() {
  return `
    <section class="screen">
      <div class="panel center">
        <h2>Evaluation saved</h2>
        <p class="success">Thanks for participating!</p>
        <div class="question-actions center-actions">
          <button class="primary" id="edit-latest">Edit my answers</button>
          <button class="secondary" id="open-history">My evaluations</button>
        </div>
      </div>
    </section>
  `;
}

function renderHistory() {
  return `
    <section class="screen">
      <div class="panel">
        <header class="panel-header">
          <div>
            <p class="eyebrow">My Courses</p>
            <h2>Submitted evaluations</h2>
          </div>
        </header>
        <div class="card-list">
          ${state.studentHistory
            .map(
              (entry) => `
                <div class="card">
                  <div>
                    <p class="eyebrow">${entry.course}</p>
                    <h3>${entry.session}</h3>
                    <p class="muted small">${entry.timestamp}</p>
                  </div>
                  <div class="card-actions">
                    <button class="secondary" type="button" data-response-id="${entry.id}">Edit</button>
                    <button class="ghost" type="button" data-delete-id="${entry.id}">Delete</button>
                  </div>
                </div>
              `,
            )
            .join('') || '<p class="muted">No submissions yet.</p>'}
        </div>
      </div>
    </section>
  `;
}

function renderEditResponse() {
  if (!state.editingEntry || !state.activeSession || !state.activeCourse) {
    return `
      <section class="screen">
        <div class="panel center">
          <p class="muted">Select a response to edit from your history.</p>
          <button class="primary" id="back-history">Back to history</button>
        </div>
      </section>
    `;
  }

  const questions = state.activeSession.questions
    .map((question) => {
      if (question.type === 'scale') {
        return `
          <div class="question" data-type="scale">
            <div class="question-title">${question.title}</div>
            <div class="scale">
              <div class="scale-row">
                <input type="range" min="1" max="10" data-question="${question.id}" value="${state.studentAnswers[question.id] ?? 5}" />
                <div class="pill value-pill" id="pill-${question.id}">${state.studentAnswers[question.id] ?? 5}</div>
              </div>
              ${renderScaleLabels()}
            </div>
          </div>
        `;
      }
      if (question.type === 'multiple') {
        return `
          <div class="question" data-type="multiple">
            <div class="question-title">${question.title}</div>
            <div class="chips">
              ${question.choices
                .map(
                  (choice) => `
                    <button
                      type="button"
                      class="chip ${selectedChoice(question.id, choice) ? 'selected' : ''}"
                      data-choice="${choice}"
                      data-question="${question.id}"
                    >
                      ${choice}
                    </button>
                  `,
                )
                .join('')}
            </div>
          </div>
        `;
      }
      return `
        <div class="question" data-type="text">
          <div class="question-title">${question.title}</div>
          <div class="text-answer">
            <textarea data-question="${question.id}" placeholder="Write your answer here">${state.studentAnswers[question.id] || ''}</textarea>
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <section class="screen">
      <div class="panel">
        <header class="panel-header">
          <div>
            <p class="eyebrow">Edit evaluation</p>
            <h2>${state.activeSession.title}</h2>
            <p class="muted small">${state.activeCourse.name}</p>
          </div>
          <button class="ghost" id="back-history">Back</button>
        </header>
        ${questions}
        <div class="question-actions">
          <button class="primary" id="save-edits">Save changes</button>
          <button class="secondary" id="delete-response">Delete answers</button>
          <button class="ghost" id="cancel-edit">Cancel</button>
        </div>
      </div>
    </section>
  `;
}

function renderCourses() {
  return `
    <section class="screen">
      <div class="panel">
        <header class="panel-header">
          <div>
            <p class="eyebrow">Dashboard</p>
            <h2>My Courses</h2>
          </div>
          <button class="ghost" id="sign-out">Sign out</button>
        </header>
        <div class="create-row">
          <input id="course-name" placeholder="New course name" value="${state.draftCourse.name || ''}" />
          <div class="spacer"></div>
          <button class="primary" id="create-course">Create course</button>
        </div>
        <div class="card-list">
          ${state.courses
            .map(
              (course) => `
                <div class="card">
                  <div>
                    <p class="eyebrow">${course.code}</p>
                    <h3>${course.name}</h3>
                    <p class="muted small">${course.sessions.length} sessions</p>
                  </div>
                  <div class="card-actions">
                    <button class="secondary" data-open-course="${course.id}">View sessions</button>
                    <button class="ghost" data-new-session="${course.id}">New session</button>
                  </div>
                </div>
              `,
            )
            .join('') || '<p class="muted">No courses yet. Create your first course to begin.</p>'}
        </div>
      </div>
    </section>
  `;
}

function renderSessions() {
  if (!state.activeCourse) {
    return `
      <section class="screen">
        <div class="panel center">
          <p class="muted">Select or create a course first.</p>
          <button class="primary" id="back-to-courses">Back to courses</button>
        </div>
      </section>
    `;
  }
  return `
    <section class="screen">
      <div class="panel">
        <header class="panel-header">
          <div>
            <p class="eyebrow">Course</p>
            <h2>${state.activeCourse.name}</h2>
            <p class="muted small">${state.activeCourse.code}</p>
          </div>
          <div class="panel-actions">
            <button class="secondary" id="add-session">+ Add new session</button>
            <button class="ghost" id="back-to-courses">Back to courses</button>
          </div>
        </header>
        <div class="card-list">
          ${state.activeCourse.sessions
            .map(
              (session) => `
                <div class="card">
                  <div>
                    <p class="eyebrow">Session</p>
                    <h3>${session.title}</h3>
                    <p class="muted small">PIN ${session.pin} • ${session.responses.length} responses</p>
                  </div>
                  <div class="card-actions">
                    <button class="secondary" data-share-session="${session.id}">Share</button>
                    <button class="ghost" data-analytics-session="${session.id}">View insights</button>
                    <button class="ghost" data-builder-session="${session.id}">Add questions</button>
                  </div>
                </div>
              `,
            )
            .join('') || '<p class="muted">No sessions yet. Add one to begin collecting feedback.</p>'}
        </div>
      </div>
    </section>
  `;
}

function renderShare() {
  if (!state.activeSession || !state.activeCourse) {
    return `
      <section class="screen">
        <div class="panel center">
          <p class="muted">Select a session to share.</p>
          <button class="primary" id="close-share">Back</button>
        </div>
      </section>
    `;
  }
  return `
    <section class="screen">
      <div class="panel share-panel">
        <header class="panel-header">
          <div>
            <p class="eyebrow">Share session</p>
            <h2>${state.activeSession.title}</h2>
            <p class="muted">Participants can join with QR or PIN.</p>
          </div>
          <button class="ghost" id="close-share">Close</button>
        </header>
        <div class="share-content">
          <div class="qr-block">
            <div id="qr-slot" class="qr-canvas" aria-label="Session QR code"></div>
            <p class="qr-label">Scan with camera</p>
          </div>
          <div class="pin-block">
            <div class="pin-display">${state.activeSession.pin}</div>
            <p class="muted">Or enter the code</p>
            <p class="muted small">www.biggie-cheese.bombastic/${state.activeSession.pin}</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderBuilder() {
  const preview = state.preview
    ? `
      <div class="preview">
        <p class="eyebrow">Preview</p>
        <p class="question-title">${state.preview.title}</p>
        ${renderPreviewContent(state.preview)}
      </div>
    `
    : '';

  return `
    <section class="screen">
      <div class="panel">
        <header class="panel-header">
          <div>
            <p class="eyebrow">Question builder</p>
            <h2>Create a question for ${state.activeSession.title}</h2>
          </div>
          <button class="ghost" id="close-builder">Close</button>
        </header>
        <div class="builder-grid">
          <div class="form-field">
            <label for="questionType">Question Type</label>
            <select id="questionType">
              <option value="scale" ${state.builder.type === 'scale' ? 'selected' : ''}>Scale (1-10)</option>
              <option value="multiple" ${state.builder.type === 'multiple' ? 'selected' : ''}>Multiple choice</option>
              <option value="text" ${state.builder.type === 'text' ? 'selected' : ''}>Open text</option>
            </select>
          </div>
          <div class="form-field">
            <label for="questionText">Question</label>
            <input type="text" id="questionText" placeholder="Write your prompt..." value="${state.builder.title}" />
          </div>
          <div class="form-field" ${state.builder.type === 'multiple' ? '' : 'style="display:none"'}>
            <label for="questionOptions">Options (comma separated)</label>
            <input type="text" id="questionOptions" placeholder="Concept A, Concept B" value="${state.builder.options}" />
          </div>
          <div class="form-actions">
            <button class="secondary" id="preview-question">Preview</button>
            <button class="primary" id="save-question">Save</button>
          </div>
        </div>
        ${preview}
      </div>
    </section>
  `;
}

function renderPreviewContent(preview) {
  if (preview.type === 'scale') {
    return `
      <div class="scale ghost-scale">
        <div class="distribution">
          ${Array.from({ length: 10 }, (_, idx) => `<div class="bar" style="height:${(idx + 1) * 4}px"></div>`).join('')}
        </div>
      </div>
    `;
  }
  if (preview.type === 'multiple') {
    return `<div class="chips">${preview.choices.map((choice) => `<span class="chip">${choice}</span>`).join('')}</div>`;
  }
  return `<div class="text-answer"><textarea placeholder="Learners respond here"></textarea></div>`;
}

function renderScaleLabels() {
  const labels = Array.from({ length: 10 }, (_, idx) => {
    return '';
  });
  return `<div class="scale-labels">${labels.map((text) => `<span>${text}</span>`).join('')}</div>`;
}

function renderAnalytics() {
  if (!state.activeSession || !state.activeCourse) {
    return `
      <section class="screen">
        <div class="panel center">
          <p class="muted">Select a session to view insights.</p>
          <button class="primary" id="close-analytics">Back</button>
        </div>
      </section>
    `;
  }
  const charts = state.activeSession.questions
    .map((question) => {
      if (question.type === 'scale') {
        return `
          <div class="chart">
            <p class="question-title">${question.title}</p>
            <div class="distribution filled">
              ${Array.from({ length: 10 }, (_, idx) => `<div class="bar" style="${barStyle(question.id, idx + 1)}"></div>`).join('')}
            </div>
            ${renderScaleLabels()}
            ${!state.activeSession.responses.length ? '<p class="muted tiny">Waiting for responses…</p>' : ''}
          </div>
        `;
      }
      if (question.type === 'multiple') {
        return `
          <div class="chart">
            <p class="question-title">${question.title}</p>
            <div class="bars">
              ${question.choices
                .map(
                  (choice) => `
                    <div class="bar-row">
                      <div class="bar-meter"><div class="bar-fill" style="${choiceStyle(question.id, choice)}"></div></div>
                      <div class="bar-label">
                        <span>${choice}</span>
                        <span class="muted tiny">${choicePercent(question.id, choice)}% • ${choiceCount(question.id, choice)} votes</span>
                      </div>
                    </div>
                  `,
                )
                .join('')}
            </div>
            ${!state.activeSession.responses.length ? '<p class="muted tiny">Waiting for responses…</p>' : ''}
          </div>
        `;
      }
      const responses = responsesFor(question.id);
      return `
        <div class="chart">
          <p class="question-title">${question.title}</p>
          <div class="chip-row">
            <button class="secondary small" id="view-answers">View individual answers</button>
            <button class="ghost small" id="ai-summary">Create AI summary</button>
          </div>
          ${responses.length ? `<ul class="text-list">${responses.map((r) => `<li>“${r}”</li>`).join('')}</ul>` : '<p class="muted small">No responses yet.</p>'}
          ${!state.activeSession.responses.length ? '<p class="muted tiny">Waiting for responses…</p>' : ''}
        </div>
      `;
    })
    .join('');

  return `
    <section class="screen">
      <div class="panel">
        <header class="panel-header">
          <div>
            <p class="eyebrow">Session insights</p>
            <h2>${state.activeSession.title}</h2>
            <p class="muted small">${state.activeCourse.name} • PIN ${state.activeSession.pin}</p>
          </div>
          <button class="ghost" id="close-analytics">Close</button>
        </header>
        <div class="chart-grid">${charts}</div>
      </div>
    </section>
  `;
}

function bindHandlers(view) {
  if (view === 'landing') {
    document.getElementById('student-pin').addEventListener('input', (e) => {
      state.student.pin = e.target.value;
    });
    document.getElementById('join-pin').addEventListener('click', joinByPin);
    document.getElementById('use-camera').addEventListener('click', simulateScan);
    document.getElementById('start-lecturer').addEventListener('click', startLecturer);
    return;
  }

  if (view === 'studentSession') {
    document.querySelectorAll('input[type="range"]').forEach((input) => {
      input.addEventListener('input', (e) => {
        const questionId = e.target.dataset.question;
        state.studentAnswers[questionId] = Number(e.target.value);
        const pill = document.getElementById(`pill-${questionId}`);
        if (pill) pill.textContent = state.studentAnswers[questionId];
      });
    });
    document.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        const { question, choice } = e.currentTarget.dataset;
        toggleChoice(question, choice);
        render();
      });
    });
    document.querySelectorAll('textarea[data-question]').forEach((field) => {
      field.addEventListener('input', (e) => {
        state.studentAnswers[e.target.dataset.question] = e.target.value;
      });
    });
    document.getElementById('submit-answers').addEventListener('click', submitAnswers);
    const cancel = document.getElementById('cancel-session');
    if (cancel) cancel.addEventListener('click', () => {
      state.view = 'landing';
      render();
    });
    const back = document.getElementById('back-home');
    if (back) back.addEventListener('click', () => {
      state.view = 'landing';
      render();
    });
    return;
  }

  if (view === 'completion') {
    const openHistory = document.getElementById('open-history');
    if (openHistory) openHistory.addEventListener('click', () => {
      state.view = 'history';
      render();
    });
    const editLatest = document.getElementById('edit-latest');
    if (editLatest) editLatest.addEventListener('click', () => {
      const latest = state.studentHistory[0];
      if (latest) openResponse(latest);
      else showToast('No submissions yet.');
    });
    const deleteLatest = document.getElementById('delete-latest');
    if (deleteLatest) deleteLatest.addEventListener('click', () => {
      const latest = state.studentHistory[0];
      if (latest) deleteResponse(latest.id);
    });
    return;
  }

  if (view === 'history') {
    document.querySelectorAll('button[data-response-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const entry = state.studentHistory.find((h) => h.id === btn.dataset.responseId);
        if (entry) openResponse(entry);
      });
    });
    document.querySelectorAll('button[data-delete-id]').forEach((btn) => {
      btn.addEventListener('click', () => deleteResponse(btn.dataset.deleteId));
    });
    return;
  }

  if (view === 'editResponse') {
    document.querySelectorAll('input[type="range"]').forEach((input) => {
      input.addEventListener('input', (e) => {
        const questionId = e.target.dataset.question;
        state.studentAnswers[questionId] = Number(e.target.value);
        const pill = document.getElementById(`pill-${questionId}`);
        if (pill) pill.textContent = state.studentAnswers[questionId];
      });
    });
    document.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        const { question, choice } = e.currentTarget.dataset;
        toggleChoice(question, choice);
        render();
      });
    });
    document.querySelectorAll('textarea[data-question]').forEach((field) => {
      field.addEventListener('input', (e) => {
        state.studentAnswers[e.target.dataset.question] = e.target.value;
      });
    });
    document.getElementById('save-edits').addEventListener('click', saveEdits);
    document.getElementById('delete-response').addEventListener('click', () => {
      if (state.editingEntry) deleteResponse(state.editingEntry.id);
    });
    document.getElementById('cancel-edit').addEventListener('click', () => {
      state.view = 'history';
      render();
    });
    document.getElementById('back-history').addEventListener('click', () => {
      state.view = 'history';
      render();
    });
    return;
  }

  if (view === 'courses') {
    document.getElementById('course-name').addEventListener('input', (e) => {
      state.draftCourse.name = e.target.value;
    });
    document.getElementById('create-course').addEventListener('click', createCourse);
    document.getElementById('sign-out').addEventListener('click', () => {
      state.role = 'student';
      state.view = 'landing';
      render();
    });
    document.querySelectorAll('button[data-open-course]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const course = state.courses.find((c) => c.id === btn.dataset.openCourse);
        if (course) {
          state.activeCourse = course;
          state.view = 'sessions';
          render();
        }
      });
    });
    document.querySelectorAll('button[data-new-session]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const course = state.courses.find((c) => c.id === btn.dataset.newSession);
        if (course) createSession(course);
      });
    });
    return;
  }

  if (view === 'sessions') {
    const addSession = document.getElementById('add-session');
    if (addSession) addSession.addEventListener('click', () => createSession(state.activeCourse));
    const backToCourses = document.getElementById('back-to-courses');
    if (backToCourses)
      backToCourses.addEventListener('click', () => {
        state.view = 'courses';
        render();
      });
    if (state.activeCourse) {
      document.querySelectorAll('button[data-share-session]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const session = state.activeCourse.sessions.find((s) => s.id === btn.dataset.shareSession);
          if (session) shareSession(session);
        });
      });
      document.querySelectorAll('button[data-analytics-session]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const session = state.activeCourse.sessions.find((s) => s.id === btn.dataset.analyticsSession);
          if (session) openAnalytics(session);
        });
      });
      document.querySelectorAll('button[data-builder-session]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const session = state.activeCourse.sessions.find((s) => s.id === btn.dataset.builderSession);
          if (session) openBuilder(session);
        });
      });
    }
    return;
  }

  if (view === 'share') {
    renderQrCode();
    document.getElementById('close-share').addEventListener('click', () => {
      state.view = state.previousView;
      render();
    });
    return;
  }

  if (view === 'builder') {
    const typeSelect = document.getElementById('questionType');
    const titleInput = document.getElementById('questionText');
    const optionsInput = document.getElementById('questionOptions');

    typeSelect.addEventListener('change', (e) => {
      state.builder.type = e.target.value;
      render();
    });
    titleInput.addEventListener('input', (e) => {
      state.builder.title = e.target.value;
    });
    if (optionsInput) {
      optionsInput.addEventListener('input', (e) => {
        state.builder.options = e.target.value;
      });
    }
    document.getElementById('preview-question').addEventListener('click', previewQuestion);
    document.getElementById('save-question').addEventListener('click', saveQuestion);
    document.getElementById('close-builder').addEventListener('click', () => {
      state.view = 'sessions';
      render();
    });
    return;
  }

  if (view === 'analytics') {
    const close = document.getElementById('close-analytics');
    if (close) close.addEventListener('click', () => {
      state.view = 'sessions';
      render();
    });
    const viewButtons = document.querySelectorAll('#view-answers');
    viewButtons.forEach((btn) => btn.addEventListener('click', () => {
      showToast('Viewing individual answers');
    }));
    const aiButtons = document.querySelectorAll('#ai-summary');
    aiButtons.forEach((btn) => btn.addEventListener('click', summarizeAI));
  }
}

function selectedChoice(questionId, choice) {
  return (state.studentAnswers[questionId] || []).includes(choice);
}

function joinByPin() {
  state.role = 'student';
  const session = findSessionByPin(state.student.pin.trim());
  if (!session) {
    showToast('Session not found. Check the PIN.');
    return;
  }
  const course = state.courses.find((c) => c.sessions.includes(session));
  setActiveSession(session, course);
  const existing = getUserResponse(session);
  state.studentAnswers = existing ? { ...existing.answers } : buildDefaultAnswers(session);
  state.view = 'studentSession';
  showToast(`Joined ${session.title}`);
  render();
}

function simulateScan() {
  if (!state.courses.length || !state.courses[0].sessions.length) {
    showToast('No sessions to join yet.');
    return;
  }
  state.student.pin = state.courses[0].sessions[0].pin;
  joinByPin();
}

function startLecturer() {
  state.role = 'lecturer';
  state.view = 'courses';
  showToast('Signed in via WebSSO (demo)');
  render();
}

function toggleChoice(questionId, choice) {
  const existing = state.studentAnswers[questionId] || [];
  if (existing.includes(choice)) {
    state.studentAnswers[questionId] = existing.filter((c) => c !== choice);
  } else {
    state.studentAnswers[questionId] = [...existing, choice];
  }
}

function submitAnswers() {
  if (!state.activeSession || !state.activeCourse) return;
  const existing = getUserResponse(state.activeSession);
  const responseId = existing?.id || uid();
  const payload = { id: responseId, userId: CURRENT_USER_ID, student: 'You', answers: { ...state.studentAnswers } };
  if (existing) {
    Object.assign(existing, payload);
  } else {
    state.activeSession.responses.push(payload);
  }

  upsertHistoryEntry({
    id: responseId,
    courseId: state.activeCourse.id,
    course: state.activeCourse.name,
    session: state.activeSession.title,
    sessionId: state.activeSession.id,
    timestamp: new Date().toLocaleString(),
    answers: { ...state.studentAnswers },
  });

  state.view = 'completion';
  showToast('Feedback saved');
  render();
}

function openResponse(entry) {
  const session = findSessionById(entry.sessionId);
  if (!session) {
    showToast('Session not found for this entry.');
    return;
  }
  const course = state.courses.find((c) => c.sessions.includes(session));
  setActiveSession(session, course);
  state.editingEntry = entry;
  state.studentAnswers = { ...entry.answers };
  state.view = 'editResponse';
  showToast(`Editing ${entry.session}`);
  render();
}

function saveEdits() {
  if (!state.editingEntry || !state.activeSession || !state.activeCourse) return;
  const existing = getUserResponse(state.activeSession);
  if (existing) {
    existing.answers = { ...state.studentAnswers };
  }
  upsertHistoryEntry({
    ...state.editingEntry,
    answers: { ...state.studentAnswers },
    timestamp: new Date().toLocaleString(),
  });
  showToast('Answers updated');
  state.view = 'history';
  render();
}

function deleteResponse(entryId) {
  const entryIndex = state.studentHistory.findIndex((h) => h.id === entryId);
  if (entryIndex === -1) return;
  const entry = state.studentHistory[entryIndex];
  const session = findSessionById(entry.sessionId);
  if (session) {
    const resIndex = session.responses.findIndex((r) => r.id === entry.id || r.userId === CURRENT_USER_ID);
    if (resIndex !== -1) session.responses.splice(resIndex, 1);
  }
  state.studentHistory.splice(entryIndex, 1);
  state.editingEntry = null;
  state.studentAnswers = {};
  showToast('Answers deleted');
  state.view = 'history';
  render();
}

function createCourse() {
  if (!state.draftCourse.name.trim()) {
    showToast('Please add a course name.');
    return;
  }
  const code = generateCourseCode(state.draftCourse.name);
  const newCourse = {
    id: uid(),
    name: state.draftCourse.name,
    code,
    sessions: [],
  };
  state.courses.push(newCourse);
  state.activeCourse = newCourse;
  state.draftCourse = { name: '' };
  showToast(`Course created (${code})`);
  render();
}

function createSession(course) {
  if (!course) return;
  const newSession = {
    id: uid(),
    title: `Session ${course.sessions.length + 1}`,
    pin: Math.floor(1000 + Math.random() * 9000).toString(),
    questions: [],
    responses: [],
  };
  course.sessions.unshift(newSession);
  setActiveSession(newSession, course);
  state.previousView = 'sessions';
  state.view = 'builder';
  showToast('Session created. Add your questions.');
  render();
}

function shareSession(session) {
  setActiveSession(session, state.activeCourse);
  state.previousView = 'sessions';
  state.view = 'share';
  render();
}

function openAnalytics(session) {
  setActiveSession(session, state.activeCourse);
  state.view = 'analytics';
  render();
}

function openBuilder(session) {
  setActiveSession(session, state.activeCourse);
  state.view = 'builder';
  render();
}

function previewQuestion() {
  const preview = {
    type: state.builder.type,
    title: state.builder.title || 'Untitled question',
  };
  if (state.builder.type === 'multiple') {
    preview.choices = state.builder.options
      ? state.builder.options.split(',').map((c) => c.trim()).filter(Boolean)
      : ['Option A', 'Option B'];
  }
  state.preview = preview;
  render();
}

function saveQuestion() {
  if (!state.activeSession) return;
  const question = {
    id: uid(),
    title: state.builder.title || 'Untitled question',
    type: state.builder.type,
  };
  if (state.builder.type === 'multiple') {
    question.choices = state.builder.options
      ? state.builder.options.split(',').map((c) => c.trim()).filter(Boolean)
      : ['Option A', 'Option B'];
  }
  state.activeSession.questions.push(question);
  state.builder = { type: 'scale', title: '', options: '' };
  state.preview = null;
  showToast('Question added to session');
  render();
}

function setActiveSession(session, course) {
  state.activeSession = session;
  if (course) state.activeCourse = course;
}

function buildDefaultAnswers(session) {
  return session.questions.reduce((acc, question) => {
    if (question.type === 'scale') acc[question.id] = 5;
    if (question.type === 'multiple') acc[question.id] = [];
    if (question.type === 'text') acc[question.id] = '';
    return acc;
  }, {});
}

function findSessionByPin(pin) {
  for (const course of state.courses) {
    const match = course.sessions.find((s) => s.pin === pin);
    if (match) return match;
  }
  return null;
}

function findSessionByTitle(title) {
  for (const course of state.courses) {
    const match = course.sessions.find((s) => s.title === title);
    if (match) return match;
  }
  return null;
}

function findSessionById(id) {
  for (const course of state.courses) {
    const match = course.sessions.find((s) => s.id === id);
    if (match) return match;
  }
  return null;
}

function getUserResponse(session) {
  return session.responses.find((r) => r.userId === CURRENT_USER_ID) || null;
}

function upsertHistoryEntry(entry) {
  const existing = state.studentHistory.find((h) => h.sessionId === entry.sessionId && h.id === entry.id);
  if (existing) {
    Object.assign(existing, entry);
  } else {
    state.studentHistory.unshift(entry);
  }
}

function barStyle(questionId, bucket) {
  const counts = scaleCounts(questionId);
  const max = Math.max(...counts, 1);
  const height = (counts[bucket - 1] / max) * 100;
  return `height:${Math.max(height, 6)}%;opacity:${0.7 + (height / 100) * 0.3}`;
}

function choiceStyle(questionId, choice) {
  const total = state.activeSession.responses.length || 1;
  const count = choiceCount(questionId, choice);
  return `width:${Math.max((count / total) * 100, 6)}%`;
}

function scaleCounts(questionId) {
  const counts = Array(10).fill(0);
  state.activeSession.responses.forEach((r) => {
    const val = Number(r.answers[questionId]) || 0;
    if (val >= 1 && val <= 10) counts[val - 1] += 1;
  });
  return counts;
}

function responsesFor(questionId) {
  return state.activeSession.responses.map((r) => r.answers[questionId]).filter(Boolean);
}

function choiceCount(questionId, choice) {
  return state.activeSession.responses.filter((r) => (r.answers[questionId] || []).includes(choice)).length;
}

function choicePercent(questionId, choice) {
  const total = state.activeSession.responses.length || 1;
  return Math.round((choiceCount(questionId, choice) / total) * 100);
}

function renderQrCode() {
  const slot = document.getElementById('qr-slot');
  if (!slot || !state.activeSession) return;
  slot.innerHTML = '';
  const data = `https://www.biggie-cheese.bombastic/${state.activeSession.pin}`;

  const drawFallback = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 180;
    canvas.height = 180;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(141, 194, 255, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 14, 152, 152);
    ctx.fillStyle = 'rgba(141, 194, 255, 0.14)';
    ctx.fillRect(32, 32, 36, 36);
    ctx.fillRect(112, 32, 36, 36);
    ctx.fillRect(32, 112, 36, 36);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PIN ' + state.activeSession.pin, 90, 168);
    slot.appendChild(canvas);
  };

  if (typeof QRCode === 'function') {
    try {
      new QRCode(slot, {
        text: data,
        width: 180,
        height: 180,
        colorDark: '#e2e8f0',
        colorLight: '#0b1220',
        correctLevel: QRCode.CorrectLevel.M,
      });
      return;
    } catch (err) {
      console.error('QR render error', err);
    }
  }

  drawFallback();
}

function generateCourseCode(name) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 4)
    .toUpperCase();
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${initials || 'CRS'}-${suffix}`;
}

function summarizeAI() {
  showToast('AI summary would appear here.');
}

function showToast(message) {
  state.toast = message;
  updateToast();
  if (!message) return;
  setTimeout(() => {
    state.toast = '';
    updateToast();
  }, 1800);
}

function updateToast() {
  const toastEl = document.getElementById('toast');
  if (!state.toast) {
    toastEl.hidden = true;
    return;
  }
  toastEl.textContent = state.toast;
  toastEl.hidden = false;
}

document.addEventListener('DOMContentLoaded', init);
