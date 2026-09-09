from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix


def evaluate_model(model, texts, labels):
    predictions = model.predict(texts)
    return {
        "accuracy": float(accuracy_score(labels, predictions)),
        "precision": float(precision_score(labels, predictions, pos_label="spam", zero_division=0)),
        "recall": float(recall_score(labels, predictions, pos_label="spam", zero_division=0)),
        "f1Score": float(f1_score(labels, predictions, pos_label="spam", zero_division=0)),
        "confusionMatrix": confusion_matrix(labels, predictions, labels=["legitimate", "spam"]).tolist(),
        "labels": ["legitimate", "spam"],
    }
