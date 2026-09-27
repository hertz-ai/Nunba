/**
 * demoTransport — DEMO ONLY: an offline, deterministic stand-in for HARTOS.
 *
 * On when the element has the `demo` attribute or no `gateway-url`.  It is
 * labelled "Demo agent · offline" in the UI.  It never calls a server: it
 * parses a small set of commerce intents, asks the HOST for data through
 * the same hart:action contract the real agent's cards use, and emits the
 * SAME fragment types HARTOS commerce tools push (PLAN §5.2, §11 rule 1):
 * product_card, cart, checkout, approval, payment_status, order_tracking,
 * form, notification, metric, agent_action.  Nothing here invents a type.
 *
 * Every reply first lands as a draft bubble and is then replaced in place
 * via its speculation_id — the same draft→expert path LiquidOverlay uses.
 */

import {
  categoryGlyph, inferCategory, searchDemoCatalog, tileImage,
} from './demoCatalog';

import {formatMoney} from '../../constants/liquidFragments';

const NUMBER_WORDS = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, dozen: 12,
};

const OCCASIONS = {
  diwali: {name: 'Diwali', date: '2026-11-08', emoji: '🪔', offer: '15% off sweets, dry fruits and ghee'},
  deepavali: {name: 'Deepavali', date: '2026-11-08', emoji: '🪔', offer: '15% off sweets, dry fruits and ghee'},
  pongal: {name: 'Pongal', date: '2027-01-14', emoji: '🌾', offer: '10% off rice, jaggery and moong dal'},
  christmas: {name: 'Christmas', date: '2026-12-25', emoji: '🎄', offer: '10% off cakes, cocoa and baking needs'},
  'new year': {name: 'New Year', date: '2027-01-01', emoji: '🎉', offer: '10% off party snacks and beverages'},
};

function clean(text) {
  return String(text || '')
    .replace(/[“”"'‘’]/g, '')
    .replace(/[?!.]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseQty(tok) {
  if (!tok) return 1;
  const n = parseInt(tok, 10);
  if (Number.isFinite(n) && n > 0) return Math.min(n, 99);
  return NUMBER_WORDS[tok.toLowerCase()] || 1;
}

/**
 * Deterministic intent parser.  Order matters: the most specific intents
 * (new SKU, onboarding, campaign) are tested before the generic add/find.
 */
export function parseIntent(input) {
  const raw = clean(input);
  const t = raw.toLowerCase();
  let m;

  if (!t) return {intent: 'empty'};

  m = raw.match(/^(?:add|create|new|list)\s+(?:a\s+)?(?:new\s+)?sku\s+(.+?)\s*(?:@|at|for|price)?\s*(?:₹|rs\.?|inr)\s*(\d+(?:\.\d+)?)\s*$/i);
  if (m) return {intent: 'sku.create', name: m[1].trim(), price: Number(m[2])};

  m = raw.match(/onboard\s+(?:my\s+)?(?:store|shop|kirana)\s+(.+?)\s+(?:in|at|pincode|pin|,)\s*(\d{6})\b/i);
  if (m) return {intent: 'merchant.onboard', name: m[1].trim(), pincode: m[2]};
  m = raw.match(/onboard\s+(?:my\s+)?(?:store|shop|kirana)\s*(.*)$/i);
  if (m) return {intent: 'merchant.onboard', name: m[1].trim() || '', pincode: ''};

  if (/\b(campaign|promotion|broadcast|festive offer)\b/i.test(t)) {
    const occ = Object.keys(OCCASIONS).find((k) => t.includes(k));
    return {intent: 'campaign.draft', occasion: occ || null};
  }

  if (/\btrack\b|where(?:s| is) my order|order status|my orders?$/.test(t)) {
    return {intent: 'order.track'};
  }

  if (/^(?:checkout|check out|place (?:the |my )?order|pay(?: now)?|buy (?:it|them|everything)|proceed to (?:pay|checkout))$/.test(t)
      || /\b(checkout|check out)\b/.test(t)) {
    return {intent: 'checkout'};
  }

  if (/(what(?:s| is)? in my cart|show (?:me )?(?:my )?cart|view (?:my )?cart|^(?:my )?cart$|cart total)/.test(t)) {
    return {intent: 'cart.view'};
  }

  m = t.match(/^(?:remove|delete|drop)\s+(?:(\d+|a|an|one|two|three)\s+)?(.+?)(?:\s+from\s+(?:my\s+)?cart)?$/);
  if (m) return {intent: 'cart.remove', qty: m[1] ? parseQty(m[1]) : null, query: m[2]};

  m = t.match(/^(?:add|buy|order|get|i want|i need|send)\s+(?:me\s+)?(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|dozen)?\s*(?:x\s+|packets? of\s+|packs? of\s+|litres? of\s+|kg of\s+)?(.+?)(?:\s+to\s+(?:my\s+)?cart)?$/);
  if (m && m[2]) return {intent: 'cart.add', qty: parseQty(m[1]), query: m[2]};

  m = t.match(/^(?:find|search(?: for)?|show(?: me)?|look for|looking for|do you have|any|i(?:m| am) looking for)\s+(.+)$/);
  if (m) return {intent: 'catalog.find', query: m[1]};

  if (/^(hi|hello|hey|vanakkam|namaste)\b/.test(t)) return {intent: 'greet'};
  if (/\b(help|what can you do)\b/.test(t)) return {intent: 'help'};

  return {intent: 'catalog.find', query: t, implicit: true};
}

const SHOPPER_SUGGESTIONS = ['Add 2 milk', 'Find paneer', "What's in my cart?", 'Track my order'];

function productFromHost(item) {
  if (!item) return null;
  const price = typeof item.price === 'object' && item.price
    ? Number(item.price.amount) : Number(item.price);
  return {
    sku: item.sku || item.sku_id || item.skuId || item.id || item.product_id || item.productId,
    product_id: item.product_id || item.productId || item.id || item.sku,
    category_id: item.category_id || item.categoryId,
    name: item.name || item.title || 'Item',
    price: Number.isFinite(price) ? price : 0,
    currency: item.currency || (item.price && item.price.currency) || 'INR',
    image: item.image || item.image_url || item.imageUrl || item.thumbnail || null,
    rating: item.rating,
    description: item.description,
  };
}

function productCard(prod) {
  return {
    type: 'product_card',
    name: prod.name,
    price: prod.price,
    currency: prod.currency || 'INR',
    image: prod.image || tileImage(categoryGlyph(inferCategory(prod.name)), inferCategory(prod.name)),
    image_url: prod.image || undefined,
    rating: prod.rating,
    description: prod.description,
    sku: prod.sku,
    product_id: prod.product_id,
    category_id: prod.category_id,
    buy_action: 'cart.add',
  };
}

function cartFragment(cart) {
  return {
    type: 'cart',
    items: cart.items.map((l) => ({
      name: l.name, qty: l.qty, sku: l.sku,
      price: formatMoney(l.price * l.qty, cart.currency),
    })),
    total: cart.total,
    currency: cart.currency,
    checkout_action: 'checkout.start',
  };
}

function normaliseCart(c) {
  if (!c || !Array.isArray(c.items)) return null;
  const items = c.items.map((l) => ({
    sku: l.sku || l.sku_id || l.id,
    name: l.name || 'Item',
    qty: Number(l.qty || l.quantity || 1),
    price: Number(typeof l.price === 'object' && l.price ? l.price.amount : (l.unit_price ?? l.price ?? 0)),
  }));
  const total = Number(typeof c.total === 'object' && c.total ? c.total.amount
    : (c.total ?? items.reduce((s, l) => s + l.price * l.qty, 0)));
  return {items, total, currency: c.currency || 'INR'};
}

/** Tiny deterministic, order-independent hash for the AP2 cart hash. */
function cartHash(cart) {
  const s = JSON.stringify(cart.items.map((l) => [l.sku, l.qty, l.price])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))) + `|${cart.total}|${cart.currency}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * @param {object} opts
 * @param {object} opts.sink        embedSession sink
 * @param {number} [opts.delayMs]   draft→expert delay (0 in tests)
 * @param {number} [opts.hostTimeoutMs] how long to wait for the host
 * @param {string} [opts.storeName]
 */
export function createDemoTransport({sink, delayMs = 420, hostTimeoutMs = 2500, storeName} = {}) {
  let seq = 0;
  let orderSeq = 24816;
  const mirror = new Map(); // sku -> {sku,name,qty,price}
  const mandates = new Map(); // action -> mandate
  const skuDrafts = new Map();
  const merchantDrafts = new Map();
  let lastOrder = null;
  let lastProducts = [];

  const wait = (ms) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

  function mirrorCart() {
    const items = Array.from(mirror.values());
    return {items, total: items.reduce((s, l) => s + l.price * l.qty, 0), currency: 'INR'};
  }

  function currentCart(ctx) {
    return normaliseCart(ctx && ctx.cart) || mirrorCart();
  }

  function store(ctx) {
    return (ctx && ((ctx.store && ctx.store.name) || (ctx.merchant && ctx.merchant.name)))
      || storeName || 'your store';
  }

  async function reply(draftText, work) {
    seq += 1;
    const speculationId = `demo-spec-${seq}`;
    sink.message({text: draftText, speculationId, isDraft: true, source: 'draft'});
    await wait(delayMs);
    const out = await work();
    sink.replaceDraft(speculationId, out.text, 'demo', {
      suggestions: out.suggestions, tone: out.tone,
    });
    (out.fragments || []).forEach((f) => sink.fragment(f, 'mcgroce_demo'));
  }

  async function searchProducts(query, limit = 3) {
    const res = await sink.request('catalog.search', {q: query, limit}, {timeoutMs: hostTimeoutMs});
    if (res.ok) {
      const list = Array.isArray(res.data) ? res.data
        : (res.data && (res.data.items || res.data.products || res.data.results)) || [];
      return {items: list.map(productFromHost).filter(Boolean).slice(0, limit), from: 'host'};
    }
    if (res.code === 'timeout' || res.code === 'no_host') {
      return {items: searchDemoCatalog(query, limit), from: 'demo'};
    }
    return {items: [], from: 'host', error: res.error};
  }

  async function addToCart(prod, qty) {
    const payload = {
      sku: prod.sku, productId: prod.product_id, categoryId: prod.category_id,
      name: prod.name, qty, price: prod.price, currency: prod.currency || 'INR',
    };
    const res = await sink.request('cart.add', payload, {timeoutMs: hostTimeoutMs});
    if (!res.ok && res.code !== 'timeout' && res.code !== 'no_host') return {ok: false, error: res.error};
    const line = mirror.get(prod.sku) || {sku: prod.sku, name: prod.name, qty: 0, price: prod.price};
    line.qty += qty;
    mirror.set(prod.sku, line);
    const hostCart = res.ok && res.data && normaliseCart(res.data.cart || res.data);
    return {ok: true, cart: hostCart || mirrorCart(), offline: !res.ok};
  }

  // ── intents ──────────────────────────────────────────────────────────

  async function onFind(query, ctx, implicit) {
    const found = await searchProducts(query, 3);
    lastProducts = found.items;
    if (found.error) {
      return {text: `I couldn't search the store just now (${found.error}). Try again in a moment.`, tone: 'error', suggestions: ['Find paneer']};
    }
    if (found.items.length === 0) {
      return {
        text: implicit
          ? `I can help you shop at ${store(ctx)}. Try "add 2 milk", "find paneer" or "track my order".`
          : `I couldn't find "${query}" at ${store(ctx)}. Try milk, paneer, bread or eggs.`,
        suggestions: SHOPPER_SUGGESTIONS,
      };
    }
    const n = found.items.length;
    return {
      text: `Here ${n === 1 ? 'is 1 option' : `are ${n} options`} for ${query}. Tap Add to put one in your cart.`,
      fragments: found.items.map(productCard),
      suggestions: [`Add 1 ${found.items[0].name}`, "What's in my cart?"],
    };
  }

  async function onAdd(query, qty) {
    const found = await searchProducts(query, 1);
    const prod = found.items[0];
    if (!prod) {
      return {text: `I couldn't find "${query}". Try "find ${query.split(' ')[0]}" to see what's in stock.`, suggestions: ['Find milk', 'Find paneer']};
    }
    const res = await addToCart(prod, qty);
    if (!res.ok) {
      return {text: `I couldn't add ${prod.name}: ${res.error}`, tone: 'error', suggestions: [`Add ${qty} ${query}`]};
    }
    const cart = res.cart;
    const count = cart.items.reduce((s, l) => s + l.qty, 0);
    return {
      text: `Added ${qty} × ${prod.name} (${formatMoney(prod.price * qty, 'INR')}). You have ${count} item${count === 1 ? '' : 's'} · ${formatMoney(cart.total, cart.currency)}.`,
      fragments: [cartFragment(cart)],
      suggestions: ['Checkout', 'Find paneer'],
    };
  }

  async function onRemove(query, qty) {
    const hit = Array.from(mirror.values()).find((l) => l.name.toLowerCase().includes(query.toLowerCase().split(' ')[0]));
    if (!hit) return {text: `There's no ${query} in your cart.`, suggestions: ["What's in my cart?"]};
    const removeQty = qty ? Math.min(qty, hit.qty) : hit.qty;
    const res = await sink.request(removeQty >= hit.qty ? 'cart.remove' : 'cart.update',
      {sku: hit.sku, qty: hit.qty - removeQty}, {timeoutMs: hostTimeoutMs});
    if (!res.ok && res.code !== 'timeout' && res.code !== 'no_host') {
      return {text: `I couldn't update your cart: ${res.error}`, tone: 'error'};
    }
    hit.qty -= removeQty;
    if (hit.qty <= 0) mirror.delete(hit.sku);
    const cart = mirrorCart();
    return {
      text: `Removed ${removeQty} × ${hit.name}.`,
      fragments: cart.items.length ? [cartFragment(cart)] : [],
      suggestions: cart.items.length ? ['Checkout'] : ['Add 2 milk'],
    };
  }

  function onCartView(ctx) {
    const cart = currentCart(ctx);
    if (!cart.items.length) {
      return {text: 'Your cart is empty. Try "add 2 milk" or "find paneer".', suggestions: ['Add 2 milk', 'Find paneer']};
    }
    const count = cart.items.reduce((s, l) => s + l.qty, 0);
    return {
      text: `You have ${count} item${count === 1 ? '' : 's'} worth ${formatMoney(cart.total, cart.currency)}.`,
      fragments: [cartFragment(cart)],
      suggestions: ['Checkout', 'Add 2 milk'],
    };
  }

  function onCheckout(ctx) {
    const cart = currentCart(ctx);
    if (!cart.items.length) {
      return {text: 'Your cart is empty, so there is nothing to pay for yet.', suggestions: ['Add 2 milk']};
    }
    seq += 1;
    const itemCount = cart.items.reduce((s, l) => s + l.qty, 0);
    const paymentId = `pay_demo_${seq}`;
    const action = `ap2_pay:${paymentId}`;
    const mandate = {
      mandate_id: `mnd_demo_${seq}`, payment_id: paymentId, merchant: store(ctx),
      amount: cart.total, currency: cart.currency, cart_hash: cartHash(cart),
      status: 'pending', items: cart.items,
    };
    mandates.set(action, mandate);
    return {
      text: `Your total is ${formatMoney(cart.total, cart.currency)}. Approve the payment and I'll place the order — nothing is charged until you do.`,
      fragments: [
        {
          type: 'checkout',
          items: cart.items.map((l) => ({name: l.name, qty: l.qty})),
          items_count: cart.items.reduce((s, l) => s + l.qty, 0),
          total: cart.total, currency: cart.currency,
          payment_methods: ['UPI', 'Card', 'Cash on delivery'],
          confirm_action: action,
          approval_action: action,
        },
        {
          type: 'approval',
          title: 'Approve payment',
          description: `Pay ${formatMoney(cart.total, cart.currency)} to ${mandate.merchant} for ${itemCount} item${itemCount === 1 ? '' : 's'}.`,
          action,
          options: [`Pay ${formatMoney(cart.total, cart.currency)}`, 'Cancel', 'Later'],
        },
      ],
    };
  }

  function trackingFragment(order) {
    const steps = ['Order placed', 'Accepted by store', 'Out for delivery', 'Delivered'];
    const at = Math.max(0, steps.indexOf(order.status));
    return {
      type: 'order_tracking',
      order_id: order.order_id,
      status: order.status,
      steps: steps.map((label, i) => ({label, completed: i <= at, current: i === at})),
      eta: order.eta,
    };
  }

  function onTrack(ctx) {
    const fromHost = ctx && Array.isArray(ctx.orders) && ctx.orders[0];
    const order = fromHost
      ? {order_id: fromHost.order_id || fromHost.orderNumber || fromHost.id, status: fromHost.status || 'Accepted by store', eta: fromHost.eta}
      : (lastOrder || {order_id: 'MG-24816', status: 'Out for delivery', eta: 'about 12 min'});
    if (!order.order_id) return {text: "You don't have an active order right now.", suggestions: ['Add 2 milk']};
    return {
      text: `Order ${order.order_id} is ${String(order.status).toLowerCase()}${order.eta ? ` — ${order.eta} away` : ''}.`,
      fragments: [trackingFragment(order)],
      suggestions: ['Add 2 milk'],
    };
  }

  function onOnboard(name, pincode) {
    seq += 1;
    const draftId = `mrc_demo_${seq}`;
    merchantDrafts.set(draftId, {name, pincode});
    return {
      text: name
        ? `Let's get ${name} live on McGroce. I've filled in what I know — add your phone and email, then submit.`
        : "Let's get your store live on McGroce. Tell me a few details.",
      fragments: [{
        type: 'form',
        title: name ? `Onboard ${name}` : 'Onboard your store',
        action: 'merchant.onboard',
        draft_id: draftId,
        submit_label: 'Submit for review',
        fields: [
          {name: 'display_name', label: 'Store name', value: name, required: true},
          {name: 'zip', label: 'Pincode', value: pincode, required: true, type: 'text', inputMode: 'numeric'},
          {name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: '10-digit mobile'},
          {name: 'email', label: 'Email', type: 'email', required: true},
          {name: 'address', label: 'Street address', placeholder: 'Shop no., street, area'},
          {name: 'delivery_radius_km', label: 'Delivery radius (km)', type: 'number', value: '5'},
          {name: 'min_order_inr', label: 'Minimum order (₹)', type: 'number', value: '0'},
        ],
      }],
    };
  }

  function onSku(name, price, ctx) {
    seq += 1;
    const draftId = `sku_demo_${seq}`;
    const category = inferCategory(name);
    const draft = {draft_id: draftId, name, price_inr: price, category, merchant: store(ctx)};
    skuDrafts.set(`sku_publish:${draftId}`, draft);
    return {
      text: `Here's the listing for ${name}. Approve it and it goes live at ${formatMoney(price, 'INR')}.`,
      fragments: [
        {
          type: 'product_card',
          name, price, currency: 'INR', description: `New SKU · ${category} · draft`,
          image: tileImage(categoryGlyph(category), category),
          sku: draftId,
        },
        {
          type: 'approval',
          title: 'Publish new SKU?',
          description: `${name} at ${formatMoney(price, 'INR')} in ${category}.`,
          action: `sku_publish:${draftId}`,
          options: ['Publish', 'Discard', 'Later'],
        },
      ],
    };
  }

  function onCampaign(occasionKey, ctx) {
    const occ = OCCASIONS[occasionKey] || {name: 'Weekend', date: '', emoji: '🛒', offer: '10% off fresh produce'};
    const shop = store(ctx);
    return {
      text: `Here's a ${occ.name} campaign draft for ${shop}. Edit anything, then save it — nothing is sent to customers until you approve it.`,
      fragments: [
        {
          type: 'form',
          title: `${occ.name} campaign`,
          action: 'campaign.draft',
          submit_label: 'Save draft',
          fields: [
            {name: 'title', label: 'Campaign name', value: `${occ.name} Dhamaka`, required: true},
            {name: 'message', label: 'Message', type: 'textarea', required: true,
              value: `${occ.emoji} This ${occ.name}, celebrate with ${shop}! Get ${occ.offer}. Free delivery above ₹499 — order on McGroce.`},
            {name: 'audience', label: 'Send to', value: 'Customers who ordered in the last 90 days'},
            {name: 'channel', label: 'Channel', value: 'WhatsApp and SMS'},
            {name: 'send_on', label: 'Send on', type: 'date', value: occ.date},
          ],
        },
        {type: 'metric', label: 'Estimated reach', value: 1240, unit: ' customers', trend: 'up'},
      ],
    };
  }

  async function send(text, {context} = {}) {
    const intent = parseIntent(text);
    const ctx = context || sink.getContext() || {};
    switch (intent.intent) {
      case 'cart.add':
        return reply(`Finding ${intent.query}…`, () => onAdd(intent.query, intent.qty));
      case 'cart.remove':
        return reply('Updating your cart…', () => onRemove(intent.query, intent.qty));
      case 'catalog.find':
        return reply(`Looking for ${intent.query}…`, () => onFind(intent.query, ctx, intent.implicit));
      case 'cart.view':
        return reply('Checking your cart…', () => onCartView(ctx));
      case 'checkout':
        return reply('Preparing checkout…', () => onCheckout(ctx));
      case 'order.track':
        return reply('Checking your order…', () => onTrack(ctx));
      case 'merchant.onboard':
        return reply('Setting up your store…', () => onOnboard(intent.name, intent.pincode));
      case 'sku.create':
        return reply('Drafting the listing…', () => onSku(intent.name, intent.price, ctx));
      case 'campaign.draft':
        return reply('Writing a draft…', () => onCampaign(intent.occasion, ctx));
      case 'greet':
      case 'help':
      default:
        return reply('…', () => ({
          text: `Vanakkam! I'm the ${store(ctx)} assistant. I can find products, fill your cart, check out and track orders.`,
          suggestions: SHOPPER_SUGGESTIONS,
        }));
    }
  }

  // ── fragment buttons ─────────────────────────────────────────────────

  async function decideApproval({action, decision}) {
    if (mandates.has(action)) return decidePayment(action, decision);
    if (skuDrafts.has(action)) return decideSku(action, decision);
    return {ok: false, error: 'This approval has expired.'};
  }

  async function decidePayment(action, decision) {
    const mandate = mandates.get(action);
    if (mandate.status !== 'pending') {
      return {ok: false, error: `This payment is already ${mandate.status}.`};
    }
    const patchCard = (patch) => sink.patchInline(
      (f) => f.type === 'checkout' && f.approval_action === action, patch);
    if (decision === 'deny') {
      mandate.status = 'rejected';
      patchCard({cancelled: true});
      sink.message({text: "Okay, I've cancelled that payment. Your cart is unchanged.", suggestions: ["What's in my cart?"]});
      return {ok: true};
    }
    if (decision === 'later') {
      sink.message({text: 'No problem — say "checkout" whenever you are ready.'});
      return {ok: true};
    }
    // AP2: the HOST confirms and authorizes (user gesture, its own payment
    // rails).  The embed never POSTs a payment URL itself.
    const res = await sink.request('payment.authorize', {
      mandate: {
        mandate_id: mandate.mandate_id, payment_id: mandate.payment_id,
        cart_hash: mandate.cart_hash, merchant: mandate.merchant,
      },
      amount: mandate.amount, currency: mandate.currency, merchant: mandate.merchant,
    }, {timeoutMs: 60000});
    if (!res.ok) {
      sink.fragment({type: 'payment_status', status: 'error', amount: formatMoney(mandate.amount, mandate.currency)}, 'mcgroce_demo');
      sink.message({text: `The payment didn't go through: ${res.error} Your cart is safe — try again when you're ready.`, tone: 'error', suggestions: ['Checkout']});
      return {ok: false, error: res.error};
    }
    mandate.status = 'consumed';
    orderSeq += 1;
    const orderId = (res.data && (res.data.order_id || res.data.orderNumber)) || `MG-${orderSeq}`;
    lastOrder = {order_id: orderId, status: 'Accepted by store', eta: 'about 25 min'};
    mirror.clear();
    patchCard({paid: true, order_id: orderId});
    sink.patchInline((f) => f.type === 'cart', {superseded: true, ordered: true});
    sink.fragment({
      type: 'payment_status', status: 'success',
      amount: formatMoney(mandate.amount, mandate.currency),
      method: (res.data && res.data.method) || 'UPI · AP2 mandate',
      transaction_id: (res.data && res.data.transaction_id) || mandate.payment_id,
    }, 'mcgroce_demo');
    sink.fragment(trackingFragment(lastOrder), 'mcgroce_demo');
    sink.message({
      text: `Paid ${formatMoney(mandate.amount, mandate.currency)}. Order ${orderId} is confirmed — ${mandate.merchant} is packing it now.`,
      suggestions: ['Track my order'],
    });
    return {ok: true, data: {order_id: orderId}};
  }

  async function decideSku(action, decision) {
    const draft = skuDrafts.get(action);
    if (decision === 'deny') {
      skuDrafts.delete(action);
      sink.message({text: `Discarded the ${draft.name} draft.`});
      return {ok: true};
    }
    if (decision === 'later') {
      sink.message({text: `I'll keep the ${draft.name} draft for later.`});
      return {ok: true};
    }
    const res = await sink.request('merchant.sku.upsert', draft, {timeoutMs: hostTimeoutMs * 4});
    if (!res.ok) {
      sink.message({text: `Couldn't publish ${draft.name}: ${res.error}`, tone: 'error'});
      return {ok: false, error: res.error};
    }
    skuDrafts.delete(action);
    sink.fragment({type: 'notification', severity: 'success', title: 'SKU published', message: `${draft.name} is live at ${formatMoney(draft.price_inr, 'INR')}.`}, 'mcgroce_demo');
    sink.message({text: `${draft.name} is live. Customers near ${draft.merchant} can order it now.`, suggestions: ['Draft a Diwali campaign for my customers']});
    return {ok: true, data: res.data};
  }

  function validate(kind, v) {
    const errors = {};
    if (kind === 'merchant.onboard') {
      if (!String(v.display_name || '').trim()) errors.display_name = 'Enter your store name';
      if (!/^\d{6}$/.test(String(v.zip || '').trim())) errors.zip = 'Enter a 6-digit pincode';
      if (!/^(?:\+?91[\s-]?)?[6-9]\d{9}$/.test(String(v.phone || '').replace(/\s/g, ''))) errors.phone = 'Enter a 10-digit mobile number';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v.email || '').trim())) errors.email = 'Enter a valid email';
    }
    if (kind === 'campaign.draft') {
      if (!String(v.title || '').trim()) errors.title = 'Give the campaign a name';
      if (!String(v.message || '').trim()) errors.message = 'Write a message';
    }
    return errors;
  }

  async function submitForm({action, values, form}) {
    const kind = action;
    const v = values || {};
    const fieldErrors = validate(kind, v);
    if (Object.keys(fieldErrors).length) {
      return {ok: false, fieldErrors, error: 'Please fix the highlighted fields.'};
    }
    const payload = kind === 'merchant.onboard'
      ? {...v, draft_id: form && form.draft_id, delivery_radius_km: Number(v.delivery_radius_km || 5), min_order_inr: Number(v.min_order_inr || 0)}
      : v;
    const res = await sink.request(kind, payload, {timeoutMs: hostTimeoutMs * 4});
    if (!res.ok && res.code !== 'timeout' && res.code !== 'no_host') {
      return {ok: false, error: res.error};
    }
    if (kind === 'merchant.onboard') {
      sink.fragment({type: 'agent_action', action: 'Store submitted', description: `${v.display_name} · ${v.zip}`, status: 'completed', result: 'We\'ll email a secure link to set your password.'}, 'mcgroce_demo');
      sink.message({text: `${v.display_name} is submitted for review. Next, add your first product — e.g. "add SKU Amul Butter 100g ₹56".`, suggestions: ['Add SKU Amul Butter 100g ₹56']});
    } else if (kind === 'campaign.draft') {
      sink.fragment({type: 'notification', severity: 'success', title: 'Draft saved', message: `"${v.title}" is saved. Nothing is sent until you approve it.`}, 'mcgroce_demo');
      sink.message({text: `Saved "${v.title}" as a draft.`});
    }
    return {ok: true, data: res.data, offline: !res.ok};
  }

  async function handleAction(kind, payload) {
    if (kind === 'approval.decide') return decideApproval(payload);
    if (kind === 'checkout.confirm') {
      return decideApproval({action: payload.approval_action || payload.confirm_action, decision: 'approve'});
    }
    if (kind === 'form.submit') return submitForm(payload);
    if (kind === 'cart.add') {
      const prod = lastProducts.find((x) => x.sku === payload.sku) || payload;
      const res = await addToCart({...prod, currency: prod.currency || 'INR'}, payload.qty || 1);
      if (res.ok) {
        sink.fragment({type: 'notification', severity: 'success', title: 'Added to cart', message: `${prod.name} · ${formatMoney(res.cart.total, res.cart.currency)} total`}, 'mcgroce_demo');
      }
      return res;
    }
    return undefined;
  }

  return {
    kind: 'demo',
    label: 'Demo agent · offline',
    send,
    handleAction,
    disconnect() {},
  };
}
