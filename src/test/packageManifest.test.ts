import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import test from 'node:test';

interface MenuEntry {
  readonly command: string;
  readonly when?: string;
}

interface ConfigurationProperty {
  readonly default?: unknown;
  readonly type?: string;
}

interface ExtensionManifest {
  readonly contributes: {
    readonly configuration: {
      readonly properties: Record<string, ConfigurationProperty>;
    };
    readonly menus: {
      readonly 'commandPalette': MenuEntry[];
      readonly 'scm/resourceState/context': MenuEntry[];
    };
  };
  readonly engines: {
    readonly vscode: string;
  };
}

function readManifest(): ExtensionManifest {
  const packagePath = path.join(__dirname, '..', '..', 'package.json');
  return JSON.parse(readFileSync(packagePath, 'utf8')) as ExtensionManifest;
}

test('SCM QuickLook menus use distinct commands for each native Git group', () => {
  const manifest = readManifest();
  const scmEntries = manifest.contributes.menus['scm/resourceState/context']
    .filter(entry => entry.command.startsWith('quicklook.previewScm'));

  assert.deepEqual(scmEntries.map(entry => ({ command: entry.command, when: entry.when })), [
    {
      command: 'quicklook.previewScmWorkingTree',
      when: 'scmProvider == git && scmResourceGroup == workingTree'
    },
    {
      command: 'quicklook.previewScmIndex',
      when: 'scmProvider == git && scmResourceGroup == index'
    },
    {
      command: 'quicklook.previewScmUntracked',
      when: 'scmProvider == git && scmResourceGroup == untracked'
    }
  ]);

  const hiddenCommands = new Set(
    manifest.contributes.menus.commandPalette
      .filter(entry => entry.when === 'false')
      .map(entry => entry.command)
  );
  for (const entry of scmEntries) {
    assert.equal(hiddenCommands.has(entry.command), true);
  }
});

test('Markdown continuity is optional and enabled by default', () => {
  const setting = readManifest().contributes.configuration.properties['quicklook.markdownViewContinuity.enabled'];

  assert.deepEqual(setting, {
    type: 'boolean',
    default: true,
    markdownDescription: 'Remember and continue the last `source`, `preview`, or `split` Markdown view in this workspace. Disable to stop automatic Markdown view memory and layout changes; the current editor layout is left unchanged.'
  });
});

test('QuickLook uses portable PATH-based executable discovery by default', () => {
  const setting = readManifest().contributes.configuration.properties['quicklook.executablePath'];

  assert.equal(setting.default, 'QuickLook.exe');
});

test('the VS Code engine matches the native Markdown workflow baseline', () => {
  const manifest = readManifest();

  assert.equal(manifest.engines.vscode, '^1.119.0');
});
