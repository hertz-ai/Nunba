import { formatLongDate } from '../../utils/formatDate';
/* eslint-disable */
// News registry — single source of truth for /news and /news/:slug.
// Same convention as the blog POSTS registry (src/pages/Blogs/BlogIndex.js):
// static entries are the crawlable SEO surface, and this list is manually
// mirrored into /public/sitemap.xml (no build step required).
//
// Every item links back into a Nunba community surface (`community.to`) so
// News is a public, indexable front door into the logged-in social pages —
// crawlers read the static article, humans click through to the community.
//
// Content policy: entries describe SHIPPED features only, dated from git
// history / CHANGELOG.md. Never announce here what has not landed on main.

export const NEWS_ITEMS = [
  {
    slug: 'nunba-windows-installer',
    title: 'Nunba for Windows: a signed one-click installer and a real download page',
    description:
      'Getting a local AI agent onto your laptop used to mean a README and a lot of hope. Now it is one double-click, signed, with a download page that tells you the requirements up front.',
    date: '2026-05-23',
    category: 'Release',
    community: { label: 'Get Nunba', to: '/download' },
    body: [
      'Getting a local AI agent onto your machine used to mean a README, a terminal window, and a fair bit of hope. Not anymore. Nunba now installs on Windows the way any normal app does: you double-click once and it is running. No account wall, no subscription, no Python to set up. The agent lives on your machine and answers to you.',
      'We also built a download page that tells you what you need before you spend the bandwidth. The short version is that if your laptop has 8GB of RAM, you are fine. Voice, vision, and chat all run right there on hardware most people already own.',
      'Nothing leaves your computer unless you choose to send it somewhere. And if you would rather read the code than take our word for it, the whole thing is open source and sitting on GitHub.',
    ],
  },
  {
    slug: 'referral-links-live',
    title: 'Invite links actually work now, so you can bring a friend',
    description:
      'Anyone can generate an invite link from inside Nunba, and it finally lands somewhere real: a page that remembers who sent you and points your friend straight at the download.',
    date: '2026-05-23',
    category: 'Community',
    community: { label: 'See how invites work', to: '/join' },
    body: [
      'Most people find the tools they end up loving because a friend told them to try it. So it always bugged us that our invite links had nowhere good to go. That is fixed. You generate a link from inside the app, send it to someone, and they land on a page that greets them, quietly notes that you sent them, and points them at the installer.',
      'Underneath, that referral runs through the same tracking we use everywhere else on the site, so the people who bring friends aboard actually get counted and credited. Bring three friends and you can see all three.',
    ],
  },
  {
    slug: 'press-kit',
    title: 'Writing about Nunba? Here is everything you need in one place',
    description:
      'One-liners so you can pick your angle, the numbers that actually matter, founder quotes cleared for print, and boilerplate you can paste word for word.',
    date: '2026-05-23',
    category: 'Company',
    community: { label: 'Open the press kit', to: '/press' },
    body: [
      'If you have ever written up a small product, you know the hard part is not the writing. It is chasing the basics. What does this do in one sentence, how fast is it really, who am I allowed to quote, and can I use that logo. We put all of it on one page.',
      'You will find a handful of one-liners so you can pick the framing that fits your story, the real performance numbers (how fast the first word comes back, how many words a second after that, how many channels it talks to), founder quotes you can attribute without a follow-up email, and standard boilerplate to paste as is.',
      'Need something that is not there, like an early look before launch or one specific screenshot? Email press@hevolve.ai and you will hear back within a day.',
    ],
  },
  {
    slug: 'run-local-ai-on-8gb-ram',
    title: 'How Nunba runs a 4B model on an 8GB laptop',
    description:
      'A small model guesses ahead, a bigger one checks the work in bulk, and the whole thing feels fast on a laptop you already own. Here is the trick in plain language.',
    date: '2026-05-23',
    category: 'Engineering',
    community: { label: 'Read the writeup', to: '/blog/run-local-ai-on-8gb-ram' },
    body: [
      'Picture a fast typist working next to a careful editor. The small model rattles off a guess at what comes next, and the bigger model checks a whole batch of those guesses at once instead of writing every word itself. When the guesses are good, and they usually are, you get the quality of the big model at close to the speed of the small one. The technique has a fancy name, speculative decoding, but that is the whole intuition: guess ahead, verify in bulk.',
      'On a plain 8GB laptop with no dedicated graphics card, that gets you the first word back in about seven tenths of a second, and roughly twelve words a second after that. Drop in even a modest GPU and it climbs to about thirty-five. Fast enough that you stop thinking about the machine and just talk to it.',
      'The full write-up gets into the quantization choices and why we did not have to trade away answer quality to hit those numbers. Running well on 8GB turned out to be a math problem, not a compromise.',
    ],
  },
  {
    slug: 'hive-contest',
    title: 'The Hive Contest: a live wall of ideas with a leaderboard',
    description:
      'Post what you think Nunba should learn to do next, watch the best ideas climb a live leaderboard, and help decide where the agent goes.',
    date: '2026-04-23',
    category: 'Community',
    community: { label: 'Join the Hive Contest', to: '/hive_contest' },
    body: [
      'Every product has a roadmap, and most of them get written in a room you are not in. The Hive Contest flips that around. It is a live wall where the community posts what Nunba should be able to do next, and the ideas people like rise to the top of a leaderboard everyone can see.',
      'There is also an open call for the hardware crowd. If you want Nunba running on your device, or talking to it, the co-creation card is the way in. You bring the hardware, we bring the agent.',
    ],
  },
  {
    slug: 'chat-5x-faster',
    title: 'Everyday chat got about five times faster',
    description:
      'Quick back-and-forth now skips the heavy machinery, and the fast reply quietly upgrades itself in place the moment the better answer is ready.',
    date: '2026-04-13',
    category: 'Engineering',
    community: { label: 'Try it on Nunba social', to: '/social' },
    body: [
      'Most of what you say to an assistant is not a big research request. It is a quick question. We were still routing all of it through the same heavy tool-picking pipeline, which is a bit like sending a postcard by freight. Now plain conversation takes the fast lane, and everyday chat came back about five times quicker.',
      'You also see the answer sooner. A quick draft shows up right away with a small pulsing dot, then the fuller reply slides into the same spot and replaces it, instead of stacking a second message underneath. And if you use a screen reader, new messages now announce themselves as they land.',
    ],
  },
];

export function getNewsItem(slug) {
  return NEWS_ITEMS.find((n) => n.slug === slug) || null;
}

// Kept as a named re-export so the ~40 call sites do not all have to change,
// and so the name still says which surface it belongs to. The behaviour, and
// the UTC that hydration depends on, lives in one place now.
export const formatNewsDate = formatLongDate;
