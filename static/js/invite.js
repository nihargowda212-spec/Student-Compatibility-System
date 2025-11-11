// Invite Code Generation JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const generateBtn = document.getElementById('generateBtn');
    const copyBtn = document.getElementById('copyBtn');
    const inviteCodeDisplay = document.getElementById('inviteCodeDisplay');
    const whatsappBtn = document.getElementById('whatsappBtn');
    let currentInviteCode = '';

    generateBtn.addEventListener('click', async function() {
        try {
            const response = await fetch('/api/generate-invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                currentInviteCode = data.invite_code;
                inviteCodeDisplay.innerHTML = `
                    <p style="margin-bottom: 10px; color: #475569;">Your Invite Code:</p>
                    <div style="font-size: 2em; font-weight: bold; letter-spacing: 8px; color: #667eea;">
                        ${currentInviteCode}
                    </div>
                    <p style="margin-top: 10px; color: #64748b; font-size: 0.9em;">
                        Share this code with a friend to compare your compatibility!
                    </p>
                `;
                copyBtn.style.display = 'block';
                if (whatsappBtn) {
                    whatsappBtn.style.display = 'block';
                }
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

    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', function() {
            if (!currentInviteCode) {
                alert('Generate an invite code first.');
                return;
            }
            const baseUrl = window.location.origin;
            const message = `Join me on StudentMatch! Register and enter invite code ${currentInviteCode} so we can compare our personality profiles. ${baseUrl}`;
            const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
        });
    }
});





