/**
 * Jest source-shape smoke tests for the marketing/legacy landing-page
 * components that still lack tests — batch #40.
 *
 * These are the older homepage/demo/docs components (pre-Nunba
 * branding).  Tests use source-shape (fs.readFileSync + regex) to
 * avoid the cost of plumbing jest transforms for their browser-only
 * deps (Stripe, GoogleMaps, jQuery, etc.).
 */

const fs = require('fs');
const path = require('path');

// Components that exist but haven't been tested yet.
const COMPONENTS = [
  'aboutOne',
  'aboutThree',
  'aboutTwo',
  'aiFeatures',
  'brandLogo',
  'clients',
  'consearch',
  'consearch_new',
  'contact',
  'content',
  'createBook',
  'demoConsearch',
  'demoVideo',
  'faq',
  'features',
  'featuresnew',
  'footer',
  'footerlite',
  'hevolveDemo',
  'home-multipurpose',
  'navbar',
  'navbarlite',
  'privacyPage',
  'prompt',
  'pupitDocs',
  'recap',
  'signIn',
  'thumbnails',
  'uploadFIle',
  'useForm',
];

// The last part of every path a piece of source imports: `from '...'`,
// `require('...')`, `import('...')`, and `import(/* webpackChunkName: "x" */
// '...')`, where a comment sits between the bracket and the path (the first
// version of this check did not see that one).
const IMPORT_SPEC = /(?:from|import|require)\s*\(?\s*(?:\/\*[\s\S]*?\*\/\s*)*['"`][^'"`]*\/([^'"`/]+)['"`]/g;
const importedNames = (source) => [...source.matchAll(IMPORT_SPEC)].map((found) => found[1]);

// Five pages nothing imported were deleted on 2026-11-22, with the reason, in
// axiosFactoryTokenStaysHome.test.js.  One of them coming back fails here.
const DELETED = ['curriculai', 'essentials', 'hertz', 'knnresults', 'parallaxCodepen'];

describe('Marketing / legacy pages that were deleted stay deleted', () => {
  it.each(DELETED)('%s.js is gone and nothing imports it', (name) => {
    const components = path.join(__dirname, '..', '..', 'components');
    expect(fs.existsSync(path.join(components, `${name}.js`))).toBe(false);
    const importers = [];
    (function walk(dir) {
      for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== '__tests__') walk(full);
        } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
          // Every module a live line imports, by the last part of its path.
          const live = fs.readFileSync(full, 'utf-8').split('\n')
            .filter((line) => !/^\s*(\/\/|\*)/.test(line)).join('\n');
          const imported = importedNames(live)
            .map((found) => found.replace(/\.jsx?$/, '').toLowerCase());
          if (imported.includes(name.toLowerCase())) importers.push(full);
        }
      }
    })(path.join(__dirname, '..', '..'));
    expect(importers).toEqual([]);
  });
});

describe('how an import of a deleted page is recognised', () => {
  it.each([
    ["import Hertz from './hertz';", 'hertz'],
    ["export {default} from '../components/hertz.js';", 'hertz.js'],
    ["const H = require('./hertz');", 'hertz'],
    ["const H = React.lazy(() => import('./hertz'));", 'hertz'],
    ["const H = lazy(() => import(/* webpackChunkName: \"hertz\" */ './hertz'));", 'hertz'],
    ["import(/* webpackChunkName: 'h' */ /* webpackPrefetch: true */ `./hertz`)", 'hertz'],
    ["import(\n  /* webpackChunkName: \"h\" */\n  './hertz'\n)", 'hertz'],
  ])('%s', (line, name) => {
    expect(importedNames(line)).toEqual([name]);
  });
});

// The two style files only the deleted pages imported (parallaxCodepen:
// parallax.scss; curriculai: progressStyles.css) went with them.
describe('style files only the deleted pages used stay deleted', () => {
  it.each(['parallax.scss', 'progressStyles.css'])('%s is gone and nothing names it', (name) => {
    const src = path.join(__dirname, '..', '..');
    expect(fs.existsSync(path.join(src, 'components', name))).toBe(false);
    const stem = name.replace(/\.\w+$/, '');
    const users = [];
    (function walk(dir) {
      for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== '__tests__') walk(full);
        } else if (/\.(js|jsx|ts|tsx|css|scss|sass)$/.test(entry.name)) {
          const live = fs.readFileSync(full, 'utf-8').split('\n')
            .filter((line) => !/^\s*(\/\/|\*)/.test(line));
          const wanted = new Set([name, stem, `_${stem}`]);
          if (live.some((line) => [...line.matchAll(/['"`]([^'"`]+)['"`]/g)]
            .some((found) => wanted.has(found[1].split('/').pop())
              && /import|require|@use|@forward|from/.test(line)))) users.push(full);
        }
      }
    })(src);
    expect(users).toEqual([]);
  });
});

describe('Marketing / legacy component source-shape smoke', () => {
  COMPONENTS.forEach((name) => {
    describe(name, () => {
      const filePath = path.join(
        __dirname, '..', '..', 'components', `${name}.js`,
      );

      it('source file exists', () => {
        expect(fs.existsSync(filePath)).toBe(true);
      });

      it('is non-empty', () => {
        const src = fs.readFileSync(filePath, 'utf-8');
        expect(src.length).toBeGreaterThan(0);
      });

      it('has no leading git conflict markers', () => {
        const src = fs.readFileSync(filePath, 'utf-8');
        expect(src).not.toMatch(/^<{7} /m);
        expect(src).not.toMatch(/^>{7} /m);
      });
    });
  });
});
