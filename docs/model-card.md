# Spamira model card

## Purpose

Classify primarily English SMS messages as `spam` or `legitimate`. The model provides a second opinion; it does not verify senders, inspect destination websites, or guarantee that a message is safe.

## Data and preparation

Source: [UCI SMS Spam Collection](https://archive.ics.uci.edu/dataset/228/sms+spam+collection). The setup script downloads its public archive, reads only the expected dataset member, and verifies the dataset SHA-256:

```text
7d039a24a6083ed9ef0f806ebad56bbb976e3aeb8de05669173bfdc4996c239d
```

Raw records: 5,574. After Unicode NFKC normalization, whitespace cleanup, lowercasing, removal of conflicting-label text, and deduplication: 5,159 unique messages. Removing duplicates before splitting prevents identical normalized messages from crossing the training/test boundary. The raw dataset is downloaded locally and excluded from Git.

## Training

- Stratified 80/20 train/test split, `random_state=42`.
- 4,127 training messages and 1,032 test messages.
- `TfidfVectorizer`: word unigrams and bigrams, `min_df=2`, sublinear term frequency, shared preprocessing function. Default tokenization omits standalone punctuation and single-character tokens.
- `LogisticRegression`: `class_weight="balanced"`, `C=4.0`, `max_iter=1000`, `random_state=42`.
- Fit vocabulary and classifier on training data only. The holdout is used only for evaluation; no hyperparameter search uses it.
- Save the complete pipeline with joblib and evaluation metadata to JSON. Restart the service after replacing artifacts.

## Measured performance

Reference run with scikit-learn 1.8.0:

| Metric | Value |
| --- | ---: |
| Accuracy | 98.55% |
| Precision (spam) | 93.80% |
| Recall (spam) | 94.53% |
| F1-score (spam) | 94.16% |

Rows are actual labels; columns are predicted labels:

| Actual / predicted | Legitimate | Spam |
| --- | ---: | ---: |
| Legitimate | 896 | 8 |
| Spam | 7 | 121 |

The live metrics page uses the active artifact's JSON, not these reference values.

## Probabilities and limitations

`predict_proba` returns both class probabilities, which sum to one. Confidence is the larger probability. The classifier selects the larger-probability class, equivalent to a 0.5 spam threshold apart from ties. At exactly equal probabilities, the first class (`legitimate`) wins.

These are uncalibrated model estimates. Class balancing changes the fitted decision boundary and can affect probability interpretation. Out-of-vocabulary inputs, empty token sequences, new spam campaigns, other languages, and non-SMS content can produce unreliable results. Evaluation is on a fixed historical corpus, not on present-day live traffic.

The model version identifies the pipeline configuration revision and source-data hash. Changes to model configuration should increment the version prefix in the training script. Training time, dependency version, dataset checksum, split seed, and sample counts are recorded alongside every metrics artifact. Predictions retain their original model version after retraining.
