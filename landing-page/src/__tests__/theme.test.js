import theme from '../theme';

describe('theme.js — MUI theme with animation overrides', () => {
  it('exports a valid MUI theme object', () => {
    expect(theme).toBeDefined();
    expect(theme.palette).toBeDefined();
    expect(theme.components).toBeDefined();
  });

  it('uses dark mode palette', () => {
    expect(theme.palette.mode).toBe('dark');
  });

  // ─── MuiButton ───────────────────────────────────────────────────────────

  describe('MuiButton', () => {
    const btnRoot = theme.components.MuiButton.styleOverrides.root;

    it('has transition property', () => {
      expect(btnRoot.transition).toBeDefined();
      expect(btnRoot.transition).toContain('200ms');
    });

    it('has active state with scale(0.97)', () => {
      expect(btnRoot['&:active']).toBeDefined();
      expect(btnRoot['&:active'].transform).toContain('scale(0.97)');
    });

    it('disables text-transform', () => {
      expect(btnRoot.textTransform).toBe('none');
    });

    it('containedPrimary has gradient background', () => {
      const contained =
        theme.components.MuiButton.styleOverrides.containedPrimary;
      expect(contained.background).toContain('linear-gradient');
    });
  });

  // ─── MuiCard ─────────────────────────────────────────────────────────────

  describe('MuiCard', () => {
    const cardRoot = theme.components.MuiCard.styleOverrides.root;

    it('has transition for transform and box-shadow', () => {
      expect(cardRoot.transition).toContain('transform');
      expect(cardRoot.transition).toContain('box-shadow');
    });

    it('has will-change transform hint', () => {
      expect(cardRoot.willChange).toBe('transform');
    });

    it('has hover translateY(-2px)', () => {
      expect(cardRoot['&:hover']).toBeDefined();
      expect(cardRoot['&:hover'].transform).toContain('translateY(-2px)');
    });

    it('has hover boxShadow', () => {
      expect(cardRoot['&:hover'].boxShadow).toBeDefined();
    });
  });

  // ─── MuiIconButton ───────────────────────────────────────────────────────

  describe('MuiIconButton', () => {
    const iconRoot = theme.components.MuiIconButton.styleOverrides.root;

    it('has transition', () => {
      expect(iconRoot.transition).toContain('transform');
    });

    it('has hover scale(1.1)', () => {
      expect(iconRoot['&:hover'].transform).toContain('scale(1.1)');
    });

    it('has active scale(0.9)', () => {
      expect(iconRoot['&:active'].transform).toContain('scale(0.9)');
    });
  });

  // ─── MuiOutlinedInput ────────────────────────────────────────────────────

  describe('MuiOutlinedInput', () => {
    const inputRoot = theme.components.MuiOutlinedInput.styleOverrides.root;

    it('has transition for box-shadow', () => {
      expect(inputRoot.transition).toContain('box-shadow');
    });

    it('has focused state with primary border and glow', () => {
      const focused =
        inputRoot['&.Mui-focused .MuiOutlinedInput-notchedOutline'];
      expect(focused).toBeDefined();
      expect(focused.borderColor).toBe('#6C63FF');
      expect(focused.boxShadow).toContain('rgba(108, 99, 255');
    });
  });

  // ─── MuiDialog ───────────────────────────────────────────────────────────

  describe('MuiDialog', () => {
    const dialogPaper = theme.components.MuiDialog.styleOverrides.paper;

    it('has @keyframes dialogScaleIn', () => {
      expect(dialogPaper['@keyframes dialogScaleIn']).toBeDefined();
      expect(dialogPaper['@keyframes dialogScaleIn']['0%']).toBeDefined();
      expect(dialogPaper['@keyframes dialogScaleIn']['100%']).toBeDefined();
    });

    it('has animation property referencing dialogScaleIn', () => {
      expect(dialogPaper.animation).toContain('dialogScaleIn');
      expect(dialogPaper.animation).toContain('250ms');
    });
  });

  // ─── MuiListItemButton ───────────────────────────────────────────────────

  describe('MuiListItemButton', () => {
    const listBtnRoot = theme.components.MuiListItemButton.styleOverrides.root;

    it('has transition for background-color and padding-left', () => {
      expect(listBtnRoot.transition).toContain('background-color');
      expect(listBtnRoot.transition).toContain('padding-left');
    });

    it('has selected state with extra paddingLeft', () => {
      expect(listBtnRoot['&.Mui-selected']).toBeDefined();
      expect(listBtnRoot['&.Mui-selected'].paddingLeft).toBe(20);
    });
  });

  // ─── MuiFab ──────────────────────────────────────────────────────────────

  describe('MuiFab', () => {
    const fabRoot = theme.components.MuiFab.styleOverrides.root;

    it('has @keyframes fabScaleIn entrance animation', () => {
      expect(fabRoot['@keyframes fabScaleIn']).toBeDefined();
      expect(fabRoot['@keyframes fabScaleIn']['0%'].opacity).toBe(0);
      expect(fabRoot['@keyframes fabScaleIn']['100%'].opacity).toBe(1);
    });

    it('has animation property referencing fabScaleIn', () => {
      expect(fabRoot.animation).toContain('fabScaleIn');
      expect(fabRoot.animation).toContain('300ms');
    });

    it('has hover scale(1.08)', () => {
      expect(fabRoot['&:hover'].transform).toContain('scale(1.08)');
    });

    it('has active scale(0.95)', () => {
      expect(fabRoot['&:active'].transform).toContain('scale(0.95)');
    });
  });

  // ─── MuiChip ─────────────────────────────────────────────────────────────

  describe('MuiChip', () => {
    const chipRoot = theme.components.MuiChip.styleOverrides.root;

    it('has @keyframes chipPopIn', () => {
      expect(chipRoot['@keyframes chipPopIn']).toBeDefined();
    });

    it('has animation property', () => {
      expect(chipRoot.animation).toContain('chipPopIn');
    });
  });

  // ─── MuiTab ──────────────────────────────────────────────────────────────

  describe('MuiTab', () => {
    const tabRoot = theme.components.MuiTab.styleOverrides.root;

    it('disables text-transform', () => {
      expect(tabRoot.textTransform).toBe('none');
    });

    it('has color transition', () => {
      expect(tabRoot.transition).toContain('color');
    });
  });

  // ─── MuiBadge ────────────────────────────────────────────────────────────

  describe('MuiBadge', () => {
    const badgeBadge = theme.components.MuiBadge.styleOverrides.badge;

    it('has @keyframes badgePop', () => {
      expect(badgeBadge['@keyframes badgePop']).toBeDefined();
    });

    it('has animation with badgePop', () => {
      expect(badgeBadge.animation).toContain('badgePop');
    });
  });

  // ─── MuiSnackbar ─────────────────────────────────────────────────────────

  describe('MuiSnackbar', () => {
    const snackRoot = theme.components.MuiSnackbar.styleOverrides.root;

    it('has @keyframes snackSlideUp', () => {
      expect(snackRoot['@keyframes snackSlideUp']).toBeDefined();
    });

    it('has animation with snackSlideUp', () => {
      expect(snackRoot.animation).toContain('snackSlideUp');
    });
  });

  // ─── MuiTooltip ──────────────────────────────────────────────────────────

  describe('MuiTooltip', () => {
    const tooltipRoot = theme.components.MuiTooltip.styleOverrides.tooltip;

    it('has @keyframes tooltipFade', () => {
      expect(tooltipRoot['@keyframes tooltipFade']).toBeDefined();
    });

    it('has animation with tooltipFade', () => {
      expect(tooltipRoot.animation).toContain('tooltipFade');
    });
  });

  // ─── MuiSkeleton ────────────────────────────────────────────────────────

  describe('MuiSkeleton', () => {
    const skeletonRoot = theme.components.MuiSkeleton.styleOverrides.root;

    it('has dark background color', () => {
      expect(skeletonRoot.backgroundColor).toContain('rgba');
    });

    it('has shimmer gradient in ::after pseudo-element', () => {
      expect(skeletonRoot['&::after']).toBeDefined();
      expect(skeletonRoot['&::after'].background).toContain('linear-gradient');
    });
  });

  // ─── Cross-cutting validation ────────────────────────────────────────────

  describe('CSS value validity', () => {
    it('all transition values contain valid time units', () => {
      const components = theme.components;
      const transitionComponents = [
        'MuiButton',
        'MuiCard',
        'MuiIconButton',
        'MuiOutlinedInput',
        'MuiFab',
        'MuiListItemButton',
        'MuiTab',
      ];

      transitionComponents.forEach((comp) => {
        const root = components[comp]?.styleOverrides?.root;
        if (root?.transition) {
          // Valid transitions contain ms or s time units
          expect(root.transition).toMatch(/\d+ms|\d+(\.\d+)?s/);
        }
      });
    });

    it('all animation values reference @keyframes names', () => {
      const animatedComponents = [
        {name: 'MuiDialog', path: 'paper'},
        {name: 'MuiFab', path: 'root'},
        {name: 'MuiChip', path: 'root'},
        {name: 'MuiBadge', path: 'badge'},
        {name: 'MuiSnackbar', path: 'root'},
        {name: 'MuiTooltip', path: 'tooltip'},
      ];

      animatedComponents.forEach(({name, path}) => {
        const overrides = theme.components[name]?.styleOverrides?.[path];
        if (overrides?.animation) {
          // Animation shorthand should contain the keyframe name
          const keyframeKeys = Object.keys(overrides).filter((k) =>
            k.startsWith('@keyframes')
          );
          expect(keyframeKeys.length).toBeGreaterThanOrEqual(1);

          // The keyframe name used in animation should match a defined @keyframes
          keyframeKeys.forEach((kfKey) => {
            const kfName = kfKey.replace('@keyframes ', '');
            expect(overrides.animation).toContain(kfName);
          });
        }
      });
    });

    it('easing values are valid cubic-bezier or keywords', () => {
      const components = theme.components;
      const transitionComponents = [
        'MuiButton',
        'MuiCard',
        'MuiIconButton',
        'MuiFab',
      ];

      transitionComponents.forEach((comp) => {
        const root = components[comp]?.styleOverrides?.root;
        if (root?.transition) {
          // Should contain cubic-bezier or standard easing keyword
          expect(root.transition).toMatch(/cubic-bezier|ease|linear/);
        }
      });
    });
  });
});
