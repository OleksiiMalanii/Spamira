from pathlib import Path
from sklearn.model_selection import StratifiedGroupKFold
from training.train import prepare


def test_duplicate_and_translation_groups_do_not_cross_splits():
    data = prepare(Path(__file__).resolve().parents[2] / 'data/raw/multilingual.csv')
    for train, test in StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=42).split(data.text, data.label, data.group):
        assert not set(data.iloc[train].group) & set(data.iloc[test].group)
        assert not set(data.iloc[train].text) & set(data.iloc[test].text)
