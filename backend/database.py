# backend/test_watsonx.py
import os
from dotenv import load_dotenv, find_dotenv
from ibm_watsonx_ai.client import Credentials
from ibm_watsonx_ai.foundation_models import ModelInference

# Load root .env
env_path = find_dotenv(filename=".env", usecwd=True)
load_dotenv(env_path, override=True)

print("Using URL:", os.getenv("WATSONX_URL"))
print("Project:", os.getenv("WATSONX_PROJECT_ID"))
print("Model:", os.getenv("WATSONX_MODEL_ID"))

creds = Credentials(
    url=os.getenv("WATSONX_URL"),
    api_key=os.getenv("WATSONX_API_KEY"),
)

model = ModelInference(
    model_id=os.getenv("WATSONX_MODEL_ID", "ibm/granite-13b-instruct-v2"),
    credentials=creds,
    project_id=os.getenv("WATSONX_PROJECT_ID"),
    params={
        "decoding_method": os.getenv("WATSONX_DECODING_METHOD", "greedy"),
        "max_new_tokens": int(os.getenv("WATSONX_MAX_NEW_TOKENS", "128")),
        "temperature": float(os.getenv("WATSONX_TEMPERATURE", "0.2")),
    },
)

res = model.generate(prompt="Say 'hello from watsonx (participant AI test)'. Then list two bullet points for safer community access supports.")
print(res)
