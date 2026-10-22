#!/usr/bin/env python3
"""Compare upstream snapshots and local SWE without changing installed files."""

import argparse
import io
import json
from pathlib import Path
import subprocess
import tarfile


def run(*args, cwd=None):
    return subprocess.check_output(args, cwd=cwd)


def archive(repo, revision, destination):
    destination.mkdir()
    data = run('git', 'archive', '--format=tar', revision, cwd=repo)
    with tarfile.open(fileobj=io.BytesIO(data)) as bundle:
        bundle.extractall(destination, filter='data')


def diff(left, right, destination):
    with destination.open('wb') as output:
        result = subprocess.run(
            ['git', '-c', 'core.quotePath=false', 'diff', '--no-index',
             '--no-ext-diff', '--no-textconv', '--', str(left), str(right)],
            stdout=output,
        )
    if result.returncode not in (0, 1):
        raise RuntimeError(f'diff failed: {result.returncode}')
    return result.returncode == 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--source', type=Path)
    parser.add_argument('--revision', default='HEAD')
    args = parser.parse_args()
    here = Path(__file__).resolve().parent
    hub = here.parents[1]
    live = hub / 'swe'
    output = args.output.resolve()
    if output.exists() or output == hub or hub in output.parents:
        parser.error('output must be new and outside the shared skill hub')
    if args.source:
        source = args.source.resolve()
        if source == output or source in output.parents:
            parser.error('output must be outside the source checkout')
    metadata = json.loads((live / 'UPSTREAM.json').read_text())
    output.mkdir(parents=True)
    if not args.source:
        source = output / 'checkout'
        subprocess.run(['gh', 'repo', 'clone', metadata['repository'], str(source)], check=True)
    baseline = metadata['revision']
    candidate = run('git', 'rev-parse', '--verify', '--end-of-options',
                    args.revision + '^{commit}', cwd=source).decode().strip()
    for label, revision in [('baseline', baseline), ('candidate', candidate)]:
        raw = output / (label + '-raw')
        archive(source, revision, raw)
        subprocess.run(['python3', str(here / 'prepare-upstream.py'),
                        '--source', str(raw), '--output', str(output / label)], check=True)
    changed = diff(output / 'baseline', output / 'candidate', output / 'upstream.diff')
    diff(output / 'baseline', live, output / 'local.diff')
    report = {
        'repository': metadata['repository'], 'baseline': baseline,
        'candidate': candidate, 'upstream_changed': changed,
        'live_tree_modified': False,
        'note': 'Comparison only. Local removals are intentional; do not overwrite the fork.',
    }
    (output / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
