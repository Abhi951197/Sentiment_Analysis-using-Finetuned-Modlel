# app.py
from flask import Flask, render_template, request, jsonify
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from peft import PeftModel
import torch
import os

app = Flask(__name__)

# Global variables for model and tokenizer
tokenizer = None
model = None

# Function to load model and tokenizer
def load_model_and_tokenizer():
    global tokenizer, model
    
    # Check if model files exist
    if not os.path.exists("./lora-distilbert-sentiment"):
        print("Model files not found. Please ensure the model is properly saved.")
        return False
    
    try:
        # Load tokenizer
        tokenizer = AutoTokenizer.from_pretrained("./lora-distilbert-sentiment")
        
        # Load base model and apply LoRA adapters
        base_model = AutoModelForSequenceClassification.from_pretrained("distilbert-base-uncased")
        model = PeftModel.from_pretrained(base_model, "./lora-distilbert-sentiment")
        model.eval()
        return True
    except Exception as e:
        print(f"Error loading model: {e}")
        return False

# Load model at startup
with app.app_context():
    load_model_and_tokenizer()

# Prediction function
def predict(text):
    global tokenizer, model
    
    # Make sure model is loaded
    if tokenizer is None or model is None:
        if not load_model_and_tokenizer():
            return {"error": "Model could not be loaded"}
    
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
    with torch.no_grad():
        outputs = model(**inputs)
    logits = outputs.logits
    predicted_class = logits.argmax(dim=1).item()
    
    # Get confidence scores
    probabilities = torch.softmax(logits, dim=1)[0].tolist()
    
    # Map prediction to sentiment
    sentiment_map = {0: "Negative", 1: "Positive"}
    result = {
        "sentiment": sentiment_map.get(predicted_class, "Unknown"),
        "confidence": round(max(probabilities) * 100, 2),
        "class": predicted_class
    }
    return result

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    if request.method == 'POST':
        text = request.form.get('text', '')
        if not text:
            return jsonify({"error": "No text provided"})
        
        try:
            result = predict(text)
            return jsonify(result)
        except Exception as e:
            return jsonify({"error": str(e)})

if __name__ == '__main__':
    app.run(debug=True)