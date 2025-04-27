// static/js/script.js
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const analyzeForm = document.getElementById('analyze-form');
    const textInput = document.getElementById('text-input');
    const clearBtn = document.getElementById('clear-btn');
    const analyzeBtn = document.getElementById('analyze-btn');
    const resultContainer = document.getElementById('result-container');
    const sentimentValue = document.getElementById('sentiment-value');
    const confidenceValue = document.getElementById('confidence-value');
    const confidenceMeter = document.getElementById('confidence-meter');
    const moodIcon = document.getElementById('mood-icon');
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const exampleBtns = document.querySelectorAll('.example-btn');
    
    // Remove pulse animation after initial page load
    setTimeout(() => {
        analyzeBtn.classList.remove('pulse');
    }, 3000);

    // Add event listeners
    analyzeForm.addEventListener('submit', handleAnalysis);
    clearBtn.addEventListener('click', clearForm);
    textInput.addEventListener('input', checkInputLength);
    
    exampleBtns.forEach(btn => {
        btn.addEventListener('click', fillExampleText);
        
        // Add hover animation for example buttons
        btn.addEventListener('mouseenter', function() {
            this.querySelector('i').classList.add('fa-bounce');
        });
        
        btn.addEventListener('mouseleave', function() {
            this.querySelector('i').classList.remove('fa-bounce');
        });
    });

    // Check input length to style textarea
    function checkInputLength() {
        if (textInput.value.length > 0) {
            textInput.classList.add('has-content');
        } else {
            textInput.classList.remove('has-content');
        }
    }

    // Handle form submission
    function handleAnalysis(e) {
        e.preventDefault();
        const text = textInput.value.trim();
        
        if (!text) {
            showError('Please enter some text to analyze');
            shakeElement(textInput);
            return;
        }
        
        // Disable buttons during analysis
        setButtonsState(false);
        
        hideError();
        showLoading();
        hideResult();
        
        // Send data to server
        const formData = new FormData();
        formData.append('text', text);
        
        fetch('/analyze', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            // Make sure to hide the loading indicator
            hideLoading();
            
            if (data.error) {
                showError(data.error);
                return;
            }
            
            displayResult(data);
        })
        .catch(error => {
            // Make sure to hide the loading indicator
            hideLoading();
            showError('An error occurred. Please try again.');
            console.error('Error:', error);
        })
        .finally(() => {
            // Re-enable buttons and hide loading
            setButtonsState(true);
            hideLoading(); // Extra safety to ensure loading is hidden
        });
    }

    // Enable/disable buttons
    function setButtonsState(enabled) {
        analyzeBtn.disabled = !enabled;
        clearBtn.disabled = !enabled;
        textInput.disabled = !enabled;
        
        if (!enabled) {
            analyzeBtn.classList.add('disabled');
            clearBtn.classList.add('disabled');
        } else {
            analyzeBtn.classList.remove('disabled');
            clearBtn.classList.remove('disabled');
        }
    }

    // Display analysis result with animation
    function displayResult(data) {
        // Set sentiment and confidence
        sentimentValue.textContent = data.sentiment;
        confidenceValue.textContent = `${data.confidence}%`;
        
        // Reset previous classes
        resultContainer.classList.remove('positive-bg', 'negative-bg');
        
        // Update confidence meter with delay for animation
        setTimeout(() => {
            confidenceMeter.style.width = `${data.confidence}%`;
        }, 100);
        
        // Set colors and icons based on sentiment
        if (data.sentiment === 'Positive') {
            sentimentValue.style.color = 'var(--positive-color)';
            confidenceMeter.style.backgroundColor = 'var(--positive-color)';
            moodIcon.className = 'fas fa-grin-beam';
            moodIcon.style.color = 'var(--positive-color)';
            resultContainer.classList.add('positive-bg');
        } else if (data.sentiment === 'Negative') {
            sentimentValue.style.color = 'var(--negative-color)';
            confidenceMeter.style.backgroundColor = 'var(--negative-color)';
            moodIcon.className = 'fas fa-sad-tear';
            moodIcon.style.color = 'var(--negative-color)';
            resultContainer.classList.add('negative-bg');
        } else {
            sentimentValue.style.color = 'var(--neutral-color)';
            confidenceMeter.style.backgroundColor = 'var(--neutral-color)';
            moodIcon.className = 'fas fa-meh';
            moodIcon.style.color = 'var(--neutral-color)';
        }
        
        // Ensure loading is hidden before showing result
        hideLoading();
        
        // Show result with animation
        showResult();
        
        // Animate the mood icon
        setTimeout(() => {
            moodIcon.classList.add('fa-beat');
            setTimeout(() => moodIcon.classList.remove('fa-beat'), 1000);
        }, 300);
        
        // Scroll to result if needed
        if (window.innerWidth < 768) {
            resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // Fill textarea with example text with typing effect
    function fillExampleText() {
        const exampleText = this.getAttribute('data-text');
        textInput.value = '';
        textInput.focus();
        
        // Simple typing effect
        let i = 0;
        const typeInterval = setInterval(() => {
            if (i < exampleText.length) {
                textInput.value += exampleText.charAt(i);
                i++;
            } else {
                clearInterval(typeInterval);
                checkInputLength();
            }
        }, 15);
    }

    // Clear the form
    function clearForm() {
        textInput.value = '';
        checkInputLength();
        hideResult();
        hideError();
        hideLoading(); // Make sure to hide loading when clearing
        textInput.focus();
        
        // Add subtle animation to clear button
        clearBtn.classList.add('fa-spin');
        setTimeout(() => clearBtn.classList.remove('fa-spin'), 300);
    }

    // Shake element animation for validation errors
    function shakeElement(element) {
        element.classList.add('shake');
        setTimeout(() => element.classList.remove('shake'), 500);
    }

    // Show/hide functions with improved reliability
    function showResult() {
        resultContainer.classList.remove('hidden');
        // Add slide down animation
        resultContainer.style.opacity = '0';
        resultContainer.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            resultContainer.style.opacity = '1';
            resultContainer.style.transform = 'translateY(0)';
        }, 10);
    }

    function hideResult() {
        resultContainer.classList.add('hidden');
    }

    function showLoading() {
        loading.classList.remove('hidden');
    }

    function hideLoading() {
        // Force style to ensure it's hidden
        loading.classList.add('hidden');
        loading.style.display = 'none';
        
        // Reset after a short delay
        setTimeout(() => {
            loading.style.display = '';
        }, 100);
    }

    function showError(message) {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
        
        // Add shake animation
        setTimeout(() => {
            errorMessage.classList.add('shake');
            setTimeout(() => errorMessage.classList.remove('shake'), 500);
        }, 10);
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }
    
    // Add additional animation classes to CSS
    const style = document.createElement('style');
    style.textContent = `
        .shake {
            animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
        
        @keyframes shake {
            10%, 90% { transform: translateX(-1px); }
            20%, 80% { transform: translateX(2px); }
            30%, 50%, 70% { transform: translateX(-3px); }
            40%, 60% { transform: translateX(3px); }
        }
        
        .disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }
        
        .has-content {
            border-color: var(--primary-color);
        }
        
        .fa-bounce {
            animation: bounce 0.6s ease infinite;
        }
        
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }
        
        /* Ensure loading is properly hidden */
        #loading.hidden {
            display: none !important;
        }
    `;
    document.head.appendChild(style);
    
    // Safety check - ensure loading is hidden on page load
    hideLoading();
});