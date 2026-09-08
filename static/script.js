const $ = id => document.getElementById(id);


/* =========================
   CHAT HISTORY
========================= */

const hist = JSON.parse(
    localStorage.getItem("ambrosiaChatHistory")
) || [];

function saveChatHistory() {
    localStorage.setItem(
        "ambrosiaChatHistory",
        JSON.stringify(hist)
    );
}


/* =========================
   ADD MESSAGE
========================= */

function add(text, type) {
    const messages = $("messages");

    if (!messages) return;

    const message = document.createElement("div");

    message.className = "msg " + type;
    message.textContent = text;

    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
}


/* =========================
   TYPEWRITER EFFECT
========================= */

function typeReply(text) {
    const messages = $("messages");

    if (!messages) return;

    const message = document.createElement("div");

    message.className = "msg bot";

    messages.appendChild(message);

    let i = 0;

    const typing = setInterval(() => {
        message.textContent += text.charAt(i);

        i++;

        messages.scrollTop = messages.scrollHeight;

        if (i >= text.length) {
            clearInterval(typing);
        }

    }, 15);
}


/* =========================
   LOAD CHAT HISTORY
========================= */

function loadChatHistory() {
    const messages = $("messages");

    if (!messages) return;

    if (hist.length === 0) return;

    messages.innerHTML = "";

    hist.forEach(message => {

        if (message.role === "user") {
            add(message.content, "user");
        }

        if (message.role === "assistant") {
            add(message.content, "bot");
        }

    });
}

loadChatHistory();


/* =========================
   TYPING INDICATOR
========================= */

function showTyping() {
    const messages = $("messages");

    if (!messages) return;

    removeTyping();

    const typing = document.createElement("div");

    typing.className = "msg bot typing";
    typing.id = "typing";

    typing.innerHTML = `
        <span></span>
        <span></span>
        <span></span>
    `;

    messages.appendChild(typing);

    messages.scrollTop = messages.scrollHeight;
}

function removeTyping() {
    const typing = $("typing");

    if (typing) {
        typing.remove();
    }
}


/* =========================
   OPEN / CLOSE CHATBOT
========================= */

function openChat() {
    const box = $("box");

    if (!box) return;

    box.classList.remove("hidden");

    setTimeout(() => {
        if ($("input")) {
            $("input").focus();
        }
    }, 100);
}

function closeChat() {
    const box = $("box");

    if (box) {
        box.classList.add("hidden");
    }
}


/* =========================
   FLOATING CHAT BUTTON
========================= */

if ($("toggle")) {

    $("toggle").addEventListener("click", () => {

        const box = $("box");

        if (!box) return;

        if (box.classList.contains("hidden")) {
            openChat();
        } else {
            closeChat();
        }

    });

}


/* =========================
   CLOSE BUTTON
========================= */

if ($("close")) {

    $("close").addEventListener(
        "click",
        closeChat
    );

}


/* =========================
   LANDING PAGE CHAT BUTTONS
========================= */

/*
Add these IDs in HTML where needed:

id="open-chat"
id="open-chat-card"
id="contact-chat"
*/

const chatButtons = [
    "open-chat",
    "open-chat-card",
    "contact-chat"
];

chatButtons.forEach(id => {

    const button = $(id);

    if (button) {

        button.addEventListener(
            "click",
            openChat
        );

    }

});


/* =========================
   CLEAR CHAT
========================= */

if ($("clear")) {

    $("clear").addEventListener(
        "click",
        () => {

            hist.length = 0;

            localStorage.removeItem(
                "ambrosiaChatHistory"
            );

            const messages = $("messages");

            if (messages) {

                messages.innerHTML = `
                    <div class="msg bot">
                        Hi! 👋 Ask me about real estate or Ambrosia Projects.
                    </div>
                `;

            }

        }
    );

}


/* =========================
   SEND MESSAGE
========================= */

async function send(text) {

    if (!text || !text.trim()) return;

    text = text.trim();

    const input = $("input");
    const form = $("form");

    const sendButton = form
        ? form.querySelector(
            'button[type="submit"]'
        )
        : null;

    const mic = $("mic");

    const previousHistory = [...hist];

    add(text, "user");

    hist.push({
        role: "user",
        content: text
    });

    saveChatHistory();

    if (input) {
        input.value = "";
        input.disabled = true;
    }

    if (sendButton) {
        sendButton.disabled = true;
    }

    if (mic) {
        mic.disabled = true;
    }

    showTyping();

    try {

        const response = await fetch(
            "/api/chat",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    message: text,
                    history: previousHistory
                })
            }
        );

        if (!response.ok) {
            throw new Error(
                "Server response failed"
            );
        }

        const data = await response.json();

        removeTyping();

        const reply =
            data.reply ||
            "Sorry, I could not generate a response.";

        typeReply(reply);

        hist.push({
            role: "assistant",
            content: reply
        });

        saveChatHistory();

    } catch (error) {

        console.error(
            "Chat Error:",
            error
        );

        removeTyping();

        add(
            "Server connection failed. Please try again.",
            "bot"
        );

    } finally {

        if (input) {
            input.disabled = false;
            input.focus();
        }

        if (sendButton) {
            sendButton.disabled = false;
        }

        if (mic) {
            mic.disabled = false;
        }

    }

}


/* =========================
   VOICE INPUT
========================= */

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


if (
    SpeechRecognition &&
    $("mic")
) {

    const recognition =
        new SpeechRecognition();

    recognition.lang = "en-IN";

    recognition.continuous = false;

    recognition.interimResults = false;


    let isListening = false;
    let hasSentVoiceMessage = false;


    $("mic").addEventListener(
        "click",
        () => {

            if (isListening) {

                recognition.stop();

                return;
            }

            hasSentVoiceMessage = false;

            try {

                recognition.start();

            } catch (error) {

                console.log(
                    "Voice recognition already active"
                );

            }

        }
    );


    recognition.onstart = () => {

        isListening = true;

        if ($("mic")) {
            $("mic").textContent = "🔴";
        }

        if ($("input")) {
            $("input").placeholder =
                "Listening...";
        }

    };


    recognition.onresult = event => {

        if (hasSentVoiceMessage) return;

        const result =
            event.results[event.resultIndex];

        if (!result) return;

        const voiceText =
            result[0].transcript.trim();

        if (!voiceText) return;

        hasSentVoiceMessage = true;

        if ($("input")) {
            $("input").value = voiceText;
        }

        /*
           Automatically send
           the voice message
        */

        recognition.stop();

        send(voiceText);

    };


    recognition.onerror = event => {

        console.log(
            "Voice recognition error:",
            event.error
        );

        if (
            event.error === "not-allowed"
        ) {

            add(
                "Microphone permission is required for voice input.",
                "bot"
            );

        }

    };


    recognition.onend = () => {

        isListening = false;

        if (
            $("mic") &&
            !$("mic").disabled
        ) {

            $("mic").textContent = "🎤";

        }

        if ($("input")) {

            $("input").placeholder =
                "Type your message...";

        }

    };

}


/* =========================
   FORM SUBMIT
========================= */

if ($("form")) {

    $("form").addEventListener(
        "submit",
        event => {

            event.preventDefault();

            if ($("input")) {
                send($("input").value);
            }

        }
    );

}


/* =========================
   QUICK REPLY BUTTONS
========================= */

document
    .querySelectorAll("[data-q]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                send(
                    button.dataset.q
                );

            }
        );

    });


/* =========================
   LEAD MODAL
========================= */

function openLeadModal() {

    const modal = $("modal");

    if (modal) {
        modal.classList.remove("hidden");
    }

}

function closeLeadModal() {

    const modal = $("modal");

    if (modal) {
        modal.classList.add("hidden");
    }

}


/* Chatbot lead button */

if ($("lead")) {

    $("lead").addEventListener(
        "click",
        openLeadModal
    );

}


/* Landing page contact button */

if ($("contact-team")) {

    $("contact-team").addEventListener(
        "click",
        openLeadModal
    );

}


/* Modal close */

if ($("x")) {

    $("x").addEventListener(
        "click",
        closeLeadModal
    );

}


/* =========================
   LEAD FORM
========================= */

if ($("leadform")) {

    $("leadform").addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const form = event.target;

            const submitButton =
                form.querySelector("button");

            const status = $("status");

            const body = {
                name: $("name")
                    ? $("name").value
                    : "",

                phone: $("phone")
                    ? $("phone").value
                    : "",

                requirement: $("req")
                    ? $("req").value
                    : ""
            };

            if (submitButton) {

                submitButton.disabled = true;

                submitButton.textContent =
                    "Submitting...";

            }

            try {

                const response =
                    await fetch(
                        "/api/lead",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify(
                                body
                            )
                        }
                    );

                const data =
                    await response.json();


                if (data.success) {

                    if (status) {

                        status.textContent =
                            "✓ Thank you! Our team will contact you shortly.";

                        status.className =
                            "success-message";

                    }

                    form.reset();


                    setTimeout(() => {

                        closeLeadModal();

                        if (status) {

                            status.textContent = "";

                            status.className = "";

                        }

                    }, 2500);


                } else {

                    if (status) {

                        status.textContent =
                            data.message ||
                            "Something went wrong. Please try again.";

                        status.className =
                            "error-message";

                    }

                }


            } catch (error) {

                console.error(
                    "Lead form error:",
                    error
                );

                if (status) {

                    status.textContent =
                        "Server connection failed. Please try again.";

                    status.className =
                        "error-message";

                }

            } finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        "Submit enquiry";

                }

            }

        }
    );

}
