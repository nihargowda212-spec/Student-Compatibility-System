const TRAIT_ORDER = ['Mindset', 'Self-Management', 'Interactions', 'Personality', 'Resilience'];

const TRAIT_METADATA = {
    Mindset: {
        description: 'How naturally you generate ideas, stay curious, and adapt to new concepts.',
        highlight: 'Your curiosity fuels inventive thinking and helps you connect the dots quickly.',
        boost: 'Start a 15-minute “what if” journal twice a week to stretch your creative muscles.',
        amplify: 'Channel that curiosity into weekly research sprints or idea journals to keep learning sharp.',
        sustain: 'Share your discoveries with peers to turn inspiration into real projects.'
    },
    'Self-Management': {
        description: 'Planning, discipline, and the ability to execute consistently.',
        highlight: 'You know how to organise priorities and keep commitments on track.',
        boost: 'Design a simple daily priority list and review it morning and evening for one week.',
        amplify: 'Build a daily focus dashboard—two concentrated work blocks and one reflection check-in.',
        sustain: 'Teach a teammate your planning routine to reinforce your rhythm.'
    },
    Interactions: {
        description: 'Communication, collaboration, and empathy with teammates.',
        highlight: 'You create space for others, helping groups stay aligned and energised.',
        boost: 'Schedule short check-ins with teammates to practice active listening and feedback.',
        amplify: 'Host mini retros or idea jams to encourage open feedback and better collaboration.',
        sustain: 'Keep nurturing relationships by recognising wins and inviting diverse perspectives.'
    },
    Personality: {
        description: 'Authenticity, positivity, and the confidence you bring to each interaction.',
        highlight: 'Your presence boosts team morale and adds genuine enthusiasm to the mix.',
        boost: 'Say yes to one new showcase opportunity this week to build expressive confidence.',
        amplify: 'Capture your wins in a confidence journal and share stories that inspire others.',
        sustain: 'Volunteer for visible roles that let your energy set the tone for the group.'
    },
    Resilience: {
        description: 'How you bounce back from setbacks and stay composed under pressure.',
        highlight: 'You recover quickly and frame challenges as opportunities to grow.',
        boost: 'Create a quick reset ritual—pause, breathe, reframe—whenever stress spikes this week.',
        amplify: 'Build a weekly recovery routine—mindfulness, movement, and reflection to recharge.',
        sustain: 'Document your comeback stories to coach peers through future challenges.'
    }
};

const CACHE_KEYS = {
    personality: 'studentMatchPersonalitySnapshot',
    compatibility: 'studentMatchCompatibilitySnapshot'
};

const HISTORY_KEY_PREFIX = 'studentMatchHistory_';
const MAX_HISTORY_ENTRIES = 10;

const PRIMARY_DATASET = {
    backgroundColor: 'rgba(102, 126, 234, 0.20)',
    borderColor: 'rgba(102, 126, 234, 0.85)',
    pointBackgroundColor: 'rgba(102, 126, 234, 0.85)',
    pointBorderColor: '#fff',
    pointHoverBackgroundColor: '#fff',
    pointHoverBorderColor: 'rgba(102, 126, 234, 0.85)'
};

const COMPARISON_DATASET = {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderColor: 'rgba(16, 185, 129, 0.85)',
    pointBackgroundColor: 'rgba(16, 185, 129, 0.85)',
    pointBorderColor: '#fff',
    pointHoverBackgroundColor: '#fff',
    pointHoverBorderColor: 'rgba(16, 185, 129, 0.85)'
};

let personalityChart = null;
let currentScoreMap = null;
let currentUsername = 'You';
let lastUpdatedAt = null;
let latestSnapshot = null;
let currentSnapshotTimestamp = null;
let currentViewMode = 'latest'; // 'latest' | 'comparison' | 'history'
let activeComparison = null;
let lastCompatibilityResults = [];

let viewContextElement = null;
let historySectionElement = null;
let historyListElement = null;

document.addEventListener('DOMContentLoaded', () => {
    viewContextElement = document.getElementById('viewContext');
    historySectionElement = document.getElementById('historySection');
    historyListElement = document.getElementById('historyList');

    setupEventListeners();
    restoreCachedView();
    loadPersonalityScores();
    loadCompatibilityResults();
});

function setupEventListeners() {
    const resetBtn = document.getElementById('resetChartBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', handleResetView);
    }

    const compatibilityContainer = document.getElementById('compatibilityResults');
    if (compatibilityContainer) {
        compatibilityContainer.addEventListener('click', handleCompatibilityClick);
    }

    if (historyListElement) {
        historyListElement.addEventListener('click', handleHistoryClick);
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/logout', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                if (response.ok) {
                    window.location.href = '/login';
                } else {
                    alert('Unable to log out. Please try again.');
                }
            } catch (error) {
                console.error('Error logging out', error);
                alert('Unable to log out. Please try again.');
            }
        });
    }
}

async function loadPersonalityScores() {
    try {
        const response = await fetch('/api/personality-scores', { credentials: 'include' });
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }

        const data = await response.json();
        if (!response.ok) {
            if (!currentScoreMap) {
                showNoDataMessage();
            }
            return;
        }

        currentUsername = data.username || 'You';
        const scoreMap = buildScoreMap(data);
        const timestamp = data.calculated_at || new Date().toISOString();

        latestSnapshot = { timestamp, scoreMap };
        currentScoreMap = scoreMap;
        lastUpdatedAt = timestamp;
        currentSnapshotTimestamp = timestamp;
        currentViewMode = 'latest';
        activeComparison = null;

        cachePersonalityData(scoreMap, currentUsername, timestamp);
        const history = saveSnapshotToHistory(scoreMap, currentUsername, timestamp);
        renderHistoryList(history);

        updateAllInsights(scoreMap, null, timestamp);
    } catch (error) {
        console.error('Error loading personality scores:', error);
    }
}

async function loadCompatibilityResults() {
    try {
        const response = await fetch('/api/compatibility', { credentials: 'include' });
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }

        const data = await response.json();
        if (!response.ok) {
            if (!lastCompatibilityResults.length) {
                hideCompatibilitySection();
            }
            return;
        }

        const results = data.compatibility_results || [];
        lastCompatibilityResults = results;
        displayCompatibilityResults(results);
        cacheCompatibilityResults(results);
    } catch (error) {
        console.error('Error loading compatibility results:', error);
    }
}

function updateAllInsights(scoreMap, comparisonContext = null, timestamp = null) {
    displayPersonalityChart(
        scoreMap,
        currentUsername,
        comparisonContext ? comparisonContext.partnerScores : null,
        comparisonContext ? comparisonContext.partnerName : null
    );
    populateScoreGrid(scoreMap);
    updateOverallView(scoreMap, comparisonContext);
    updateNoticedContent(scoreMap, comparisonContext);
    generateActionPlan(scoreMap, comparisonContext);
    stampLastUpdated(timestamp);
    setViewContext(comparisonContext, timestamp);
    highlightActiveHistoryEntry();

    if (comparisonContext) {
        toggleResetButton(true, 'Show Latest Profile');
    } else if (currentViewMode === 'history' && latestSnapshot && currentSnapshotTimestamp !== latestSnapshot.timestamp) {
        toggleResetButton(true, 'Show Latest Profile');
    } else {
        toggleResetButton(false);
    }
}

function displayPersonalityChart(scoreMap, label = 'You', comparisonScoreMap = null, comparisonLabel = null) {
    const canvas = document.getElementById('personalityChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (personalityChart) {
        personalityChart.destroy();
    }

    const datasets = [{
        label,
        data: TRAIT_ORDER.map(trait => clampScore(scoreMap[trait])),
        ...PRIMARY_DATASET,
        borderWidth: 2
    }];

    if (comparisonScoreMap) {
        datasets.push({
            label: comparisonLabel || 'Partner',
            data: TRAIT_ORDER.map(trait => clampScore(comparisonScoreMap[trait])),
            ...COMPARISON_DATASET,
            borderWidth: 2
        });
    }

    personalityChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: TRAIT_ORDER,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    min: 0,
                    ticks: {
                        stepSize: 20,
                        color: '#64748b'
                    },
                    grid: {
                        color: 'rgba(226, 232, 240, 0.6)'
                    },
                    pointLabels: {
                        color: '#1e293b',
                        font: {
                            size: 14,
                            weight: '600'
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#1e293b',
                        font: {
                            size: 14,
                            weight: '600'
                        }
                    }
                }
            }
        }
    });
}

function populateScoreGrid(scoreMap) {
    const grid = document.getElementById('scoreGrid');
    if (!grid) return;

    const total = Object.values(scoreMap).reduce((acc, value) => acc + value, 0);
    if (total === 0) {
        grid.innerHTML = '<p class="empty-hint">Take the assessment to unlock your personalised dashboard.</p>';
        return;
    }

    grid.innerHTML = '';
    TRAIT_ORDER.forEach(trait => {
        const value = clampScore(scoreMap[trait]);
        const card = document.createElement('div');
        card.className = 'score-card';

        const header = document.createElement('div');
        header.className = 'card-header';

        const title = document.createElement('h3');
        title.textContent = trait;

        const badge = document.createElement('span');
        badge.className = 'score-badge';
        badge.textContent = getTraitBadgeLabel(value);

        header.appendChild(title);
        header.appendChild(badge);

        const metric = document.createElement('div');
        metric.className = 'score-metric';
        metric.innerHTML = `${Math.round(value)}<span>%</span>`;

        const progressTrack = document.createElement('div');
        progressTrack.className = 'score-progress-track';

        const progressFill = document.createElement('div');
        progressFill.className = 'score-progress-fill';
        progressFill.style.width = `${value}%`;
        progressTrack.appendChild(progressFill);

        const footnote = document.createElement('p');
        footnote.className = 'score-footnote';
        footnote.textContent = TRAIT_METADATA[trait]?.description || '';

        card.appendChild(header);
        card.appendChild(metric);
        card.appendChild(progressTrack);
        card.appendChild(footnote);
        grid.appendChild(card);
    });
}

function updateOverallView(scoreMap, comparisonContext = null) {
    const overallScoreElement = document.getElementById('overallScoreValue');
    const scoreStatusElement = document.getElementById('overallScoreStatus');
    const scoreLabelElement = document.getElementById('overallScoreLabel');

    if (!overallScoreElement || !scoreStatusElement || !scoreLabelElement) return;

    const values = TRAIT_ORDER.map(trait => clampScore(scoreMap[trait])).filter(val => val > 0);
    if (!values.length) {
        overallScoreElement.textContent = '--';
        scoreStatusElement.textContent = 'Pending';
        scoreLabelElement.textContent = 'Complete the personality test to view your aligned score.';
        return;
    }

    const average = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
    const [topTrait] = Object.entries(scoreMap).sort((a, b) => b[1] - a[1])[0];

    overallScoreElement.textContent = `${average}%`;
    scoreStatusElement.textContent = getOverallStatusLabel(average);
    scoreLabelElement.textContent = `Your standout area is ${topTrait.toLowerCase()}, showing ${TRAIT_METADATA[topTrait]?.highlight || 'solid momentum.'}`;
}

function updateNoticedContent(scoreMap, comparisonContext = null) {
    const insightContainer = document.getElementById('noticedContent');
    const insightTag = document.getElementById('insightTag');
    if (!insightContainer || !insightTag) return;

    if (comparisonContext) {
        const partnerScores = comparisonContext.partnerScores;
        const partnerName = comparisonContext.partnerName;
        const insights = [];

        const combined = TRAIT_ORDER.map(trait => {
            const userScore = clampScore(scoreMap[trait]);
            const partnerScore = clampScore(partnerScores[trait]);
            return {
                trait,
                userScore,
                partnerScore,
                combined: userScore + partnerScore,
                gap: userScore - partnerScore
            };
        });

        const bestShared = [...combined].sort((a, b) => b.combined - a.combined)[0];
        const userAdvantage = [...combined].sort((a, b) => b.gap - a.gap)[0];
        const partnerAdvantage = [...combined].sort((a, b) => a.gap - b.gap)[0];

        if (bestShared) {
            insights.push(`<p>Together, you both excel at <strong>${bestShared.trait}</strong> (${Math.round(bestShared.userScore)}% • ${Math.round(bestShared.partnerScore)}%). Plan shared projects around this momentum.</p>`);
        }
        if (userAdvantage && userAdvantage.gap > 5) {
            insights.push(`<p>Your <strong>${userAdvantage.trait}</strong> score outpaces ${partnerName} by ${Math.round(userAdvantage.gap)} points—offer to lead in this area.</p>`);
        }
        if (partnerAdvantage && partnerAdvantage.gap < -5) {
            insights.push(`<p>${partnerName} shines in <strong>${partnerAdvantage.trait}</strong>. Invite them to mentor you or steer tasks that rely on this trait.</p>`);
        }

        if (!insights.length) {
            insights.push(`<p>Your profiles are closely aligned. Celebrate the balance and explore ambitious goals together.</p>`);
        }

        insightTag.textContent = 'Match Insight';
        insightContainer.innerHTML = insights.join('');
        return;
    }

    const entries = Object.entries(scoreMap).filter(([, value]) => value > 0);
    if (!entries.length) {
        insightTag.textContent = 'Overview';
        insightContainer.innerHTML = '<p>Complete the personality test to see personalised insights.</p>';
        return;
    }

    const sorted = entries.sort((a, b) => b[1] - a[1]);
    const [topTrait, topScore] = sorted[0];
    const second = sorted[1];

    insightTag.textContent = getInsightTagLabel(topScore);

    const insights = [];
    const metadata = TRAIT_METADATA[topTrait];
    insights.push(`<p><strong>${topTrait}</strong> leads at <strong>${Math.round(topScore)}%</strong>. ${metadata?.highlight || ''}</p>`);

    if (second) {
        const [secondTrait, secondScore] = second;
        insights.push(`<p>Pair it with <strong>${secondTrait}</strong> (${Math.round(secondScore)}%) to ${TRAIT_METADATA[secondTrait]?.amplify || 'keep momentum building.'}</p>`);
    } else {
        insights.push('<p>Complete more assessments to unlock deeper trends and comparisons.</p>');
    }

    insightContainer.innerHTML = insights.join('');
}

function generateActionPlan(scoreMap, comparisonContext = null) {
    const actionPlanContent = document.getElementById('actionPlanContent');
    if (!actionPlanContent) return;

    const actionPlan = [];

    if (comparisonContext) {
        const partnerScores = comparisonContext.partnerScores;
        const partnerName = comparisonContext.partnerName;

        const combined = TRAIT_ORDER.map(trait => ({
            trait,
            userScore: clampScore(scoreMap[trait]),
            partnerScore: clampScore(partnerScores[trait])
        }));

        const bestJoint = [...combined].sort((a, b) => (b.userScore + b.partnerScore) - (a.userScore + a.partnerScore))[0];
        if (bestJoint) {
            actionPlan.push(`Co-lead a project that emphasises <strong>${bestJoint.trait}</strong>—you score ${Math.round(bestJoint.userScore)}% and ${partnerName} scores ${Math.round(bestJoint.partnerScore)}%, making it a shared superpower.`);
        }

        const biggestGap = [...combined].sort((a, b) => Math.abs((b.partnerScore - b.userScore)) - Math.abs((a.partnerScore - a.userScore)))[0];
        if (biggestGap && Math.abs(biggestGap.partnerScore - biggestGap.userScore) > 5) {
            if (biggestGap.partnerScore > biggestGap.userScore) {
                actionPlan.push(`Let <strong>${partnerName}</strong> mentor you in <strong>${biggestGap.trait}</strong> while you balance with complementary strengths.`);
            } else {
                actionPlan.push(`Offer coaching to <strong>${partnerName}</strong> on <strong>${biggestGap.trait}</strong> to raise your combined capability.`);
            }
        }
    }

    const personalFocus = Object.entries(scoreMap)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3);

    personalFocus.forEach(([category, score]) => {
        const metadata = TRAIT_METADATA[category];
        let actionText = '';

        if (score < 50) {
            actionText = metadata?.boost || 'Schedule a focused practice session to strengthen this trait.';
        } else if (score < 70) {
            actionText = metadata?.amplify || 'Look for a collaborative project that stretches this skill.';
        } else {
            actionText = metadata?.sustain || 'Keep applying this strength to support your peers.';
        }

        actionPlan.push(`<strong>${category}</strong> • ${Math.round(score)}% — ${actionText}`);
    });

    if (actionPlan.length) {
        actionPlanContent.innerHTML = '<ul>' + actionPlan.map(item => `<li>${item}</li>`).join('') + '</ul>';
    } else {
        actionPlanContent.innerHTML = '<p>Great job! Your scores are well-balanced. Continue maintaining your strengths across all areas.</p>';
    }
}

function displayCompatibilityResults(results, options = {}) {
    const section = document.getElementById('compatibilitySection');
    const container = document.getElementById('compatibilityResults');
    if (!section || !container) return;

    if (!results || !results.length) {
        section.style.display = 'none';
        container.innerHTML = '';
        if (!options.fromCache) {
            cacheCompatibilityResults([]);
        }
        return;
    }

    section.style.display = 'block';
    container.innerHTML = '';

    results.forEach(result => {
        const score = parseFloat(result.compatibility_score || 0);
        const { label, message, toneClass } = getCompatibilityLabel(score);

        const card = document.createElement('div');
        card.className = 'compatibility-card';
        card.innerHTML = `
            <div class="compatibility-card-header">
                <div>
                    <h3>${result.other_username}</h3>
                    <p class="compatibility-meta">${message}</p>
                </div>
                <div class="compatibility-score">${score.toFixed(1)}%</div>
            </div>
            <div class="compatibility-card-actions">
                <button class="btn btn-outline btn-compare" data-user-id="${result.other_user_id}" data-username="${result.other_username}">Compare Profiles</button>
            </div>
            <span class="tag ${toneClass}">${label}</span>
        `;

        container.appendChild(card);
    });

    if (!options.fromCache) {
        cacheCompatibilityResults(results);
    }
}

function handleCompatibilityClick(event) {
    const button = event.target.closest('.btn-compare');
    if (!button) return;

    const otherUserId = parseInt(button.dataset.userId, 10);
    const partnerName = button.dataset.username || 'Partner';
    if (!otherUserId) return;

    showComparison(otherUserId, partnerName, button);
}

async function showComparison(otherUserId, partnerName, triggerButton) {
    let loadingText = null;
    if (triggerButton) {
        loadingText = triggerButton.textContent;
        triggerButton.disabled = true;
        triggerButton.classList.add('loading');
        triggerButton.textContent = 'Loading...';
    }

    try {
        const response = await fetch(`/api/compatibility/${otherUserId}`, { credentials: 'include' });
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }

        const data = await response.json();
        if (!response.ok) {
            alert(data.error || 'Unable to load comparison right now.');
            return;
        }

        const userScoreMap = buildScoreMap(data.user.scores || {});
        const partnerScoreMap = buildScoreMap(data.partner.scores || {});

        currentScoreMap = userScoreMap;
        currentUsername = data.user.username || currentUsername;
        lastUpdatedAt = data.user.scores?.calculated_at || lastUpdatedAt;
        currentSnapshotTimestamp = data.user.scores?.calculated_at || currentSnapshotTimestamp;

        activeComparison = {
            partnerId: otherUserId,
            partnerName: data.partner.username || partnerName,
            partnerScores: partnerScoreMap,
            compatibilityScore: parseFloat(data.compatibility_score || 0)
        };
        currentViewMode = 'comparison';

        updateAllInsights(userScoreMap, activeComparison, data.user.scores?.calculated_at || null);
    } catch (error) {
        console.error('Error retrieving comparison', error);
        alert('Unable to load comparison right now. Please try again.');
    } finally {
        if (triggerButton) {
            triggerButton.disabled = false;
            triggerButton.classList.remove('loading');
            triggerButton.textContent = loadingText || 'Compare Profiles';
        }
    }
}

function handleResetView() {
    if (activeComparison || currentViewMode === 'history') {
        showLatestSnapshot();
    }
}

function showLatestSnapshot() {
    if (!latestSnapshot) return;
    activeComparison = null;
    currentViewMode = 'latest';
    currentScoreMap = latestSnapshot.scoreMap;
    currentSnapshotTimestamp = latestSnapshot.timestamp;
    updateAllInsights(latestSnapshot.scoreMap, null, latestSnapshot.timestamp);
}

function toggleResetButton(show, label = 'Show Latest Profile') {
    const resetBtn = document.getElementById('resetChartBtn');
    if (!resetBtn) return;
    resetBtn.style.display = show ? 'inline-flex' : 'none';
    if (show) {
        resetBtn.textContent = label;
    }
}

function showNoDataMessage() {
    const insightContainer = document.getElementById('noticedContent');
    const insightTag = document.getElementById('insightTag');
    if (insightContainer) {
        insightContainer.innerHTML = '<p>Complete the personality test to see personalised insights.</p>';
    }
    if (insightTag) {
        insightTag.textContent = 'Overview';
    }
}

function hideCompatibilitySection() {
    const section = document.getElementById('compatibilitySection');
    const container = document.getElementById('compatibilityResults');
    if (section) section.style.display = 'none';
    if (container) container.innerHTML = '';
}

function cachePersonalityData(scoreMap, username, updatedAt) {
    try {
        localStorage.setItem(CACHE_KEYS.personality, JSON.stringify({ scoreMap, username, updatedAt }));
    } catch (error) {
        console.warn('Unable to cache personality data', error);
    }
}

function cacheCompatibilityResults(results) {
    try {
        localStorage.setItem(CACHE_KEYS.compatibility, JSON.stringify(results || []));
    } catch (error) {
        console.warn('Unable to cache compatibility results', error);
    }
}

function restoreCachedView() {
    try {
        const cachedPersonalityRaw = localStorage.getItem(CACHE_KEYS.personality);
        if (cachedPersonalityRaw) {
            const cached = JSON.parse(cachedPersonalityRaw);
            if (cached && cached.scoreMap) {
                currentScoreMap = cached.scoreMap;
                currentUsername = cached.username || 'You';
                lastUpdatedAt = cached.updatedAt || null;
                currentSnapshotTimestamp = cached.updatedAt || null;
                latestSnapshot = cached.updatedAt ? { timestamp: cached.updatedAt, scoreMap: cached.scoreMap } : null;
                currentViewMode = 'latest';
                updateAllInsights(currentScoreMap, null, cached.updatedAt || null);
            }
        }
    } catch (error) {
        console.warn('Unable to restore cached personality data', error);
    }

    const history = loadHistory(currentUsername);
    renderHistoryList(history, { fromCache: true });

    try {
        const cachedCompatibilityRaw = localStorage.getItem(CACHE_KEYS.compatibility);
        if (cachedCompatibilityRaw) {
            const cachedResults = JSON.parse(cachedCompatibilityRaw);
            if (Array.isArray(cachedResults) && cachedResults.length) {
                lastCompatibilityResults = cachedResults;
                displayCompatibilityResults(cachedResults, { fromCache: true });
            }
        }
    } catch (error) {
        console.warn('Unable to restore cached compatibility data', error);
    }
}

function saveSnapshotToHistory(scoreMap, username, timestamp) {
    const history = loadHistory(username);
    const existingIndex = history.findIndex(entry => entry.timestamp === timestamp);
    if (existingIndex !== -1) {
        history.splice(existingIndex, 1);
    }
    const safeScoreMap = JSON.parse(JSON.stringify(scoreMap));
    history.push({ timestamp, scoreMap: safeScoreMap });
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const trimmed = history.slice(0, MAX_HISTORY_ENTRIES);

    try {
        localStorage.setItem(getHistoryKey(username), JSON.stringify(trimmed));
    } catch (error) {
        console.warn('Unable to store history snapshot', error);
    }

    return trimmed;
}

function loadHistory(username) {
    try {
        const raw = localStorage.getItem(getHistoryKey(username));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('Unable to load history', error);
        return [];
    }
}

function renderHistoryList(history, options = {}) {
    if (!historySectionElement || !historyListElement) return;
    if (!history || !history.length) {
        historySectionElement.style.display = 'none';
        historyListElement.innerHTML = '';
        return;
    }

    historySectionElement.style.display = 'block';
    historyListElement.innerHTML = history.map(entry => {
        const dateLabel = formatDateTime(entry.timestamp);
        const stats = summarizeSnapshot(entry.scoreMap);
        return `
            <div class="history-entry" data-timestamp="${entry.timestamp}">
                <div class="history-entry-info">
                    <strong>${dateLabel.date}</strong>
                    <span class="history-entry-meta">${dateLabel.time} • Avg ${stats.average}%${stats.highlight ? ` • Top ${stats.highlight}` : ''}</span>
                    <div class="history-entry-stats">
                        ${stats.traits.map(t => `<span>${t.name}: ${t.score}%</span>`).join('')}
                    </div>
                </div>
                <button class="btn btn-outline btn-history" data-timestamp="${entry.timestamp}">View Snapshot</button>
            </div>
        `;
    }).join('');

    const buttons = historyListElement.querySelectorAll('.btn-history');
    buttons.forEach(button => {
        button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            const ts = button.dataset.timestamp || button.closest('.history-entry')?.dataset.timestamp;
            if (ts) {
                viewHistorySnapshot(ts);
            }
        });
    });

    const entries = historyListElement.querySelectorAll('.history-entry');
    entries.forEach(entry => {
        entry.addEventListener('click', event => {
            // avoid duplicate handling if button already triggered
            if (event.target.closest('.btn-history')) return;
            const ts = entry.dataset.timestamp;
            if (ts) {
                viewHistorySnapshot(ts);
            }
        });
    });

    highlightActiveHistoryEntry();

    if (!options.fromCache && latestSnapshot) {
        currentSnapshotTimestamp = latestSnapshot.timestamp;
    }

    setWelcomeMessage();
}

function handleHistoryClick(event) {
    const entry = event.target.closest('.history-entry');
    const button = event.target.closest('.btn-history');

    if (!entry && !button) return;

    const timestamp = (entry && entry.dataset.timestamp) || (button && button.dataset.timestamp);
    if (!timestamp) return;
    viewHistorySnapshot(timestamp);
}

function viewHistorySnapshot(timestamp) {
    const history = loadHistory(currentUsername);
    const snapshot = history.find(entry => entry.timestamp === timestamp);
    if (!snapshot) {
        console.warn('Snapshot not found for timestamp', timestamp);
        return;
    }

    const safeScoreMap = JSON.parse(JSON.stringify(snapshot.scoreMap));
    console.log('Loaded snapshot', {
        timestamp: snapshot.timestamp,
        scoreMap: safeScoreMap
    });
    // Restore cached compatibility if it exists so list isn't empty
    if (!lastCompatibilityResults.length) {
        const cachedCompatibilityRaw = localStorage.getItem(CACHE_KEYS.compatibility);
        if (cachedCompatibilityRaw) {
            try {
                const cachedResults = JSON.parse(cachedCompatibilityRaw);
                if (Array.isArray(cachedResults)) {
                    lastCompatibilityResults = cachedResults;
                    displayCompatibilityResults(cachedResults, { fromCache: true });
                }
            } catch (error) {
                console.warn('Unable to restore cached compatibility data', error);
            }
        }
    }

    activeComparison = null;
    currentScoreMap = safeScoreMap;
    currentSnapshotTimestamp = snapshot.timestamp;
    currentViewMode = latestSnapshot && snapshot.timestamp === latestSnapshot.timestamp ? 'latest' : 'history';

    updateAllInsights(safeScoreMap, null, snapshot.timestamp);
}

function highlightActiveHistoryEntry() {
    if (!historyListElement) return;
    const entries = historyListElement.querySelectorAll('.history-entry');
    entries.forEach(entry => {
        if (entry.dataset.timestamp === currentSnapshotTimestamp) {
            entry.classList.add('active');
        } else {
            entry.classList.remove('active');
        }
    });
}

function setViewContext(comparisonContext, timestamp) {
    if (!viewContextElement) return;

    if (comparisonContext) {
        viewContextElement.textContent = `Comparing with ${comparisonContext.partnerName} — ${comparisonContext.compatibilityScore.toFixed(1)}% match`;
        return;
    }

    const label = formatDateTime(timestamp || currentSnapshotTimestamp || new Date().toISOString());
    if (currentViewMode === 'history' && timestamp) {
        viewContextElement.textContent = `Viewing snapshot from ${label.date} • ${label.time}`;
    } else {
        viewContextElement.textContent = `Showing latest profile snapshot (${label.date} • ${label.time})`;
    }
}

function stampLastUpdated(timestamp = null) {
    const label = document.getElementById('lastUpdatedLabel');
    if (!label) return;

    const dateLabel = formatDateTime(timestamp || new Date().toISOString());
    label.textContent = `Updated ${dateLabel.date}`;
}

function buildScoreMap(rawScores = {}) {
    const map = {};
    TRAIT_ORDER.forEach(trait => {
        const key = trait.toLowerCase().replace('-', '_');
        const camelKey = trait.replace('-', '');
        let value = rawScores[`${key}_score`];
        if (value === undefined) value = rawScores[key];
        if (value === undefined) value = rawScores[trait];
        if (value === undefined) value = rawScores[camelKey];
        map[trait] = clampScore(parseFloat(value) || 0);
    });
    return map;
}

function clampScore(value) {
    if (Number.isNaN(value)) return 0;
    return Math.min(100, Math.max(0, value));
}

function summarizeSnapshot(scoreMap) {
    const entries = TRAIT_ORDER.map(trait => ({
        name: trait,
        score: Math.round(clampScore(scoreMap[trait] || 0))
    }));
    const validScores = entries.map(e => e.score).filter(score => score > 0);
    const average = validScores.length ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;
    const sorted = [...entries].sort((a, b) => b.score - a.score);
    const highlightTrait = sorted[0] || null;
    return {
        average,
        highlight: highlightTrait && highlightTrait.score > 0 ? `${highlightTrait.name} ${highlightTrait.score}%` : '',
        traits: sorted
    };
}

function getTraitBadgeLabel(score) {
    if (score >= 75) return 'Strength';
    if (score >= 55) return 'Building';
    if (score > 0) return 'Focus';
    return 'Pending';
}

function getOverallStatusLabel(score) {
    if (score >= 75) return 'Thriving';
    if (score >= 60) return 'Balanced';
    if (score >= 45) return 'Developing';
    return 'Emerging';
}

function getInsightTagLabel(score) {
    if (score >= 75) return 'Strength Spotlight';
    if (score >= 55) return 'Momentum Insight';
    if (score > 0) return 'Focus Area';
    return 'Overview';
}

function getCompatibilityLabel(scoreValue) {
    const score = parseFloat(scoreValue) || 0;
    if (score >= 80) {
        return {
            label: 'High Synergy',
            message: 'Expect a natural rhythm—pair up for complex challenges or strategic work.',
            toneClass: 'sync'
        };
    }
    if (score >= 65) {
        return {
            label: 'Promising Fit',
            message: 'Great balance for co-learning sessions and collaborative problem solving.',
            toneClass: 'balance'
        };
    }
    return {
        label: 'Complementary',
        message: 'Different strengths can cover blind spots—align on roles before diving in.',
        toneClass: 'watch'
    };
}

function setWelcomeMessage() {
    const element = document.getElementById('welcomeMessage');
    if (!element) return;
    const name = currentUsername || '';
    if (name) {
        element.textContent = `Welcome back, ${name}`;
    } else {
        element.textContent = 'Assessment Complete';
    }
}

function getHistoryKey(username) {
    return `${HISTORY_KEY_PREFIX}${username || 'default'}`;
}

function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
        const fallback = new Date();
        return {
            date: fallback.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
            time: fallback.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        };
    }

    return {
        date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        time: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    };
}
