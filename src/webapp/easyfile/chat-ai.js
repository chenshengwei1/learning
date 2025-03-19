class ChatWithAI{
    constructor(){
        this.id='ChatAO';
        this.name="ChatWithAI";
        this.title = this.name;
    }

    create(){
        let body = `
        <div class="chatai">
            <div id="chat-box"></div>
            <input type="text" id="user-input" placeholder="Type your message here...">
            <button id="send-btn">Send</button>
        </div>
        `;
        $('#part-'+this.id).html(body);
        this.addLisenter();
    }

    addLisenter(){
        document.getElementById('send-btn').addEventListener('click', this.sendMessage);
    }

    sendMessage() {
        const userInput = document.getElementById('user-input').value;
        if (userInput.trim() === '') return;

        // Display user message in chat box
        const chatBox = document.getElementById('chat-box');
        chatBox.innerHTML += `<div><strong>You:</strong> ${userInput}</div>`;

        // Clear input field
        document.getElementById('user-input').value = '';

        // Send message to Node.js server
        fetch('/chatwithdeepseek', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: userInput })
        })
        .then(response => response.json())
        .then(data => {
            // Display DeepSeek's response in chat box
            chatBox.innerHTML += `<div><strong>DeepSeek:</strong> ${data.response}</div>`;
            chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to bottom
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }
    
}