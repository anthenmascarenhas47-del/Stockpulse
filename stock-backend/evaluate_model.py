import joblib
import os
import math
import pandas as pd
import time
from main import make_features, safe_download, TRAIN_TICKERS, FEATURES

MODEL_DIR = "models"
MODEL_PATH = os.path.join(MODEL_DIR, "model.pkl")

model = joblib.load(MODEL_PATH)

# Metrics accumulators
total_tp = total_fp = total_tn = total_fn = 0
probs_all = []
labels_all = []

print("Evaluating model on holdout (last 20% per ticker)...")

for t in TRAIN_TICKERS:
    try:
        df = safe_download(t, "1d", "3y")
        df = make_features(df)
        # label is whether close 5 days ahead is greater
        y = (df["Close"].shift(-5) > df["Close"]).astype(int)[:-5]
        X = df[FEATURES].iloc[:-5]

        if len(X) < 50:
            print(f"  Skipping {t}: insufficient data ({len(X)} rows)")
            continue

        split = int(len(X) * 0.8)
        X_test = X.iloc[split:]
        y_test = y.iloc[split:]

        if X_test.empty:
            print(f"  Skipping {t}: empty test split")
            continue

        probs = model.predict_proba(X_test)[:, 1] if hasattr(model, "predict_proba") else model.predict(X_test)
        preds = (probs >= 0.5).astype(int)

        tp = ((preds == 1) & (y_test.values == 1)).sum()
        fp = ((preds == 1) & (y_test.values == 0)).sum()
        tn = ((preds == 0) & (y_test.values == 0)).sum()
        fn = ((preds == 0) & (y_test.values == 1)).sum()

        total_tp += int(tp)
        total_fp += int(fp)
        total_tn += int(tn)
        total_fn += int(fn)

        probs_all.extend(list(probs))
        labels_all.extend(list(y_test.values))

        n = len(y_test)
        acc = (tp + tn) / n if n else float('nan')
        prec = tp / (tp + fp) if (tp + fp) else float('nan')
        rec = tp / (tp + fn) if (tp + fn) else float('nan')
        f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else float('nan')

        print(f"  {t}: n={n} acc={acc:.3f} prec={prec:.3f} rec={rec:.3f} f1={f1:.3f}")

        time.sleep(0.3)
    except Exception as e:
        print(f"  Error evaluating {t}: {e}")

# Aggregate metrics
n_total = total_tp + total_fp + total_tn + total_fn
accuracy = (total_tp + total_tn) / n_total if n_total else float('nan')
precision = total_tp / (total_tp + total_fp) if (total_tp + total_fp) else float('nan')
recall = total_tp / (total_tp + total_fn) if (total_tp + total_fn) else float('nan')
f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else float('nan')

# Try to compute ROC AUC if possible
auc = None
try:
    from sklearn.metrics import roc_auc_score
    auc = roc_auc_score(labels_all, probs_all) if labels_all else None
except Exception:
    auc = None

print("\nAggregate results:")
print(f"  Count: {n_total} (TP={total_tp}, FP={total_fp}, TN={total_tn}, FN={total_fn})")
print(f"  Accuracy: {accuracy:.3f}")
print(f"  Precision: {precision:.3f}")
print(f"  Recall: {recall:.3f}")
print(f"  F1: {f1:.3f}")
if auc is not None:
    print(f"  ROC AUC: {auc:.3f}")
else:
    print("  ROC AUC: sklearn not available or insufficient data to compute AUC")

# Simple baseline: always predict the majority class in test labels
try:
    import numpy as np
    maj = 1 if sum(labels_all) > len(labels_all) / 2 else 0
    maj_acc = sum(1 for l in labels_all if l == maj) / len(labels_all) if labels_all else float('nan')
    print(f"  Majority baseline accuracy: {maj_acc:.3f} (predict {maj})")
except Exception:
    pass

print("Done.")
