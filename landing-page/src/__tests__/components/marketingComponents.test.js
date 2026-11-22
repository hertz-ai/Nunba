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
          const imported = [...live.matchAll(
            /(?:from|import|require)\s*\(?\s*['"`][^'"`]*\/([^'"`/]+)['"`]/g,
          )].map((found) => found[1].replace(/\.jsx?$/, '').toLowerCase());
          if (imported.includes(name.toLowerCase())) importers.push(full);
        }
      }
    })(path.join(__dirname, '..', '..'));
    expect(importers).toEqual([]);
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
