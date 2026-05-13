from flask import Flask, render_template, request, jsonify
import json
import os
from datetime import datetime

app = Flask(__name__)
DATA_FILE = "blood_donors.json"

def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    return {"donors": [], "history": []}

def save_data(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/register", methods=["POST"])
def register_donor():
    data = load_data()
    body = request.json
    name = body.get("name", "").strip()
    phone = body.get("phone", "").strip()
    city = body.get("city", "").strip()
    age = body.get("age", "").strip()

    if not name or not phone or not city:
        return jsonify({"success": False, "message": "Name, Phone and City are required."}), 400
    if not age.isdigit():
        return jsonify({"success": False, "message": "Age must be a valid number."}), 400

    donor = {
        "name": name,
        "age": age,
        "phone": phone,
        "city": city,
        "blood_group": body.get("blood_group", "A+"),
        "last_donated": body.get("last_donated", "Never"),
        "available": body.get("available", True),
        "registered": datetime.now().strftime("%Y-%m-%d %H:%M")
    }
    data["donors"].append(donor)
    save_data(data)
    return jsonify({"success": True, "message": f"Donor '{name}' registered successfully!"})

@app.route("/api/search", methods=["GET"])
def search_donors():
    data = load_data()
    bg = request.args.get("blood_group", "All")
    city = request.args.get("city", "").strip().lower()
    results = []
    for d in data["donors"]:
        if bg != "All" and d["blood_group"] != bg:
            continue
        if city and city not in d["city"].lower():
            continue
        results.append(d)
    return jsonify({"donors": results})

@app.route("/api/mark_donation", methods=["POST"])
def mark_donation():
    data = load_data()
    body = request.json
    name = body.get("name")
    phone = body.get("phone")
    today = datetime.now().strftime("%Y-%m-%d")
    updated = False
    for d in data["donors"]:
        if d["name"] == name and d["phone"] == str(phone):
            d["last_donated"] = today
            data["history"].append({
                "donor": name,
                "blood_group": d["blood_group"],
                "city": d["city"],
                "date": today,
                "type": "Donation"
            })
            updated = True
    if updated:
        save_data(data)
        return jsonify({"success": True, "message": f"Donation recorded for {name} on {today}."})
    return jsonify({"success": False, "message": "Donor not found."}), 404

@app.route("/api/emergency", methods=["POST"])
def emergency_request():
    data = load_data()
    body = request.json
    bg = body.get("blood_group", "A+")
    city = body.get("city", "").strip().lower()
    matches = [
        d for d in data["donors"]
        if d["blood_group"] == bg and d.get("available")
        and (not city or city in d["city"].lower())
    ]
    data["history"].append({
        "donor": "—",
        "blood_group": bg,
        "city": body.get("city", ""),
        "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "type": f"Emergency Request by {body.get('patient_name', 'Unknown')}"
    })
    save_data(data)
    return jsonify({"donors": matches, "count": len(matches)})

@app.route("/api/history", methods=["GET"])
def get_history():
    data = load_data()
    return jsonify({"history": list(reversed(data["history"]))})

@app.route("/api/history/clear", methods=["DELETE"])
def clear_history():
    data = load_data()
    data["history"] = []
    save_data(data)
    return jsonify({"success": True})

if __name__ == "__main__":
    app.run(debug=True)
