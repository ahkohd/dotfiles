import copy
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('ship', Path(__file__).with_name('ship-pr.py'))
ship = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ship)


def record(**changes):
    return dict(dict(repository='owner/repo', number=7, id='PR_7', state='OPEN',
                     head='a' * 40, base='b' * 40, baseBranch='main',
                     autoMerge=True, queued=True, mergeCommit=None), **changes)


class ShippingTests(unittest.TestCase):
    def cancel(self, reads, mutate=None):
        with patch.object(ship, 'inspect', side_effect=reads), patch.object(ship, 'graphql', side_effect=mutate) as transport:
            result = ship.cancel_pending(record())
            return result, transport.call_args_list

    def test_both_mechanisms_are_cancelled_and_read_back(self):
        result, calls = self.cancel([record(), record(autoMerge=False), record(autoMerge=False, queued=False)])
        self.assertEqual(result['kind'], 'cancelled')
        self.assertEqual([call.args for call in calls], [(ship.MUTATIONS['disable'], {'id': 'PR_7'}), (ship.MUTATIONS['dequeue'], {'id': 'PR_7'})])
        self.assertIn('pullRequestId:$id', ship.MUTATIONS['disable'])
        self.assertIn('input:{id:$id}', ship.MUTATIONS['dequeue'])

    def test_changed_revision_stops_before_mutation(self):
        for changes in ({'head': 'c' * 40}, {'base': 'c' * 40}, {'baseBranch': 'release'}, {'repository': 'other/repo'}, {'id': 'OTHER'}):
            result, calls = self.cancel([record(**changes)])
            self.assertEqual(result['kind'], 'changed')
            self.assertEqual(calls, [])

    def test_merge_or_revision_change_during_cancellation_stops_chain(self):
        for changed, kind in ((record(state='MERGED'), 'not-open'), (record(base='c' * 40), 'changed')):
            result, calls = self.cancel([record(), changed])
            self.assertEqual(result['kind'], kind)
            self.assertEqual(len(calls), 1)

    def test_rearmed_or_uncleared_request_never_reports_cancelled(self):
        result, calls = self.cancel([record(), record(autoMerge=False), record(autoMerge=True, queued=False)])
        self.assertEqual(result['kind'], 'still-pending')
        self.assertEqual(len(calls), 2)

    def test_failure_is_not_retried(self):
        with patch.object(ship, 'inspect', return_value=record()), patch.object(ship, 'graphql', side_effect=ValueError('refused')) as transport:
            with self.assertRaises(ValueError):
                ship.cancel_pending(record())
            self.assertEqual(transport.call_count, 1)

    def test_malformed_saved_records_are_rejected(self):
        for field in record():
            broken = record()
            del broken[field]
            with self.assertRaises((KeyError, ValueError, TypeError)):
                ship.parse_record(broken)
        for changes in ({'autoMerge': None}, {'queued': 'false'}, {'head': 'main'}, {'number': True}):
            with self.assertRaises(ValueError):
                ship.parse_record(record(**changes))

    def test_transport_fields_are_required_not_assumed_absent(self):
        raw = dict(id='PR_7', number=7, state='OPEN', headRefOid='a' * 40, baseRefOid='b' * 40,
                   baseRefName='main', repository={'nameWithOwner': 'owner/repo'},
                   autoMergeRequest=None, mergeQueueEntry=None, mergeCommit=None)
        for key in raw:
            broken = copy.deepcopy(raw)
            del broken[key]
            with patch.object(ship, 'graphql', return_value={'repository': {'pullRequest': broken}}):
                with self.assertRaises((KeyError, ValueError, TypeError)):
                    ship.inspect('owner/repo', 7)
        with patch.object(ship, 'graphql', return_value={'repository': {'pullRequest': raw}}):
            self.assertFalse(ship.inspect('owner/repo', 7)['queued'])

    def test_cli_round_trip_uses_fixed_transport_and_readback(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            state = root / 'state.json'
            state.write_text(json.dumps(dict(id='PR_7', number=7, state='OPEN', headRefOid='a' * 40,
                                             baseRefOid='b' * 40, baseRefName='main', repository={'nameWithOwner': 'owner/repo'},
                                             autoMergeRequest={'enabledAt': 'now'}, mergeQueueEntry={'id': 'QUEUE_7'}, mergeCommit=None)))
            gh = root / 'gh'
            gh.write_text(f'#!{sys.executable}\n' + '''import json, os, pathlib, sys
assert sys.argv[1:] == ['api', 'graphql', '--input', '-']
request = json.load(sys.stdin)
query, variables = request['query'], request['variables']
path = pathlib.Path(os.environ['SWE_TEST_LANDING_STATE'])
state = json.loads(path.read_text())
if query.startswith('query Landing'):
    assert variables == {'owner': 'owner', 'repo': 'repo', 'pr': 7}
    print(json.dumps({'data': {'repository': {'pullRequest': state}}}))
else:
    assert variables == {'id': 'PR_7'}
    if 'disablePullRequestAutoMerge(input:{pullRequestId:$id})' in query:
        state['autoMergeRequest'] = None
    elif 'dequeuePullRequest(input:{id:$id})' in query:
        state['mergeQueueEntry'] = None
    else:
        raise AssertionError('unexpected mutation')
    path.write_text(json.dumps(state))
    print(json.dumps({'data': {'cancelled': {'clientMutationId': None}}}))
''')
            gh.chmod(0o700)
            env = dict(os.environ, PATH=str(root) + os.pathsep + os.environ['PATH'], SWE_TEST_LANDING_STATE=str(state))
            script = str(Path(__file__).with_name('ship-pr.py'))
            inspected = subprocess.run([sys.executable, script, 'inspect', '--repo', 'owner/repo', '--pr', '7'], env=env, capture_output=True, text=True, check=True)
            saved = root / 'record.json'
            saved.write_text(inspected.stdout)
            result = subprocess.run([sys.executable, script, 'cancel-pending', '--record', str(saved)], env=env, capture_output=True, text=True, check=True)
            self.assertEqual(json.loads(result.stdout)['kind'], 'cancelled')
            final = json.loads(state.read_text())
            self.assertIsNone(final['autoMergeRequest'])
            self.assertIsNone(final['mergeQueueEntry'])
            self.assertEqual(final['state'], 'OPEN')

    def test_graphql_errors_fail_closed(self):
        for payload in ({'errors': [{'message': 'denied'}], 'data': {}}, {'data': None}):
            with patch.object(ship.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0, json.dumps(payload), '')):
                with self.assertRaises(ValueError):
                    ship.graphql(ship.QUERY, {})


if __name__ == '__main__':
    unittest.main()
