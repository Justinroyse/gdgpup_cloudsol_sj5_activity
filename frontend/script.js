document.addEventListener('DOMContentLoaded', () => {
    // IMPORTANT: Update this URL after deploying the Cloud Run API
    // If testing locally (assuming Node is running on port 8080), use http://localhost:8080
    const API_URL = 'http://localhost:8080/api/buy'; 

    const buyButton = document.getElementById('buyButton');
    const btnText = document.querySelector('.btn-text');
    const btnLoader = document.getElementById('btnLoader');
    const statusMessage = document.getElementById('statusMessage');

    buyButton.addEventListener('click', async () => {
        // UI: Set Loading State
        buyButton.disabled = true;
        btnText.classList.add('hidden');
        btnLoader.classList.remove('hidden');
        statusMessage.classList.remove('show');

        try {
            // Initiate purchase request
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            // UI: Handle Response
            statusMessage.classList.remove('hidden', 'msg-success', 'msg-error');
            
            if (response.ok && data.success) {
                statusMessage.textContent = 'SECURED! ' + data.message;
                statusMessage.classList.add('show', 'msg-success');
                buyButton.disabled = true; // Prevent multiple buys from same client
                
                // Update Badge visually (optional since it's a flash sale, exact count could be hidden)
                buyButton.style.background = 'var(--gdg-green)';
                btnText.textContent = 'SECURED';
                btnText.classList.remove('hidden');
                btnLoader.classList.add('hidden');
            } else {
                // Either sold out or other error
                statusMessage.textContent = data.message || 'Error occurred';
                statusMessage.classList.add('show', 'msg-error');
                
                if (response.status === 400) {
                    // Sold Out
                    buyButton.disabled = true;
                    btnText.textContent = 'SOLD OUT';
                    btnText.classList.remove('hidden');
                    btnLoader.classList.add('hidden');
                    
                    // Update header badge
                    document.querySelector('.live-dot').style.backgroundColor = 'var(--gdg-red)';
                    document.querySelector('.stock-badge').style.color = 'var(--gdg-red)';
                    document.querySelector('.stock-badge').innerHTML = '<span class="live-dot" style="background-color: var(--gdg-red); animation: none; box-shadow: 0 0 10px var(--gdg-red);"></span> DROP ENDED';
                } else {
                    // General error, allow retry
                    buyButton.disabled = false;
                    btnText.classList.remove('hidden');
                    btnLoader.classList.add('hidden');
                }
            }

        } catch (error) {
            console.error('Fetch error:', error);
            statusMessage.textContent = 'Network error. Try again.';
            statusMessage.classList.remove('hidden', 'msg-success');
            statusMessage.classList.add('show', 'msg-error');
            
            // Allow retry
            buyButton.disabled = false;
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
        }
    });
});
