import os

from dotenv import load_dotenv
from openai import OpenAI
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel


load_dotenv()


client = OpenAI(
    api_key=os.getenv("GEMINI_API_KEY"),
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)


app = FastAPI()

app.mount(
    "/static",
    StaticFiles(directory="static"),
    name="static"
)


KNOWLEDGE = """
Ambrosia Projects is a real-estate focused business.

Help users with real-estate questions and company enquiries.

Do not invent company-specific prices, projects, addresses,
returns, availability or guarantees.

If an exact Ambrosia detail is unknown, say the team can confirm it.

CONTACT INFORMATION:

Phone: 9615151565

Email: pawartushar292003@gmail.com
"""


SYSTEM = f"""
You are the official AI assistant for Ambrosia Projects.

{KNOWLEDGE}

Always provide clear, professional and natural-sounding responses.

When a user asks for the company phone number, reply professionally:
You can contact Ambrosia Projects directly at 9615151565.

When a user asks for the company email address, reply professionally:
You can email Ambrosia Projects at pawartushar292003@gmail.com.

When a user asks for contact details, provide both the phone number
and email address clearly.

Do not use Markdown symbols such as ** or ##.

Avoid robotic, repetitive or overly casual responses.

Keep responses concise, helpful and professional.

Reply in English, Hindi or Hinglish depending on the user's language.

For Ambrosia Projects-related questions, prioritize the information
provided in the KNOWLEDGE section.

If a specific Ambrosia Projects detail is unknown, politely say that
the Ambrosia Projects team can confirm it.

Never invent property prices, addresses, project details,
investment returns or guarantees.
"""


class Chat(BaseModel):
    message: str
    history: list[dict] = []


class Lead(BaseModel):
    name: str
    phone: str
    requirement: str


@app.get("/")
def home():
    return FileResponse("static/index.html")


@app.post("/api/chat")
def chat(d: Chat):

    user_message = d.message.lower().strip()

    # Direct contact information
    if any(word in user_message for word in [
        "contact number",
        "phone number",
        "mobile number",
        "contact",
        "phone"
    ]):
        return {
            "reply": (
                "You can contact Ambrosia Projects directly "
                "on 9615151565."
            )
        }

    if any(word in user_message for word in [
        "email address",
        "email",
        "mail id",
        "email id"
    ]):
        return {
            "reply": (
                "You can email Ambrosia Projects at "
                "pawartushar292003@gmail.com."
            )
        }

    messages = [
        {
            "role": "system",
            "content": SYSTEM
        }
    ]

    for x in d.history[-6:]:

        if (
            x.get("role") in ["user", "assistant"]
            and x.get("content")
        ):
            messages.append({
                "role": x["role"],
                "content": x["content"]
            })

    messages.append({
        "role": "user",
        "content": d.message
    })

    try:

        r = client.chat.completions.create(
            model="gemini-3.6-flash",
            messages=messages,
            temperature=0.4,
            max_tokens=800
        )

        return {
            "reply": r.choices[0].message.content
        }

    except Exception as e:

        print("Chatbot Error:", e)

        return {
            "reply": (
                "Sorry, I am temporarily unable to answer. "
                "Please contact Ambrosia Projects at 9615151565 "
                "or pawartushar292003@gmail.com."
            )
        }


@app.post("/api/lead")
def lead(d: Lead):

    with open(
        "leads.txt",
        "a",
        encoding="utf-8"
    ) as f:

        f.write(
            f"Name: {d.name}\n"
            f"Phone: {d.phone}\n"
            f"Requirement: {d.requirement}\n"
            "--------------------\n"
        )

    return {
        "success": True,
        "message": "Thanks! Your enquiry has been saved."
    }


if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000
    )