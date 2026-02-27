import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI()

try:
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "user", "content": "Hello! Just testing my API key."}
        ]
    )
    print("SUCCESS!")
    print(completion.choices[0].message.content)
except Exception as e:
    print("ERROR:")
    print(str(e))
