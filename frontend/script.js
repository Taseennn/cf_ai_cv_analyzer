const API_URL = 'http://localhost:8787';
let currentSessionId = null;

// Event Listeners
document.getElementById('analyze-btn').addEventListener('click', analyzeCV);
document.getElementById('chat-btn').addEventListener('click', sendChatMessage);
document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

async function analyzeCV() {
    const cv = document.getElementById('cv-input').value;
    const jobDesc = document.getElementById('job-input').value;

    if (!cv || !jobDesc) {
        alert('Please fill in both CV and Job Description');
        return;
    }

    const btn = document.getElementById('analyze-btn');
    const loading = document.getElementById('loading');
    
    btn.disabled = true;
    loading.classList.add('active');

    try {
        const response = await fetch(`${API_URL}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cv, job_desc: jobDesc })
        });

        const data = await response.json();
        currentSessionId = data.session_id;
        displayResults(data);
    } catch (error) {
        alert('Error analyzing CV: ' + error.message);
    } finally {
        btn.disabled = false;
        loading.classList.remove('active');
    }
}

function displayResults(data) {
    // Show results sections
    document.getElementById('results').style.display = 'grid';
    document.getElementById('score-section').style.display = 'flex';
    document.getElementById('session-info').style.display = 'block';
    document.getElementById('chat-section').classList.add('active');

    // Display summary
    document.getElementById('summary-text').textContent = data.summary;

    // Display weaknesses
    const weaknessesList = document.getElementById('weaknesses-list');
    weaknessesList.innerHTML = '';
    data.weaknesses.forEach(weakness => {
        const li = document.createElement('li');
        li.textContent = weakness;
        weaknessesList.appendChild(li);
    });

    // Display improvements
    const improvementsList = document.getElementById('improvements-list');
    improvementsList.innerHTML = '';
    data.improvements.forEach(improvement => {
        const li = document.createElement('li');
        li.textContent = improvement;
        improvementsList.appendChild(li);
    });

    // Display strengths
    const strengthsList = document.getElementById('strengths-list');
    strengthsList.innerHTML = '';
    data.strengths.forEach(strength => {
        const li = document.createElement('li');
        li.textContent = strength;
        strengthsList.appendChild(li);
    });

    // Display score
    const score = data.atsScore;
    document.getElementById('score-value').textContent = score;
    
    const circle = document.getElementById('progress-circle');
    const circumference = 565.48;
    const offset = circumference - (score / 100) * circumference;
    circle.style.strokeDashoffset = offset;

    // Display pass/fail status
    const statusBadge = document.getElementById('status-badge');
    if (data.pass) {
        statusBadge.textContent = 'PASS';
        statusBadge.className = 'status-badge status-pass';
    } else {
        statusBadge.textContent = 'FAIL';
        statusBadge.className = 'status-badge status-fail';
    }

    // Display session ID
    document.getElementById('session-id').textContent = currentSessionId;
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const question = input.value.trim();

    if (!question || !currentSessionId) return;

    const chatHistory = document.getElementById('chat-history');
    
    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-message user';
    userMsg.textContent = question;
    chatHistory.appendChild(userMsg);

    input.value = '';

    // TODO: Implement /chat endpoint call
    // For now, just show a placeholder response
    const aiMsg = document.createElement('div');
    aiMsg.className = 'chat-message ai';
    aiMsg.textContent = 'Chat endpoint not yet implemented. Connect this to your /chat Worker endpoint.';
    chatHistory.appendChild(aiMsg);

    chatHistory.scrollTop = chatHistory.scrollHeight;
}