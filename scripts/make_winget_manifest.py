#!/usr/bin/env python3
"""Generate the winget-pkgs manifest set for Nunba.

WHY WINGET (2026-08-13): users report the browser refusing the download
and flagging it unsafe.  Three independent systems produce that, and code
signing only fully addresses one of them:

  * Chrome/Edge "not commonly downloaded"  -> Safe Browsing REPUTATION,
    which a brand-new signed binary does not have and can only accrue
    through download volume.
  * "Windows protected your PC" on run     -> SmartScreen reputation,
    which accrues to the signing identity over time.
  * AV quarantine                          -> heuristics.  cx_Freeze
    bundles look structurally like malware packers (bundled interpreter,
    large compressed payload, extract-to-temp-then-execute), and signing
    does nothing for this.

`winget install HevolveAI.Nunba` involves NO browser download, so Safe
Browsing never enters the picture at all.  That sidesteps the reputation
curve rather than waiting it out, which is why this is the cheapest real
win available.

SINGLE SOURCE OF TRUTH.  Version and publisher metadata are read from
scripts/Nunba_Installer.iss -- the file that already declares them for
the actual installer.  Nothing here re-states a value that lives there,
so the manifest cannot drift from the artifact it describes (CLAUDE.md
Gate 2/4).  The SHA256 is computed from the real installer bytes, never
copied by hand.

USAGE
    python scripts/make_winget_manifest.py --installer Output/Nunba_Setup.exe \\
        --url https://github.com/hertz-ai/Nunba/releases/download/v2.0.0/Nunba_Setup.exe

Writes packaging/winget/<version>/ with the three files winget-pkgs
requires.  Submitting them is a PR to microsoft/winget-pkgs and is
DELIBERATELY not automated here -- it publishes under your identity and
needs your GitHub account.
"""
from __future__ import annotations

import argparse
import hashlib
import os
import re
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ISS = os.path.join(REPO_ROOT, 'scripts', 'Nunba_Installer.iss')
OUT_ROOT = os.path.join(REPO_ROOT, 'packaging', 'winget')

# winget schema version these manifests target.
MANIFEST_VERSION = '1.6.0'
PACKAGE_IDENTIFIER = 'HevolveAI.Nunba'
# Apache-2.0 -- matches the repo LICENSE.  winget requires an SPDX id.
LICENSE_SPDX = 'Apache-2.0'


def _iss_define(name: str) -> str:
    """Read a `#define Name "value"` out of the Inno Setup script.

    Reading from the .iss is the point: that file already declares the
    identity the installer ships with, so the manifest is derived from
    the artifact rather than asserted alongside it.
    """
    with open(ISS, encoding='utf-8', errors='replace') as f:
        src = f.read()
    m = re.search(rf'^#define\s+{re.escape(name)}\s+"([^"]*)"', src, re.M)
    if not m:
        raise SystemExit(f'{ISS}: no #define {name} -- cannot derive manifest')
    return m.group(1)


def _sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest().upper()


def _normalize_version(raw: str) -> str:
    """winget sorts versions; a bare '2.0' compares badly against '2.0.1'.
    Pad to three parts so ordering is unambiguous."""
    parts = [p for p in raw.strip().split('.') if p != '']
    while len(parts) < 3:
        parts.append('0')
    return '.'.join(parts)


def build_manifests(installer_path: str, installer_url: str,
                    version: str | None = None) -> dict[str, str]:
    app = _iss_define('MyAppName')
    publisher = _iss_define('MyAppPublisher')
    url = _iss_define('MyAppURL')
    tagline = _iss_define('MyAppTagline')
    ver = _normalize_version(version or _iss_define('MyAppVersion'))
    sha = _sha256(installer_path)

    hdr = 'https://aka.ms/winget-manifest'
    version_yaml = f"""# yaml-language-server: $schema={hdr}.version.{MANIFEST_VERSION}.schema.json
PackageIdentifier: {PACKAGE_IDENTIFIER}
PackageVersion: {ver}
DefaultLocale: en-US
ManifestType: version
ManifestVersion: {MANIFEST_VERSION}
"""

    # InstallerType: inno -- the installer really is Inno Setup
    # (scripts/Nunba_Installer.iss), which is what gives winget correct
    # silent-install switches for free.  Declaring the wrong type is the
    # usual cause of `winget install` hanging on a UI nobody can see.
    installer_yaml = f"""# yaml-language-server: $schema={hdr}.installer.{MANIFEST_VERSION}.schema.json
PackageIdentifier: {PACKAGE_IDENTIFIER}
PackageVersion: {ver}
InstallerType: inno
Scope: machine
InstallModes:
  - interactive
  - silent
  - silentWithProgress
UpgradeBehavior: install
ProductCode: '{_iss_define('MyAppId')}_is1'
Installers:
  - Architecture: x64
    InstallerUrl: {installer_url}
    InstallerSha256: {sha}
ManifestType: installer
ManifestVersion: {MANIFEST_VERSION}
"""

    locale_yaml = f"""# yaml-language-server: $schema={hdr}.defaultLocale.{MANIFEST_VERSION}.schema.json
PackageIdentifier: {PACKAGE_IDENTIFIER}
PackageVersion: {ver}
PackageLocale: en-US
Publisher: {publisher}
PublisherUrl: {url}
PublisherSupportUrl: {url}
PackageName: {app}
PackageUrl: {url}
License: {LICENSE_SPDX}
LicenseUrl: https://github.com/hertz-ai/Nunba/blob/main/LICENSE
ShortDescription: {tagline}
Description: >-
  Nunba runs a multimodal AI companion entirely on your own machine.
  Chat, voice and vision are served by local models, so your
  conversations stay on the device rather than being sent to a
  third-party service.
Moniker: nunba
Tags:
  - ai
  - assistant
  - chatbot
  - llm
  - local
  - offline
  - privacy
  - speech
ManifestType: defaultLocale
ManifestVersion: {MANIFEST_VERSION}
"""
    return {
        f'{PACKAGE_IDENTIFIER}.yaml': version_yaml,
        f'{PACKAGE_IDENTIFIER}.installer.yaml': installer_yaml,
        f'{PACKAGE_IDENTIFIER}.locale.en-US.yaml': locale_yaml,
    }, ver, sha


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--installer', default=os.path.join('Output', 'Nunba_Setup.exe'),
                    help='path to the built installer (SHA256 is computed from it)')
    ap.add_argument('--url', required=True,
                    help='PUBLIC download URL the manifest will point at')
    ap.add_argument('--version', default=None,
                    help='override version (default: MyAppVersion from the .iss)')
    args = ap.parse_args()

    path = args.installer if os.path.isabs(args.installer) else \
        os.path.join(REPO_ROOT, args.installer)
    if not os.path.isfile(path):
        print(f'ERROR: installer not found: {path}', file=sys.stderr)
        print('Build it first: python scripts/build.py', file=sys.stderr)
        return 2

    files, ver, sha = build_manifests(path, args.url, args.version)
    out_dir = os.path.join(OUT_ROOT, ver)
    os.makedirs(out_dir, exist_ok=True)
    for name, body in files.items():
        with open(os.path.join(out_dir, name), 'w', encoding='utf-8', newline='\n') as f:
            f.write(body)

    size_mb = os.path.getsize(path) / (1024 * 1024)
    print(f'version   : {ver}')
    print(f'installer : {path}  ({size_mb:.0f} MB)')
    print(f'sha256    : {sha}')
    print(f'url       : {args.url}')
    print(f'written   : {out_dir}')
    for name in files:
        print(f'            {name}')
    print()
    print('NEXT (needs your GitHub account -- deliberately not automated):')
    print('  1. Publish the installer at the --url above so it resolves publicly.')
    print(f'  2. Validate:  winget validate --manifest {out_dir}')
    print(f'  3. Test:      winget install --manifest {out_dir}')
    print('  4. PR the folder into microsoft/winget-pkgs under')
    print(f'     manifests/h/HevolveAI/Nunba/{ver}/')
    return 0


if __name__ == '__main__':
    sys.exit(main())
