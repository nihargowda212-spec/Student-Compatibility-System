// Results Page JavaScript

let personalityChart = null;

const TRAIT_ORDER = ['Mindset', 'Self-Management', 'Interactions', 'Personality', 'Resilience'];

const TRAIT_METADATA = {
    'Mindset': {
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
    'Interactions': {
        description: 'Communication, collaboration, and empathy with teammates.',
        highlight: 'You create space for others, helping groups stay aligned and energised.',
        boost: 'Schedule short check-ins with teammates to practice active listening and feedback.',
        amplify: 'Host mini retros or idea jams to encourage open feedback and better collaboration.',
        sustain: 'Keep nurturing relationships by recognising wins and inviting diverse perspectives.'
    },
    'Personality': {
        description: 'Authenticity, positivity, and the confidence you bring to each interaction.',
        highlight: 'Your presence boosts team morale and adds genuine enthusiasm to the mix.',
        boost: 'Say yes to one new showcase opportunity this week to build expressive confidence.',
        amplify: 'Capture your wins in a confidence journal and share stories that inspire others.',
        sustain: 'Volunteer for visible roles that let your energy set the tone for the group.'
    },
    'Resilience': {
        description: 'How you bounce back from setbacks and stay composed under pressure.',
        highlight: 'You recover quickly and frame challenges as opportunities to grow.',
        boost: 'Create a quick reset ritual—pause, breathe, reframe—whenever stress spikes this week.',
        amplify: 'Build a weekly recovery routine—mindfulness, movement, and reflection to recharge.',
        sustain: 'Document your comeback stories to coach peers through future challenges.'
    }
};

document.addEventListener('DOMContentLoaded', async function() {
    await loadPersonalityScores();
    await loadCompatibilityResults();
});

async function loadPersonalityScores() {
    try {
        const response = await fetch('/api/personality-scores');
        const data = await response.json();

        if (response.ok) {
            const scoreMap = buildScoreMap(data);
            displayPersonalityChart(scoreMap);
            populateScoreGrid(scoreMap);
            updateOverallView(scoreMap);
            updateNoticedContent(scoreMap);
            generateActionPlan(scoreMap);
            stampLastUpdated();
        } else {
            document.getElementById('noticedContent').innerHTML = 
                '<p>Please complete the personality test to see your results.</p>';
        }
    } catch (error) {
        console.error('Error loading personality scores:', error);
    }
}

function buildScoreMap(rawScores) {
    return {
        'Mindset': parseFloat(rawScores.mindset_score) || 0,
        'Self-Management': parseFloat(rawScores.self_management_score) || 0,
        'Interactions': parseFloat(rawScores.interactions_score) || 0,
        'Personality': parseFloat(rawScores.personality_score) || 0,
        'Resilience': parseFloat(rawScores.resilience_score) || 0
    };
}

function displayPersonalityChart(scoreMap) {
    const ctx = document.getElementById('personalityChart').getContext('2d');
    
    if (personalityChart) {
        personalityChart.destroy();
    }
    
    const data = {
        labels: TRAIT_ORDER,
        datasets: [{
            label: 'Your Personality',
            data: TRAIT_ORDER.map(trait => clampScore(scoreMap[trait])),
            backgroundColor: 'rgba(102, 126, 234, 0.25)',
            borderColor: 'rgba(129, 140, 248, 0.95)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(129, 140, 248, 0.95)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(129, 140, 248, 0.95)'
        }]
    };
    
    const config = {
        type: 'radar',
        data: data,
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
    };
    
    personalityChart = new Chart(ctx, config);
}

function populateScoreGrid(scoreMap) {
    const grid = document.getElementById('scoreGrid');
    const total = Object.values(scoreMap).reduce((acc, value) => acc + value, 0);

    if (!grid) return;

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

function updateOverallView(scoreMap) {
    const values = TRAIT_ORDER.map(trait => clampScore(scoreMap[trait])).filter(score => score > 0);
    const overallScoreElement = document.getElementById('overallScoreValue');
    const scoreStatusElement = document.getElementById('overallScoreStatus');
    const scoreLabelElement = document.getElementById('overallScoreLabel');

    if (!overallScoreElement || values.length === 0) {
        if (overallScoreElement) overallScoreElement.textContent = '--';
        if (scoreStatusElement) scoreStatusElement.textContent = 'Pending';
        if (scoreLabelElement) scoreLabelElement.textContent = 'Complete the personality test to view your aligned score.';
        return;
    }

    const average = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
    const [topTrait] = Object.entries(scoreMap).sort((a, b) => b[1] - a[1])[0];

    overallScoreElement.textContent = `${average}%`;
    scoreStatusElement.textContent = getOverallStatusLabel(average);
    scoreLabelElement.textContent = `Your standout area is ${topTrait.toLowerCase()}, showing ${TRAIT_METADATA[topTrait]?.highlight || 'solid momentum.'}`;
}

function updateNoticedContent(scoreMap) {
    const insightContainer = document.getElementById('noticedContent');
    const insightTag = document.getElementById('insightTag');
    if (!insightContainer || !insightTag) return;

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

function generateActionPlan(scoreMap) {
    const actionPlan = [];
    const sortedScores = Object.entries(scoreMap)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3);
    
    sortedScores.forEach(([category, score]) => {
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
    
    const actionPlanContent = document.getElementById('actionPlanContent');
    if (actionPlan.length > 0) {
        actionPlanContent.innerHTML = '<ul>' + actionPlan.map(action => `<li>${action}</li>`).join('') + '</ul>';
    } else {
        actionPlanContent.innerHTML = '<p>Great job! Your scores are well-balanced. Continue maintaining your strengths across all areas.</p>';
    }
}

async function loadCompatibilityResults() {
    try {
        const response = await fetch('/api/compatibility');
        const data = await response.json();

        if (response.ok && data.compatibility_results && data.compatibility_results.length > 0) {
            displayCompatibilityResults(data.compatibility_results);
        }
    } catch (error) {
        console.error('Error loading compatibility results:', error);
    }
}

function displayCompatibilityResults(results) {
    const section = document.getElementById('compatibilitySection');
    const container = document.getElementById('compatibilityResults');
    
    section.style.display = 'block';
    container.innerHTML = '';
    
    results.forEach(result => {
        const score = parseFloat(result.compatibility_score).toFixed(1);
        const { label, message, toneClass } = getCompatibilityLabel(score);

        const card = document.createElement('div');
        card.className = 'compatibility-card';

        card.innerHTML = `
            <span class="tag ${toneClass}">${label}</span>
            <div class="compatibility-score">${score}%</div>
            <div>
                <h3>${result.other_username}</h3>
                <p class="compatibility-meta">${message}</p>
            </div>
        `;

        container.appendChild(card);
    });
}

function stampLastUpdated() {
    const label = document.getElementById('lastUpdatedLabel');
    if (label) {
        const now = new Date();
        label.textContent = `Updated ${now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
}

function clampScore(value) {
    if (isNaN(value)) return 0;
    return Math.min(100, Math.max(0, value));
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
    const score = parseFloat(scoreValue);
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



