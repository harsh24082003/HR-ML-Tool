import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score
from sklearn.ensemble import RandomForestRegressor
import pickle

# Load dataset
data = pd.read_csv("employee_data.csv")

# ✅ Clean data
data = data.fillna(0)

# ✅ FORCE STRONG RELATION (VERY IMPORTANT)
data["salary"] = (
    25000 +
    data["experience_years"] * 5000 +
    data["performance_rating"] * 3000 +
    data["projects_handled"] * 2000 +
    data["total_tasks_completed"] * 8 -
    data["unpaid_leaves"] * 1200 -
    data["late_login_count"] * 300
)

# ✅ Use only strong features
features = [
    "experience_years",
    "performance_rating",
    "projects_handled",
    "total_tasks_completed",
    "unpaid_leaves",
    "late_login_count"
]

X = data[features]
y = data["salary"]

# Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train model
model = RandomForestRegressor(
    n_estimators=300,
    max_depth=15,
    random_state=42
)
model.fit(X_train, y_train)

# Predict
predictions = model.predict(X_test)
score = r2_score(y_test, predictions)

print("✅ Model trained!")
print(f"📊 Accuracy (R2 Score): {score:.2f}")

# Save model
pickle.dump(model, open("model.pkl", "wb"))