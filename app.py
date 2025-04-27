from flask import Flask, render_template, request, jsonify
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from peft import PeftModel
import torch
import os
import time
import threading
import gc

app = Flask(__name__)

# Global variables
tokenizer = None
model = None
last_usage_time = None
model_lock = threading.Lock()
INACTIVITY_THRESHOLD = 10 * 60  # 10 minutes in seconds

# Function to load model and tokenizer
def load_model_and_tokenizer():
    global tokenizer, model, last_usage_time
    
    # Check if model files exist
    if not os.path.exists("./lora-distilbert-sentiment"):
        print("Model files not found. Please ensure the model is properly saved.")
        return False
    
    try:
        print("Loading model and tokenizer...")
        # Load tokenizer
        tokenizer = AutoTokenizer.from_pretrained("./lora-distilbert-sentiment")
        
        # Load base model and apply LoRA adapters
        base_model = AutoModelForSequenceClassification.from_pretrained("distilbert-base-uncased")
        model = PeftModel.from_pretrained(base_model, "./lora-distilbert-sentiment")
        model.eval()
        
        # Update last usage time
        last_usage_time = time.time()
        
        print("Model loaded successfully")
        return True
    except Exception as e:
        print(f"Error loading model: {e}")
        return False

# Function to unload model and free memory
def unload_model():
    global tokenizer, model, last_usage_time
    
    print("Unloading model to free memory...")
    with model_lock:
        if model is not None:
            del model
            model = None
        
        if tokenizer is not None:
            del tokenizer
            tokenizer = None
            
        # Force garbage collection
        gc.collect()
        torch.cuda.empty_cache() if torch.cuda.is_available() else None
        
        last_usage_time = None
        print("Model unloaded")

# Monitor function to check for inactivity and unload model
def monitor_model_usage():
    while True:
        time.sleep(60)  # Check every minute
        with model_lock:
            if model is not None and last_usage_time is not None:
                elapsed_time = time.time() - last_usage_time
                if elapsed_time > INACTIVITY_THRESHOLD:
                    print(f"Model inactive for {elapsed_time:.2f} seconds. Unloading...")
                    unload_model()

# Start monitoring thread
monitoring_thread = threading.Thread(target=monitor_model_usage, daemon=True)
monitoring_thread.start()

# Prediction function with lazy loading
def predict(text):
    global tokenizer, model, last_usage_time
    
    with model_lock:
        # Lazy load the model if it's not loaded
        if tokenizer is None or model is None:
            if not load_model_and_tokenizer():
                return {"error": "Model could not be loaded"}
        
        # Update the last usage time
        last_usage_time = time.time()
        
        try:
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
        except Exception as e:
            print(f"Prediction error: {e}")
            return {"error": str(e)}

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

@app.route('/healthcheck', methods=['GET'])
def healthcheck():
    return jsonify({"status": "healthy"})

# Route to explicitly unload the model
@app.route('/unload-model', methods=['POST'])
def manual_unload():
    unload_model()
    return jsonify({"status": "Model unloaded successfully"})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host="0.0.0.0", port=port, debug=False)  # Set debug=False in production