import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
import pickle

df = pd.read_csv("employeedatawithattrition.csv")
df = df.fillna(0)

features = [
    "age",
    "experienceyears",
    "totaltaskscompleted",
    "performancerating",
    "unpaidleaves",
    "overtimehours",
    "latelogincount",
    "jobsatisfaction",
    "worklifebalance"
]

X = df[features]
y = df["attrition"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

model = RandomForestClassifier(
    n_estimators=100,
    class_weight="balanced",
    random_state=42
)

model.fit(X_train, y_train)

accuracy = model.score(X_test, y_test)
print("Model Accuracy:", accuracy)

pickle.dump(model, open("attritionmodel.pkl", "wb"))
print("Model saved as attritionmodel.pkl")