from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import pandas as pd
import shap
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = FastAPI()

model = joblib.load(os.path.join(BASE_DIR, "driving_risk_model.pkl"))
explainer = shap.TreeExplainer(model)


class InputData(BaseModel):
    maxSpeed: float
    avgSpeed: float
    stdSpeed: float
    avgAcc: float
    stdAcc: float
    meanPosAcc: float
    meanNegAcc: float
    avgAbsJerk: float
    stdAbsJerk: float
    brakeTimePct: float
    accTimePct: float
    decelTimePct: float
    constSpeedPct: float


feature_explanations = {
    "Maximum_speed (km/h)": {
        "high": "Vehicle reached excessively high maximum speeds.",
        "medium": "Maximum speed exceeded optimal thresholds.",
        "low": "Maximum speed remained within safe limits."
    },
    "Std_speed": {
        "high": "Significant speed fluctuations indicate unstable driving.",
        "medium": "Noticeable speed variation observed.",
        "low": "Speed remained consistent."
    },
    "Mean_neg_acc": {
        "high": "Frequent harsh braking increases collision probability.",
        "medium": "Braking force was occasionally strong.",
        "low": "Braking intensity remained controlled."
    },
    "Avg_abs_jerk": {
        "high": "Abrupt acceleration and braking movements detected.",
        "medium": "Moderate abrupt movements observed.",
        "low": "Driving inputs remained smooth."
    },
    "Brake_time_pct": {
        "high": "Excessive braking duration suggests unsafe response.",
        "medium": "Moderate braking frequency observed.",
        "low": "Controlled braking behavior maintained."
    }
}


@app.post("/predict")
def predict(data: InputData):

    incoming = data.dict()

    mapped = {
        "Maximum_speed (km/h)": incoming["maxSpeed"],
        "Average_speed (km/h)": incoming["avgSpeed"],
        "Std_speed": incoming["stdSpeed"],
        "Avg_acc (m/s^2)": incoming["avgAcc"],
        "Std_acc": incoming["stdAcc"],
        "Mean_pos_acc": incoming["meanPosAcc"],
        "Mean_neg_acc": incoming["meanNegAcc"],
        "Avg_abs_jerk": incoming["avgAbsJerk"],
        "Std_abs_jerk": incoming["stdAbsJerk"],
        "Brake_time_pct": incoming["brakeTimePct"],
        "Acc_time_pct": incoming["accTimePct"],
        "Decel_time_pct": incoming["decelTimePct"],
        "Const_speed_pct": incoming["constSpeedPct"],
    }

    df = pd.DataFrame([mapped])

    # ---------------- ML Prediction ----------------
    prediction = int(model.predict(df)[0])
    probabilities = model.predict_proba(df)[0].tolist()

    label_map = {0: "low", 1: "medium", 2: "high"}
    risk_label = label_map.get(prediction, "low")

    # Safe probability handling
    if len(probabilities) >= 3:
        risk_score = float(round(probabilities[2] * 100, 2))
    else:
        risk_score = float(round(max(probabilities) * 100, 2))

    confidence = float(round(max(probabilities) * 100, 2))

    # ---------------- SHAP Explainability (Enhanced) ----------------
    explanations = []
    top_risk_factors = []

    try:
        shap_values = explainer.shap_values(df)

        if isinstance(shap_values, list):
            shap_for_class = shap_values[prediction][0]
        else:
            shap_for_class = shap_values[0]

        shap_dict = {
            col: float(val)
            for col, val in zip(df.columns, shap_for_class)
        }

        sorted_features = sorted(
            shap_dict.items(),
            key=lambda x: abs(x[1]),
            reverse=True
        )

        top_features = sorted_features[:3]

        for feature, shap_value in top_features:

            actual_value = float(df.iloc[0][feature])
            impact = "increased" if shap_value > 0 else "reduced"

            base_explanation = feature_explanations.get(feature, {}).get(risk_label)

            if base_explanation:
                explanations.append(
                    f"{base_explanation} "
                    f"(Observed: {round(actual_value,2)}). "
                    f"This {impact} the overall risk level."
                )

            top_risk_factors.append({
                "feature": feature,
                "observed_value": round(actual_value, 2),
                "impact_on_risk": impact,
                "shap_importance": round(shap_value, 4)
            })

    except Exception:
        explanations = ["Risk explanation unavailable."]
        top_risk_factors = []

    # ---------------- Executive Headline ----------------
    if risk_label == "high":
        headline = "Critical Driving Risk Identified"
    elif risk_label == "medium":
        headline = "Moderate Driving Risk Observed"
    else:
        headline = "Low Driving Risk"

    # ---------------- Final Response ----------------
    return {
        "risk_score": risk_score,
        "risk_level": risk_label,
        "confidence": confidence,
        "headline": headline,
        "detailed_explanation": explanations,
        "top_risk_factors": top_risk_factors
    }