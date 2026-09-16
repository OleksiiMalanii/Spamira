# Message scenarios

`messages.tsv` supplements the public parallel SMS corpus with English and Ukrainian scenarios covering unsolicited promotions, gifts, trials, loyalty programs, financial offers, and ordinary personal/work messages.

These are scenario examples, not an observed inbox sample or a representative real-world benchmark. Unsolicited advertising is labeled spam, even without a fraudulent claim. Personal discussions of offers, expected documents, requested trials, and order updates are legitimate. A text-only classifier cannot determine whether a recipient consented to a marketing message.

Each row contains a label, scenario family, and English/Ukrainian pair. A whole family stays within one fold. Training assigns these examples weight 4 to keep the small local-domain supplement visible alongside the larger public corpus. Evaluation reports source-level results separately. Customer history is not a training source.

The scenario collection is part of Spamira. The downloaded multilingual corpus is separate; its publisher and license metadata are documented in the model card.
