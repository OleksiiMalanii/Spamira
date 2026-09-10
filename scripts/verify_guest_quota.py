"""Exercise the daily guest cap with concurrent requests against a running stack.

Consumes the remaining guest allowance on this network for today. Use a test deployment.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from urllib.error import HTTPError
from smoke_test import Client


def verify(base):
    remaining = Client(base).call('/api/auth/session')['guestQuota']['remaining']

    def predict(_):
        try:
            result = Client(base).call('/api/classifications', {'message': 'Hello, see you tomorrow'})
            assert result['savedToHistory'] is False
            return 200
        except HTTPError as error:
            return error.code

    with ThreadPoolExecutor(max_workers=12) as pool:
        codes = list(pool.map(predict, range(12)))
    assert codes.count(200) == remaining, (remaining, codes)
    assert codes.count(429) == 12 - remaining, codes
    fresh_client = Client(base)
    assert fresh_client.call('/api/auth/session')['guestQuota']['remaining'] == 0
    fresh_client.expect_error(401, '/api/classifications')
    print(f'Concurrent guest quota passed: {remaining} accepted, {12 - remaining} rejected; fresh clients share the cap.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://localhost:5080')
    verify(parser.parse_args().base_url)
