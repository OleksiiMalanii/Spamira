# Bilingual spam model

Spamira uses TF-IDF and Logistic Regression for English and Ukrainian text. Unsolicited advertising is spam, including promotional discounts, loyalty offers, and trials without an explicit fraudulent claim. Ordinary personal discussion of those subjects is legitimate. Sender identity and recipient consent cannot be established from text alone.

## Data and provenance

The base corpus is the [SMS Spam Multilingual Collection](https://huggingface.co/datasets/dbarbedillo/SMS_Spam_Multilingual_Collection_Dataset), revision `4b5332a8771b3f6388f8ecc51c2b8ade4be31c73`, downloaded with SHA-256 verification. Only English and Ukrainian columns are used. Its English source is the [UCI SMS Spam Collection](https://archive.ics.uci.edu/dataset/228/sms+spam+collection), contributed by Tiago Almeida and José Hidalgo (2011), DOI [10.24432/C5CC84](https://doi.org/10.24432/C5CC84). UCI lists CC BY 4.0; the multilingual publisher labels its derivative GPL. Raw corpora are downloaded separately and are not committed.

The Ukrainian column contains automatic translations and translation errors, rather than a representative collection of native Ukrainian messages. Reported scores must be interpreted with that limitation.

A small [scenario supplement](../data/curated/README.md) adds 42 paired English/Ukrainian examples of contemporary promotions and personal/work messages. It is scenario data, not observed inbox traffic. Training weights these rows by 4. Customer history is not used for training or committed to the repository.

## Features and split

Unicode NFKC, case folding, and whitespace normalization preserve punctuation and numbers. A sklearn Pipeline combines word unigram/bigram TF-IDF with character-within-word 3–5-gram TF-IDF. Character fragments provide useful word-form coverage in Ukrainian. Logistic Regression returns both class probabilities using predict_proba; the larger probability determines the label and confidence.

Exact duplicate messages connect their source pairs before splitting. Conflicting-label groups are removed. English and Ukrainian versions, duplicate text, and each scenario family remain together within five stratified group folds with random_state=42. Fold 0 is untouched test data; fold 1 selects C and class weights using F1 and precision. The selected pipeline is refit on the four development folds. Test data never selects parameters.

Version identifiers hash corpus bytes, the scenario supplement, and training settings. Metrics include overall, per-language, and per-source results, as well as every validation candidate. Models are joblib artifacts from the repository's own training process only.

## Reference evaluation

| Set | Accuracy | Precision | Recall | F1 | Test examples |
| --- | ---: | ---: | ---: | ---: | ---: |
| English | 98.94% | 99.19% | 92.42% | 95.69% | 1,038 |
| Ukrainian | 98.07% | 93.75% | 90.91% | 92.31% | 1,036 |
| Overall | 98.51% | 96.41% | 91.67% | 93.98% | 2,074 |

Reference version: `sms-en-uk-tfidf-lr-2-32e6893b`. Training: 8,299 rows. Test confusion matrix, rows actual and columns predicted, ordered legitimate/spam: `[[1801, 9], [22, 242]]`. Spam is positive. The public-only test F1 is 93.69%; the small scenario subset is reported separately in metrics.json. These are benchmark results, not a guarantee of accuracy on live traffic, and are not directly comparable to the earlier English-only split.

## Output and limitations

Empty input is rejected. Numeric-only, unsupported-script-only, and zero-feature input is rejected rather than labeled legitimate from an intercept-only prediction. Other unfamiliar wording can still be misclassified. The UI highlights confidence below 80%; this is a review cue, not a calibrated statistical guarantee.

Historic records retain the model version and probabilities from their original analysis. Use **Analyze again** in an expanded history row to obtain a new result with the current model; the original is preserved.

Retrain from `ml-service` with `python -m training.download_data` and `python -m training.train`. Docker builds perform both steps automatically. Metrics always come from the loaded model. Future improvements should prioritize labeled native Ukrainian messages collected with permission and evaluated independently of the training data.
