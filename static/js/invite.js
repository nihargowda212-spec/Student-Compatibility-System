// Invite Code Generation JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const generateBtn = document.getElementById('generateBtn');
    const copyBtn = document.getElementById('copyBtn');
    const inviteCodeDisplay = document.getElementById('inviteCodeDisplay');
    let currentInviteCode = '';

    generateBtn.addEventListener('click', async function() {
        try {
            const response = await fetch('/api/generate-invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                currentInviteCode = data.invite_code;
                inviteCodeDisplay.innerHTML = `
                    <p style="margin-bottom: 10px; color: #b0b0b0;">Your Invite Code:</p>
                    <div style="font-size: 2em; font-weight: bold; letter-spacing: 8px; color: #667eea;">
                        ${currentInviteCode}
                    </div>
                    <p style="margin-top: 10px; color: #b0b0b0; font-size: 0.9em;">
                        Share this code with a friend to compare your compatibility!
                    </p>
                `;
                copyBtn.style.display = 'block';
            } else {
                alert(data.error || 'Failed to generate invite code.');
            }
        } catch (error) {
            console.error('Error generating invite:', error);
            alert('An error occurred. Please try again.');
        }
    });

    copyBtn.addEventListener('click', function() {
        if (currentInviteCode) {
            navigator.clipboard.writeText(currentInviteCode).then(function() {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = 'Copied!';
                copyBtn.style.background = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
                
                setTimeout(function() {
                    copyBtn.textContent = originalText;
                    copyBtn.style.background = '';
                }, 2000);
            }).catch(function(err) {
                console.error('Failed to copy:', err);
                alert('Failed to copy invite code. Please copy it manually.');
            });
        }
    });
});




