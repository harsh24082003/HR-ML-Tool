from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np

app = Flask(__name__)
CORS(app, supports_credentials=True)

salary_model = pickle.load(open("model.pkl", "rb"))

# Try both possible filenames for the attrition model
attrition_model = None
for fname in ("attrition_model.pkl", "attritionmodel.pkl"):
    try:
        attrition_model = pickle.load(open(fname, "rb"))
        print(f"Loaded attrition model from {fname}")
        break
    except FileNotFoundError:
        pass

if attrition_model is None:
    print("Warning: No attrition model found. Using rule-based scoring only.")


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "models": ["salary", "attrition-ml" if attrition_model else "attrition-rule-based"],
    })


@app.route("/predict", methods=["POST"])
def predict_salary():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"predicted_salary": 0}), 400
    try:
        features = np.array([[
            float(data.get("experience_years", 0)),
            float(data.get("performance_rating", 0)),
            float(data.get("projects_handled", 0)),
            float(data.get("total_tasks_completed", 0)),
            float(data.get("unpaid_leaves", 0)),
            float(data.get("late_login_count", 0)),
        ]])
        prediction = salary_model.predict(features)[0]
        return jsonify({"predicted_salary": round(float(prediction), 2)})
    except Exception as e:
        print("Salary prediction error:", e)
        return jsonify({"predicted_salary": 0}), 500


@app.route("/predict-attrition", methods=["POST"])
def predict_attrition():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"attrition_risk": 0, "attrition_factors": {}}), 400
    try:
        age                   = float(data.get("age", 30))
        experience_years      = float(data.get("experience_years", 3))
        total_tasks_completed = float(data.get("total_tasks_completed", 100))
        performance_rating    = float(data.get("performance_rating", 7))
        unpaid_leaves         = float(data.get("unpaid_leaves", 2))
        overtime_hours        = float(data.get("overtime_hours", 10))
        late_login_count      = float(data.get("late_login_count", 3))
        job_satisfaction      = float(data.get("job_satisfaction", 3))
        work_life_balance     = float(data.get("work_life_balance", 3))
        team_engagement_score = float(data.get("team_engagement_score", 75))

        # Individual factor contributions (used for breakdown display)
        factors = {
            "job_satisfaction":   round(max(0, (5 - job_satisfaction)) * 8, 1),
            "work_life_balance":  round(max(0, (5 - work_life_balance)) * 8, 1),
            "overtime_hours":     round(min(overtime_hours, 60) * 0.35, 1),
            "unpaid_leaves":      round(min(unpaid_leaves, 10) * 2.5, 1),
            "late_login_count":   round(min(late_login_count, 15) * 1.5, 1),
            "performance_rating": round(max(0, 6 - performance_rating) * 4, 1),
            "experience":         round(max(0, 5 - experience_years) * 2, 1),
            "team_engagement":    round(max(0, 70 - team_engagement_score) * 0.4, 1),
        }

        rule_score = sum(factors.values())
        # Threshold bonuses
        if job_satisfaction <= 2:    rule_score += 8
        if work_life_balance <= 2:   rule_score += 8
        if overtime_hours > 45:      rule_score += 6
        if unpaid_leaves > 6:        rule_score += 5
        if late_login_count > 10:    rule_score += 5
        if performance_rating <= 3:  rule_score += 6
        if experience_years < 2:     rule_score += 4

        # Use ML model (predict_proba) if available, blended with rule-based
        if attrition_model is not None:
            try:
                feat_ml = np.array([[
                    age, experience_years, total_tasks_completed,
                    performance_rating, unpaid_leaves, overtime_hours,
                    late_login_count, job_satisfaction, work_life_balance,
                ]])
                ml_prob = float(attrition_model.predict_proba(feat_ml)[0][1]) * 100
                # 70% ML + 30% rule-based for better interpretability
                final_risk = round(max(8, min(92, ml_prob * 0.7 + rule_score * 0.3)), 2)
            except Exception as e:
                print("ML attrition fallback:", e)
                final_risk = round(max(8, min(85, rule_score)), 2)
        else:
            final_risk = round(max(8, min(85, rule_score)), 2)

        return jsonify({"attrition_risk": final_risk, "attrition_factors": factors})
    except Exception as e:
        print("Attrition error:", e)
        return jsonify({"attrition_risk": 0, "attrition_factors": {}})


if __name__ == "__main__":
    app.run(debug=True)
