/**
 * Per-surface copy, quick actions and the welcome layout.
 *
 * The welcome state is a ServerDrivenUI layout (the same JSON contract
 * HARTOS `dynamic_layout` uses), so the agent can replace it with its own
 * layout without an embed release.  Icon names must exist in ../iconMap.js.
 */

function welcome(icon, title, body, note) {
  return {
    type: 'column',
    style: {alignItems: 'center', textAlign: 'center', gap: '8px', padding: '8px 4px 4px'},
    children: [
      {
        type: 'box',
        style: {
          width: '64px', height: '64px', borderRadius: '50%', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--hart-accent-soft, rgba(155,148,255,0.16))',
          border: '1px solid rgba(255,255,255,0.14)',
        },
        children: [{type: 'icon', props: {name: icon, size: 32, color: 'var(--hart-accent, #9b94ff)'}}],
      },
      {type: 'text', props: {text: title, variant: 'h6', component: 'h2'}, style: {fontWeight: 700, color: '#fff', lineHeight: 1.3}},
      {type: 'text', props: {text: body, variant: 'body2', component: 'p'}, style: {color: 'rgba(255,255,255,0.78)', maxWidth: '300px'}},
      note ? {type: 'text', props: {text: note, variant: 'caption', component: 'p'}, style: {color: 'rgba(255,255,255,0.72)'}} : null,
    ].filter(Boolean),
  };
}

export function surfaceConfig(surface, agentName) {
  switch (surface) {
    case 'merchant-onboarding':
      return {
        title: 'Store setup',
        subtitle: 'Onboard your store and products',
        placeholder: 'e.g. onboard my store …',
        suggestions: [
          'Onboard my store Sri Balaji Stores in 600078',
          'Add SKU Amul Butter 100g ₹56',
        ],
        welcome: welcome('Storefront', 'Get your store on McGroce',
          'Tell me your store name and pincode, then list products by just typing them.',
          'You review everything before it goes live.'),
      };
    case 'marketing':
      return {
        title: 'Marketing',
        subtitle: 'Campaigns for your customers',
        placeholder: 'e.g. draft a Diwali campaign',
        suggestions: [
          'Draft a Diwali campaign for my customers',
          'Draft a Pongal campaign for my customers',
        ],
        welcome: welcome('Campaign', 'Reach your regulars',
          'I draft festive offers and messages for your customers. You edit and approve.',
          'Nothing is sent without your approval.'),
      };
    case 'voice':
      return {
        title: agentName,
        subtitle: 'Voice shopping',
        placeholder: 'Type instead…',
        suggestions: ['Add 2 milk', "What's in my cart?", 'Checkout'],
        welcome: null,
      };
    default:
      return {
        title: agentName,
        subtitle: 'Your shopping assistant',
        placeholder: `Ask ${agentName}…`,
        suggestions: ['Add 2 milk', 'Find paneer', "What's in my cart?", 'Track my order'],
        welcome: welcome('AutoAwesome', 'What can I get you today?',
          'I find products, fill your cart, pay with your approval and track your order.',
          'Nothing is bought without your approval.'),
      };
  }
}
