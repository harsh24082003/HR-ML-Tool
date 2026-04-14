import pandas as pd

df = pd.read_csv("employee_data.csv")

def create_attrition(row):
    score = 0

    if row["job_satisfaction"] <= 3:
        score += 2

    if row["work_life_balance"] <= 3:
        score += 2

    if row["overtime_hours"] > 60:
        score += 2

    if row["unpaid_leaves"] > 5:
        score += 1

    if row["late_login_count"] > 10:
        score += 1

    if row["performance_rating"] < 5:
        score += 1

    return 1 if score >= 6 else 0

df["attrition"] = df.apply(create_attrition, axis=1)
df.to_csv("employee_data_with_attrition.csv", index=False)

print("✅ Attrition column added!")