from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.config["CORS_HEADERS"] = "Content-Type"

salary_model = pickle.load(open("model.pkl", "rb"))
attrition_model = pickle.load(open("attrition_model.pkl", "rb"))

@app.route("/predict", methods=["POST"])
def predict_salary():
    data = request.get_json()

    features = np.array([[
        float(data.get("experience_years", 0)),
        float(data.get("performance_rating", 0)),
        float(data.get("projects_handled", 0)),
        float(data.get("total_tasks_completed", 0)),
        float(data.get("unpaid_leaves", 0)),
        float(data.get("late_login_count", 0)),
    ]])

    prediction = salary_model.predict(features)[0]

    return jsonify({
        "predicted_salary": round(float(prediction), 2)
    })


@app.route("/predict-attrition", methods=["POST"])
def predict_attrition():
    data = request.get_json()

    try:
        age = float(data.get("age", 30))
        experience_years = float(data.get("experience_years", 3))
        total_tasks_completed = float(data.get("total_tasks_completed", 100))
        performance_rating = float(data.get("performance_rating", 7))
        unpaid_leaves = float(data.get("unpaid_leaves", 2))
        overtime_hours = float(data.get("overtime_hours", 10))
        late_login_count = float(data.get("late_login_count", 3))
        job_satisfaction = float(data.get("job_satisfaction", 3))
        work_life_balance = float(data.get("work_life_balance", 3))
        team_engagement_score = float(data.get("team_engagement_score", 75))

        risk_score = 0

        risk_score += (5 - job_satisfaction) * 8
        risk_score += (5 - work_life_balance) * 8
        risk_score += min(overtime_hours, 60) * 0.35
        risk_score += min(unpaid_leaves, 10) * 2.5
        risk_score += min(late_login_count, 15) * 1.5
        risk_score += max(0, 6 - performance_rating) * 4
        risk_score += max(0, 5 - experience_years) * 2
        risk_score += max(0, 70 - team_engagement_score) * 0.4

        if job_satisfaction <= 2:
            risk_score += 8
        if work_life_balance <= 2:
            risk_score += 8
        if overtime_hours > 45:
            risk_score += 6
        if unpaid_leaves > 6:
            risk_score += 5
        if late_login_count > 10:
            risk_score += 5
        if performance_rating <= 3:
            risk_score += 6
        if experience_years < 2:
            risk_score += 4

        final_risk = round(max(8, min(85, risk_score)), 2)

        return jsonify({"attrition_risk": final_risk})

    except Exception as e:
        print("ERROR:", e)
        return jsonify({"attrition_risk": 0})


if __name__ == "__main__":
    app.run(debug=True)