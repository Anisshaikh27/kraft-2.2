import google.genai as genai
import os
from dotenv import load_dotenv

# Load from backend/.env
load_dotenv("backend/.env")

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("Error: GEMINI_API_KEY not set in backend/.env file")
    exit(1)

client = genai.Client(api_key=api_key)

# Test gemini-3.1-pro-preview for React code generation
model_name = "gemini-3.1-pro-preview"
print(f"Testing model: {model_name}")
print("=" * 60)

prompt = """Generate a simple React component called Button with TypeScript types. 
Include props for label, onClick, and disabled state. Use Tailwind CSS for styling.
Return only the component code."""

try:
    response = client.models.generate_content(
        model=model_name,
        contents=prompt
    )
    print("SUCCESS! Generated Component:\n")
    print(response.text)
except Exception as e:
    print(f"FAILED with error: {e}")
