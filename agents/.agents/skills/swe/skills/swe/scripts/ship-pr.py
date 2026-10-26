#!/usr/bin/env python3
import argparse
import json
from pathlib import Path
import re
import subprocess

QUERY = '''query Landing($owner:String!,$repo:String!,$pr:Int!) {
  repository(owner:$owner,name:$repo) {
    pullRequest(number:$pr) {
      id number state headRefOid baseRefOid baseRefName
      repository { nameWithOwner }
      autoMergeRequest { enabledAt }
      mergeQueueEntry { id }
      mergeCommit { oid }
    }
  }
}'''
MUTATIONS = {
    'disable': 'mutation CancelAuto($id:ID!) { disablePullRequestAutoMerge(input:{pullRequestId:$id}) { clientMutationId } }',
    'dequeue': 'mutation CancelQueue($id:ID!) { dequeuePullRequest(input:{id:$id}) { clientMutationId } }',
}


def graphql(query, variables):
    result = subprocess.run(['gh', 'api', 'graphql', '--input', '-'],
                            input=json.dumps({'query': query, 'variables': variables}),
                            capture_output=True, text=True, timeout=35)
    if result.returncode:
        raise ValueError('GitHub request failed; no mutation retry was attempted')
    payload = json.loads(result.stdout)
    if payload.get('errors') or not isinstance(payload.get('data'), dict):
        raise ValueError('GitHub response is incomplete or reports errors')
    return payload['data']


def text(value):
    if not isinstance(value, str) or not value:
        raise ValueError('missing string in landing record')
    return value


def oid(value):
    if not re.fullmatch(r'[0-9a-f]{40}|[0-9a-f]{64}', text(value)):
        raise ValueError('invalid revision in landing record')
    return value


def parse_record(raw):
    repository = text(raw['repository'])
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repository):
        raise ValueError('invalid repository')
    number = raw['number']
    if type(number) is not int or number <= 0:
        raise ValueError('invalid PR number')
    if raw['state'] not in ('OPEN', 'CLOSED', 'MERGED'):
        raise ValueError('unknown PR state')
    if type(raw['autoMerge']) is not bool or type(raw['queued']) is not bool:
        raise ValueError('unknown pending merge state')
    return dict(repository=repository, number=number, id=text(raw['id']), state=raw['state'],
                head=oid(raw['head']), base=oid(raw['base']), baseBranch=text(raw['baseBranch']),
                autoMerge=raw['autoMerge'], queued=raw['queued'],
                mergeCommit=None if raw['mergeCommit'] is None else oid(raw['mergeCommit']))


def inspect(repository, number):
    owner, repo = repository.split('/')
    raw = graphql(QUERY, dict(owner=owner, repo=repo, pr=number))['repository']['pullRequest']
    automatic, queued, merge = raw['autoMergeRequest'], raw['mergeQueueEntry'], raw['mergeCommit']
    if automatic is not None:
        text(automatic['enabledAt'])
    if queued is not None:
        text(queued['id'])
    result = parse_record(dict(repository=raw['repository']['nameWithOwner'], number=raw['number'],
                               id=raw['id'], state=raw['state'], head=raw['headRefOid'], base=raw['baseRefOid'],
                               baseBranch=raw['baseRefName'], autoMerge=automatic is not None,
                               queued=queued is not None, mergeCommit=None if merge is None else merge['oid']))
    if result['repository'].lower() != repository.lower() or result['number'] != number:
        raise ValueError('GitHub returned a different PR')
    return result


def same_revision(before, after):
    return all(before[key] == after[key] for key in ('repository', 'number', 'id', 'head', 'base', 'baseBranch'))


def cancel_pending(expected):
    current = inspect(expected['repository'], expected['number'])
    for operation, field in (('disable', 'autoMerge'), ('dequeue', 'queued')):
        if current['state'] != 'OPEN':
            return dict(kind='not-open', record=current)
        if not same_revision(expected, current):
            return dict(kind='changed', record=current)
        if current[field]:
            graphql(MUTATIONS[operation], {'id': current['id']})
            current = inspect(expected['repository'], expected['number'])
    if current['state'] != 'OPEN':
        return dict(kind='not-open', record=current)
    if not same_revision(expected, current):
        return dict(kind='changed', record=current)
    return dict(kind='still-pending' if current['autoMerge'] or current['queued'] else 'cancelled', record=current)


def main():
    parser = argparse.ArgumentParser(description='Inspect or cancel pending GitHub merges. Never merges or rewrites branches.')
    sub = parser.add_subparsers(dest='operation', required=True)
    view = sub.add_parser('inspect')
    view.add_argument('--repo', required=True)
    view.add_argument('--pr', type=int, required=True)
    cancel = sub.add_parser('cancel-pending')
    cancel.add_argument('--record', type=Path, required=True)
    args = parser.parse_args()
    try:
        if args.operation == 'inspect':
            if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', args.repo) or args.pr <= 0:
                raise ValueError('invalid PR identity')
            result = dict(kind='inspected', record=inspect(args.repo, args.pr))
        else:
            saved = json.loads(args.record.read_text())
            if saved.get('kind') != 'inspected':
                raise ValueError('expected a saved inspection')
            result = cancel_pending(parse_record(saved['record']))
    except (ValueError, KeyError, TypeError, OSError, subprocess.TimeoutExpired) as error:
        result = dict(kind='unavailable', detail=str(error))
    print(json.dumps(result))
    return 0 if result['kind'] in ('inspected', 'cancelled') else 1


if __name__ == '__main__':
    raise SystemExit(main())
