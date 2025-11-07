# backend/ml/ai_context_engine.py
import os
import json
import re
import openai
from dotenv import load_dotenv
from packaging import version

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    print("⚠️ OPENAI_API_KEY missing")
openai.api_key = OPENAI_API_KEY

# Default model
DEFAULT_MODEL = "gpt-3.5-turbo"

# Check openai version
OPENAI_VERSION = getattr(openai, "__version__", "0.0.0")
USE_NEW_API = version.parse(OPENAI_VERSION) >= version.parse("1.0.0")

def ask_openai(prompt: str, max_tokens: int = 800, model: str = DEFAULT_MODEL):
    """
    Call OpenAI GPT model to return JSON response.
    Supports both old (<1.0) and new (>=1.0) openai packages.
    """
    if not OPENAI_API_KEY:
        return {"error": "no_api_key", "text": "OpenAI API key missing."}

    # Truncate long prompts
    if len(prompt) > 8000:
        prompt = prompt[:7800] + "\n\n[TRUNCATED CONTEXT]"

    system_instruction = (
        "You are an expert construction risk analyst. "
        "Respond ONLY with valid JSON (single object) with keys: "
        "risk_level (High/Medium/Low), reasoning (string, 1-3 sentences), "
        "recommendations (array of 3-6 actionable steps), confidence (0.0-1.0). "
        "Do NOT include any extra text outside JSON."
    )

    try:
        if USE_NEW_API:
            # New OpenAI API >=1.0
            response = openai.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,
                temperature=0.2
            )
            txt = response.choices[0].message.content.strip()
        else:
            # Old OpenAI API <1.0
            response = openai.ChatCompletion.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,
                temperature=0.2
            )
            txt = response.choices[0].message.content.strip()

        # Try to parse JSON
        try:
            return json.loads(txt)
        except Exception:
            m = re.search(r'\{.*\}', txt, re.S)
            if m:
                return json.loads(m.group(0))
            return {"text": txt}

    except openai.error.InvalidRequestError as e:
        print("⚠️ OpenAI API error:", e)
        return {"error": str(e), "text": "Check API key or model access."}
    except Exception as e:
        print("⚠️ OpenAI API unexpected error:", e)
        return {"error": str(e)}
