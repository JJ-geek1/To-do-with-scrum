const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const categorySelect = document.getElementById('category-select');
const taskDueDate = document.getElementById('task-due-date');
const taskList = document.getElementById('task-list');
const taskCounter = document.getElementById('task-counter');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clear-completed');
const themeToggleBtn = document.getElementById('theme-toggle');
const notificationBtn = document.getElementById('notification-permission-btn');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressPercentage = document.getElementById('progress-percentage');
const alarmSound = document.getElementById('alarm-sound');

let tasks = JSON.parse(localStorage.getItem('pro_tasks_calendar')) || [];
let currentFilter = 'all';
let searchQuery = '';

function init() {
    loadTheme();
    setDefaultDateTime();
    renderTasks();
    
    // Check alarms every 15 seconds
    setInterval(checkTaskAlarms, 15000);

    taskForm.addEventListener('submit', handleAddTask);
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderTasks();
    });
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    clearCompletedBtn.addEventListener('click', () => {
        tasks = tasks.filter(t => !t.completed);
        saveAndRender();
    });

    themeToggleBtn.addEventListener('click', toggleTheme);
    notificationBtn.addEventListener('click', requestNotificationPermission);
}

// Set default datetime picker value to current time + 1 hour
function setDefaultDateTime() {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    taskDueDate.value = now.toISOString().slice(0, 16);
}

function handleAddTask(e) {
    e.preventDefault();
    const text = taskInput.value.trim();
    const dueDate = taskDueDate.value;
    if (!text || !dueDate) return;

    const newTask = {
        id: Date.now().toString(),
        text,
        category: categorySelect.value,
        dueDate,
        completed: false,
        alertTriggered: false
    };

    tasks.unshift(newTask);
    saveAndRender();
    taskInput.value = '';
    setDefaultDateTime();
}

function toggleTaskComplete(id) {
    tasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    saveAndRender();
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newText = prompt("Edit task description:", task.text);
    if (newText !== null && newText.trim() !== "") {
        task.text = newText.trim();
        saveAndRender();
    }
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveAndRender();
}

// Alarm & Notification Checker
function checkTaskAlarms() {
    const now = new Date();
    let updated = false;

    tasks.forEach(task => {
        if (!task.completed && !task.alertTriggered && task.dueDate) {
            const dueTime = new Date(task.dueDate);
            if (now >= dueTime) {
                triggerAlarm(task);
                task.alertTriggered = true;
                updated = true;
            }
        }
    });

    if (updated) {
        saveAndRender();
    }
}

function triggerAlarm(task) {
    // Play audio alarm
    alarmSound.play().catch(err => console.log("Audio playback blocked by browser policy until interaction."));

    // Browser Notification
    if (Notification.permission === "granted") {
        new Notification("Task Alarm Due! ⏰", {
            body: `Deadline reached for: "${task.text}"`,
            icon: "https://cdn-icons-png.flaticon.com/512/2921/2921222.png"
        });
    }

    alert(`⏰ ALARM DUE: "${task.text}" (${task.category}) deadline has arrived!`);
}

function requestNotificationPermission() {
    if (!("Notification" in window)) {
        alert("This browser does not support desktop notifications.");
        return;
    }
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            alert("Notifications enabled successfully!");
            notificationBtn.style.color = "var(--success)";
        }
    });
}

function renderTasks() {
    const filtered = tasks.filter(t => {
        const matchesSearch = t.text.toLowerCase().includes(searchQuery);
        if (currentFilter === 'pending') return !t.completed && matchesSearch;
        if (currentFilter === 'completed') return t.completed && matchesSearch;
        return matchesSearch;
    });

    taskList.innerHTML = '';

    if (filtered.length === 0) {
        taskList.innerHTML = `<li class="empty-view">No tasks found</li>`;
    } else {
        const now = new Date();
        filtered.forEach(t => {
            const tagClass = `tag-${t.category.toLowerCase()}`;
            const dueDateTime = t.dueDate ? new Date(t.dueDate) : null;
            const isOverdue = dueDateTime && now > dueDateTime && !t.completed;
            const formattedDate = dueDateTime ? dueDateTime.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

            const li = document.createElement('li');
            li.className = `task-card ${t.completed ? 'completed' : ''}`;
            li.innerHTML = `
                <div class="task-left">
                    <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTaskComplete('${t.id}')">
                    <div class="task-details">
                        <span class="task-text">${escapeHTML(t.text)}</span>
                        <div class="task-meta-info">
                            <span class="category-tag ${tagClass}">${t.category}</span>
                            ${formattedDate ? `<span class="due-date-display ${isOverdue ? 'overdue' : ''}"><i class="fa-regular fa-clock"></i> ${formattedDate}${isOverdue ? '(Due!)' : ''}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="action-btn edit" onclick="editTask('${t.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-btn delete" onclick="deleteTask('${t.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            taskList.appendChild(li);
        });
    }

    updateMetrics();
}

function updateMetrics() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const remaining = total - completed;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    taskCounter.textContent = `${remaining} task${remaining === 1 ? '' : 's'} remaining`;
    progressBarFill.style.width = `${percent}%`;
    progressPercentage.textContent = `${percent}%`;
}

function saveAndRender() {
    localStorage.setItem('pro_tasks_calendar', JSON.stringify(tasks));
    renderTasks();
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('pro_theme_calendar', next);
    themeToggleBtn.innerHTML = next === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
}

function loadTheme() {
    const saved = localStorage.getItem('pro_theme_calendar') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    themeToggleBtn.innerHTML = saved === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    if (Notification.permission === "granted") {
        notificationBtn.style.color = "var(--success)";
    }
}

init();