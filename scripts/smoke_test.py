"""Verify real predictions, account isolation, and restart persistence."""
import argparse
import json
import math
from http.cookiejar import LWPCookieJar
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, build_opener, HTTPCookieProcessor
from uuid import uuid4


class Client:
    def __init__(self, base):
        self.base = base.rstrip('/')
        self.cookies = LWPCookieJar()
        self.opener = build_opener(HTTPCookieProcessor(self.cookies))

    def call(self, path, payload=None):
        headers = {'Content-Type': 'application/json'}
        if payload is not None:
            headers['X-CSRF-TOKEN'] = self.call('/api/auth/csrf')['token']
        request = Request(self.base + path, data=None if payload is None else json.dumps(payload).encode(), headers=headers)
        with self.opener.open(request, timeout=30) as response:
            return json.load(response)

    def expect_error(self, status, path, payload=None):
        try:
            self.call(path, payload)
            raise AssertionError(f'{path} unexpectedly succeeded')
        except HTTPError as error:
            assert error.code == status, (error.code, error.read())


def main(base, state_file, verify_state):
    client = Client(base)
    if verify_state:
        assert state_file, '--state-file is required'
        client.cookies.load(state_file + '.cookies', ignore_discard=True)
        expected = json.loads(Path(state_file).read_text())
        assert client.call('/api/auth/session')['user']['id'] == expected['userId']
        assert client.call('/api/dashboard/stats')['totalAnalyzed'] == expected['count']
        assert client.call('/api/classifications/' + expected['result']['id']) == expected['result']
        print('Restart persistence passed: account session, private history, and exact saved result.')
        return
    client.expect_error(401, '/api/classifications')
    token = uuid4().hex
    email, password = f'smoke-{token}@example.com', 'SmokePassword123!'
    user = client.call('/api/auth/register', {'displayName': 'Smoke verification', 'email': email, 'password': password})
    for message, expected in [
        ('WINNER! You have won a free cash prize! Call now to claim your reward!', 'spam'),
        ('Hey, are we still meeting for lunch tomorrow?', 'legitimate'),
    ]:
        result = client.call('/api/classifications', {'message': f'{message} {token[:8]}'})
        assert result['savedToHistory']
        assert result['label'] == expected, result
        assert math.isclose(result['spamProbability'] + result['legitimateProbability'], 1)
        assert result['confidence'] == max(result['spamProbability'], result['legitimateProbability'])
        assert client.call('/api/classifications/' + result['id']) == result
        history = client.call(f'/api/classifications?label={expected}&search={token[:8]}&pageSize=1&sort=desc')
        assert history['items'][0]['id'] == result['id']
        print(f"{expected}: {result['confidence']:.1%}; persisted ID {result['id']}")
    stats = client.call('/api/dashboard/stats')
    assert (stats['totalAnalyzed'], stats['spamCount'], stats['legitimateCount']) == (2, 1, 1)
    metrics = client.call('/api/model/metrics')
    assert sum(map(sum, metrics['confusionMatrix'])) == metrics['testSamples']
    for invalid in ['', '   ', 'x' * 5001]:
        client.expect_error(400, '/api/classifications', {'message': invalid})
    other = Client(base)
    other.call('/api/auth/register', {'displayName': 'Other account', 'email': f'other-{token}@example.com', 'password': password})
    other.expect_error(404, '/api/classifications/' + result['id'])
    assert other.call('/api/classifications')['totalCount'] == 0
    client.call('/api/auth/logout', {})
    client.expect_error(401, '/api/classifications')
    client.call('/api/auth/login', {'email': email, 'password': password, 'rememberMe': True})
    assert client.call('/api/classifications')['totalCount'] == 2
    if state_file:
        client.cookies.save(state_file + '.cookies', ignore_discard=True)
        Path(state_file).write_text(json.dumps({'userId': user['id'], 'count': 2, 'result': result}))
    print('Smoke test passed: registration, login/logout, private history, real predictions, metrics, and validation.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-url', default='http://localhost:5080')
    parser.add_argument('--state-file', help='Temporary path for restart verification; contains a session cookie, keep private.')
    parser.add_argument('--verify-state', action='store_true')
    args = parser.parse_args()
    main(args.base_url, args.state_file, args.verify_state)
