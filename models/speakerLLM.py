from ollama import Client
# Initialize the client to connect to the Ollama server running on localhost
client = Client(host='http://localhost:11434')
model_name = 'llama3.2:3b'  

def speakUp(context,message):
    messages = [
        {
            'role':'system',
            'content':context
        },
        {
            'role': 'user',
            'content': message,
        },
    ]
    response = client.chat(model=model_name, messages=messages)
    return response.get('message', {}).get('content', '')

# res = speakUp("YOU ARE A QUALITY JSON PROVIDER, STRICTLY PROVIDE THE JSON ONLY, NO DECORATION","PROVIDE A JSON SHOWING A=5 and B=4")

