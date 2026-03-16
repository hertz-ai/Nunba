/**
 * Social Module Structure Tests
 * Verifies that all Social/Gamification components are properly exported and structured
 */

// Mock uuid ESM module that NunbaChatProvider imports
jest.mock('uuid', () => ({v4: () => 'test-uuid'}));

describe('Social Module Structure', () => {
  describe('Shared Components', () => {
    test('ResonanceWallet component exists', () => {
      const ResonanceWallet =
        require('../../../components/Social/shared/ResonanceWallet').default;
      expect(ResonanceWallet).toBeDefined();
    });

    test('LevelBadge component exists', () => {
      const LevelBadge =
        require('../../../components/Social/shared/LevelBadge').default;
      expect(LevelBadge).toBeDefined();
    });

    test('ChallengeCard component exists', () => {
      const ChallengeCard =
        require('../../../components/Social/shared/ChallengeCard').default;
      expect(ChallengeCard).toBeDefined();
    });

    test('SeasonBanner component exists', () => {
      const SeasonBanner =
        require('../../../components/Social/shared/SeasonBanner').default;
      expect(SeasonBanner).toBeDefined();
    });

    test('TrustScore component exists', () => {
      const TrustScore =
        require('../../../components/Social/shared/TrustScore').default;
      expect(TrustScore).toBeDefined();
    });

    test('StarRating component exists', () => {
      const StarRating =
        require('../../../components/Social/shared/StarRating').default;
      expect(StarRating).toBeDefined();
    });

    test('OnboardingChecklist component exists', () => {
      const OnboardingChecklist =
        require('../../../components/Social/shared/OnboardingChecklist').default;
      expect(OnboardingChecklist).toBeDefined();
    });

    test('EvolutionTimeline component exists', () => {
      const EvolutionTimeline =
        require('../../../components/Social/shared/EvolutionTimeline').default;
      expect(EvolutionTimeline).toBeDefined();
    });

    test('ProposalCard component exists', () => {
      const ProposalCard =
        require('../../../components/Social/shared/ProposalCard').default;
      expect(ProposalCard).toBeDefined();
    });
  });

  describe('Gamification Pages', () => {
    test('ResonanceDashboard page exists', () => {
      const ResonanceDashboard =
        require('../../../components/Social/Gamification/ResonanceDashboard').default;
      expect(ResonanceDashboard).toBeDefined();
    });

    test('AchievementsPage exists', () => {
      const AchievementsPage =
        require('../../../components/Social/Gamification/AchievementsPage').default;
      expect(AchievementsPage).toBeDefined();
    });

    test('ChallengesPage exists', () => {
      const ChallengesPage =
        require('../../../components/Social/Gamification/ChallengesPage').default;
      expect(ChallengesPage).toBeDefined();
    });

    test('ChallengeDetailPage exists', () => {
      const ChallengeDetailPage =
        require('../../../components/Social/Gamification/ChallengeDetailPage').default;
      expect(ChallengeDetailPage).toBeDefined();
    });

    test('SeasonPage exists', () => {
      const SeasonPage =
        require('../../../components/Social/Gamification/SeasonPage').default;
      expect(SeasonPage).toBeDefined();
    });
  });

  describe('Other Social Pages', () => {
    test('SocialHome exists', () => {
      const SocialHome =
        require('../../../components/Social/SocialHome').default;
      expect(SocialHome).toBeDefined();
    });

    test('SocialLayout exists', () => {
      const SocialLayout =
        require('../../../components/Social/SocialLayout').default;
      expect(SocialLayout).toBeDefined();
    });

    test('RegionsPage exists', () => {
      const RegionsPage =
        require('../../../components/Social/Regions/RegionsPage').default;
      expect(RegionsPage).toBeDefined();
    });

    test('RegionDetailPage exists', () => {
      const RegionDetailPage =
        require('../../../components/Social/Regions/RegionDetailPage').default;
      expect(RegionDetailPage).toBeDefined();
    });

    test('CampaignsPage exists', () => {
      const CampaignsPage =
        require('../../../components/Social/Campaigns/CampaignsPage').default;
      expect(CampaignsPage).toBeDefined();
    });

    test('CampaignStudio exists', () => {
      const CampaignStudio =
        require('../../../components/Social/Campaigns/CampaignStudio').default;
      expect(CampaignStudio).toBeDefined();
    });

    test('AgentEvolutionPage exists', () => {
      const AgentEvolutionPage =
        require('../../../components/Social/Evolution/AgentEvolutionPage').default;
      expect(AgentEvolutionPage).toBeDefined();
    });

    test('OnboardingOverlay exists', () => {
      const OnboardingOverlay =
        require('../../../components/Social/Onboarding/OnboardingOverlay').default;
      expect(OnboardingOverlay).toBeDefined();
    });
  });
});
