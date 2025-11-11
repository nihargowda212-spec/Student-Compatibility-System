// Personality Test JavaScript

let questions = [];
let currentPage = 0;
const questionsPerPage = 8;
let responses = {};
let inviteCode = '';

document.addEventListener('DOMContentLoaded', async function() {
    await loadQuestions();
    setupCategoryIndicator();
    displayQuestions();
    updateProgress();
    
    document.getElementById('prevBtn').addEventListener('click', goToPreviousPage);
    document.getElementById('nextBtn').addEventListener('click', goToNextPage);
    document.getElementById('submitBtn').addEventListener('click', submitTest);
    
    const inviteInput = document.getElementById('inviteCode');
    if (inviteInput) {
        inviteInput.addEventListener('change', function() {
            inviteCode = this.value.trim();
        });
    }
});

async function loadQuestions() {
    try {
        const response = await fetch('/api/questions', {
            credentials: 'include'
        });
        const data = await response.json();
        questions = data.questions;
    } catch (error) {
        console.error('Error loading questions:', error);
        alert('Failed to load questions. Please refresh the page.');
    }
}

function setupCategoryIndicator() {
    const categories = [
        { number: 1, label: 'Mindset', range: [1, 8] },
        { number: 2, label: 'Self-Management', range: [9, 16] },
        { number: 3, label: 'Interactions', range: [17, 24] },
        { number: 4, label: 'Personality', range: [25, 32] },
        { number: 5, label: 'Resilience', range: [33, 40] }
    ];
    
    const indicator = document.getElementById('categoryIndicator');
    indicator.innerHTML = '';
    
    categories.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'category-item';
        
        const number = document.createElement('div');
        number.className = 'category-number';
        number.textContent = cat.number;
        
        const label = document.createElement('div');
        label.className = 'category-label';
        label.textContent = cat.label;
        
        item.appendChild(number);
        item.appendChild(label);
        indicator.appendChild(item);
    });
    
    updateCategoryIndicator();
}

function updateCategoryIndicator() {
    const categories = document.querySelectorAll('.category-item');
    const currentCategory = Math.floor(currentPage);
    
    categories.forEach((item, index) => {
        const number = item.querySelector('.category-number');
        const label = item.querySelector('.category-label');
        
        if (index === currentCategory) {
            number.classList.add('active');
            number.classList.remove('inactive');
            label.classList.add('active');
        } else {
            number.classList.remove('active');
            number.classList.add('inactive');
            label.classList.remove('active');
        }
    });
}

function displayQuestions() {
    const container = document.getElementById('questionContainer');
    container.innerHTML = '';
    
    const startIndex = currentPage * questionsPerPage;
    const endIndex = Math.min(startIndex + questionsPerPage, questions.length);
    
    for (let i = startIndex; i < endIndex; i++) {
        const question = questions[i];
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-item';
        
        const questionText = document.createElement('div');
        questionText.className = 'question-text';
        questionText.textContent = `${question.question_number}. ${question.question_text}`;
        
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'answer-options';
        
        const options = [
            { value: 1, label: 'Strongly Disagree' },
            { value: 2, label: 'Disagree' },
            { value: 3, label: 'Neutral' },
            { value: 4, label: 'Agree' },
            { value: 5, label: 'Strongly Agree' }
        ];
        
        options.forEach(option => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'answer-btn';
            btn.textContent = option.label;
            btn.dataset.value = option.value;
            btn.dataset.questionId = question.id;
            
            if (responses[question.id] === option.value) {
                btn.classList.add('selected');
            }
            
            btn.addEventListener('click', function() {
                // Remove selected class from all buttons in this question
                optionsDiv.querySelectorAll('.answer-btn').forEach(b => {
                    b.classList.remove('selected');
                });
                
                // Add selected class to clicked button
                btn.classList.add('selected');
                
                // Store response
                responses[question.id] = parseInt(option.value);
            });
            
            optionsDiv.appendChild(btn);
        });
        
        questionDiv.appendChild(questionText);
        questionDiv.appendChild(optionsDiv);
        container.appendChild(questionDiv);
    }
    
    updateNavigationButtons();
    updateCategoryIndicator();
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    
    prevBtn.style.display = currentPage > 0 ? 'block' : 'none';
    
    const totalPages = Math.ceil(questions.length / questionsPerPage);
    if (currentPage === totalPages - 1) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'block';
    } else {
        nextBtn.style.display = 'block';
        submitBtn.style.display = 'none';
    }
}

function updateProgress() {
    const totalQuestions = questions.length;
    const answeredQuestions = Object.keys(responses).length;
    const progress = (answeredQuestions / totalQuestions) * 100;
    
    document.getElementById('progressFill').style.width = progress + '%';
}

function goToPreviousPage() {
    if (currentPage > 0) {
        currentPage--;
        displayQuestions();
        updateProgress();
    }
}

function goToNextPage() {
    const totalPages = Math.ceil(questions.length / questionsPerPage);
    if (currentPage < totalPages - 1) {
        // Check if all questions on current page are answered
        const startIndex = currentPage * questionsPerPage;
        const endIndex = Math.min(startIndex + questionsPerPage, questions.length);
        
        let allAnswered = true;
        for (let i = startIndex; i < endIndex; i++) {
            if (!responses[questions[i].id]) {
                allAnswered = false;
                break;
            }
        }
        
        if (allAnswered) {
            currentPage++;
            displayQuestions();
            updateProgress();
        } else {
            alert('Please answer all questions on this page before proceeding.');
        }
    }
}

async function submitTest() {
    // Check if all questions are answered
    if (Object.keys(responses).length !== questions.length) {
        alert('Please answer all questions before submitting.');
        return;
    }
    
    // Convert responses to array format
    const responsesArray = Object.keys(responses).map(questionId => ({
        question_id: parseInt(questionId),
        response_value: responses[questionId]
    }));
    
    try {
        const response = await fetch('/api/submit-test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                responses: responsesArray,
                invite_code: inviteCode || null
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            window.location.href = '/results';
        } else {
            alert(data.error || 'Failed to submit test. Please try again.');
        }
    } catch (error) {
        console.error('Error submitting test:', error);
        alert('An error occurred. Please try again.');
    }
}





