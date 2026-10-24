// Adds 100 sample posts: `pnpm db:seed`. Runs again safely: posts whose URL is
// already taken are skipped. Node runs this file as is, so it imports only modules
// with no "@/" imports of their own, by their full filenames.

import { randomBytes } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import sharp from "sharp";
import { media, postMedia, posts } from "../src/db/schema.ts";
import { slugify } from "../src/lib/slug.ts";

nextEnv.loadEnvConfig(process.cwd());
const db = drizzle(process.env.DATABASE_URL!);

// The same "random" choices every run, so the sample content is stable.
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(2026);
const chance = (p: number) => random() < p;
const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
function pick<T>(items: readonly T[]) {
  return items[Math.floor(random() * items.length)];
}
function shuffled<T>(items: readonly T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type Theme = {
  titles: string[];
  paragraphs: string[];
  headings: string[];
  lists: string[][];
  excerpts: string[];
  code?: string[];
};

const themes: Record<string, Theme> = {
  software: {
    titles: [
      "Boring technology, revisited",
      "The joy of deleting code",
      "Why I keep a changelog for personal projects",
      "Postgres full-text search is good enough",
      "Notes on caching, mostly mistakes",
      "What a cron job taught me about time zones",
      "Small tools, sharp edges",
      "Reading other people's code on purpose",
      "The cost of one more dependency",
      "Logging that actually helps at 2 a.m.",
      "Feature flags for a team of one",
      "On naming things, again",
      "A week without a framework",
      "Migrations I regret",
      "Shipping on Fridays",
      "Static sites and their discontents",
      "The case against clever SQL",
      "Testing the parts that scare me",
      "Error messages are documentation",
      "Rewriting the blog, part two",
    ],
    paragraphs: [
      "Most of the problems I've had with this site weren't hard. They were hidden: a setting nobody wrote down, a default that changed between versions, a script that only ran on one machine. Writing things down fixes more than clever code does.",
      "There's a version of this project that uses a queue, three services and a dashboard. It would be more impressive and much worse. A single process and a database cover everything it does, and I can hold the whole thing in my head.",
      "The first version was slow, so I measured before changing anything. The slow part wasn't where I'd have guessed. It almost never is, which is the only reason measuring feels worth it every time.",
      "I've started treating every dependency as code I've agreed to maintain. Some are obviously worth it. Others save twenty lines today and cost an afternoon each time they release a major version.",
      "Good error messages say what happened, why, and what to do next. Most of mine used to manage one of the three. Fixing that has saved me more time than any debugger.",
      "Tests for the boring paths are cheap and rarely catch anything. Tests for the parts that scare me are expensive and catch real bugs. I've stopped pretending those are the same kind of work.",
      "Deleting code is the most reliable way I know to make software better. Every line removed is one that can't break, can't confuse the next reader and doesn't need to be explained.",
      "Postgres keeps turning out to do the thing I was about to add another system for. Full-text search, queues, scheduled jobs: none of them perfect, all of them good enough for one person's projects.",
    ],
    headings: ["What went wrong", "The fix", "What I'd do differently", "A smaller version"],
    lists: [
      [
        "Measure before changing anything.",
        "Write the migration down before running it.",
        "Delete the code path you're not using.",
        "Make the error message say what to do next.",
      ],
      ["One process", "One database", "One deploy command", "No surprises"],
    ],
    code: [
      "```sql\nselect title, published_at\nfrom posts\nwhere published_at <= now()\norder by published_at desc\nlimit 10;\n```",
      '```ts\nexport function slugify(text: string) {\n  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");\n}\n```',
      "```bash\npg_dump --format=custom mblog > backup.dump\npg_restore --dbname=mblog_restore backup.dump\n```",
    ],
    excerpts: [
      "A short note on keeping a small project small.",
      "What I learned the hard way, so you can learn it the easy way.",
      "Less code, fewer surprises.",
      "Notes from fixing something that should have been simple.",
      "The boring answer, and why it's usually right.",
    ],
  },
  writing: {
    titles: [
      "Drafts I'll never publish",
      "Writing in the morning",
      "The first sentence problem",
      "Editing with a red pen, on a screen",
      "How long should a blog post be?",
      "Notes from a month of daily notes",
      "Writing for one reader",
      "Why I stopped using outlines",
      "The difference between a note and a post",
      "Titles are hard",
      "Short posts, more often",
      "What I learned from rereading old posts",
      "Writing when there's nothing to say",
      "A style guide for myself",
      "Keeping a commonplace book",
      "On cutting the best paragraph",
      "Footnotes, used sparingly",
      "Writing about work without writing about work",
      "The comfort of a blank page",
      "Publishing before it's perfect",
    ],
    paragraphs: [
      "I write best in the hour after coffee and before email. After that the day fills up with other people's sentences, and mine get shorter and more careful.",
      "Most drafts don't fail because the idea is bad. They fail because I try to say three things at once. Picking one and cutting the other two is almost always the fix.",
      "A post doesn't need to be the final word on anything. It needs to be true, clear and finished. Everything else is optional.",
      "Reading a draft out loud catches more problems than any amount of rereading on screen. Sentences that look fine turn out to be impossible to say in one breath.",
      "I keep a file of cut paragraphs. I almost never use them again, but knowing they're saved makes it much easier to cut them in the first place.",
      "The posts people mention back to me are rarely the ones I worked hardest on. They're the short, specific ones, written quickly about one small thing.",
      "Titles are the hardest part. I usually write the post first and the title last, and even then I change it twice after publishing.",
      "A blank page is less frightening when it isn't the only place the idea lives. Notes, a list of half-sentences, a quote from somewhere else: anything that means I'm not starting from nothing.",
    ],
    headings: ["The draft", "What changed", "What I kept", "A rule of thumb"],
    lists: [
      ["Pick one idea.", "Write it badly.", "Cut a third.", "Read it out loud.", "Publish."],
      ["Morning, before email", "One file per post", "Titles last"],
    ],
    excerpts: [
      "A few things that make drafts easier to finish.",
      "On writing a little, often.",
      "What I've learned from publishing before it felt ready.",
      "Notes on a habit that's harder than it looks.",
      "The smallest changes that made my writing better.",
    ],
  },
  reading: {
    titles: [
      "Reading list: spring 2026",
      "Reading list: summer 2025",
      "Reading list: autumn 2024",
      "Books I abandoned this year",
      "On rereading favorite books",
      "Libraries are underrated",
      "The book that changed how I take notes",
      "Reading slowly on purpose",
      "Notes on a book about cities",
      "Audiobooks on long walks",
      "What I look for in a technical book",
      "Margins and marginalia",
      "A year of reading poetry",
      "Short stories for short evenings",
      "Paper or screen, settled for me",
      "Reading the manual, cover to cover",
      "Essays I keep coming back to",
      "Five books about walking",
      "Reading in a second language",
      "My unread shelf",
    ],
    paragraphs: [
      "I read more this season than last, mostly because I stopped finishing books I wasn't enjoying. It turns out that was the thing slowing me down.",
      "Libraries remain the best deal in any city. I walk out with more books than I can read, return half of them unread, and feel no guilt about it at all.",
      "Rereading a favorite book is a way of measuring how much I've changed. The book stays the same; the parts I underline don't.",
      "Technical books age quickly, but the good ones age in an interesting way. The tools are dated within a few years; the thinking behind them often isn't.",
      "I've started writing a few sentences after each book: what it was about, what I'll remember, whether I'd recommend it. Those notes are more useful than any star rating.",
      "Reading slowly feels unproductive, which is exactly why I try to do it. A chapter a day, with a pencil, gets me further than a weekend of skimming.",
      "Audiobooks turned long walks into the best reading time of my week. Some books suit it perfectly; others need a page in front of me.",
      "Poetry is the reading I'd most like to do more of and least often choose. A poem a morning is a small habit that's surprisingly hard to keep.",
    ],
    headings: ["The highlights", "What didn't work", "Notes", "Up next"],
    lists: [
      [
        "A novel I couldn't put down",
        "An essay collection I read out of order",
        "A technical book I'll reread",
        "A poetry collection, a poem a day",
      ],
      ["Library first", "Abandon freely", "A few sentences after each book"],
    ],
    excerpts: [
      "What I read, what I liked, and what I gave up on.",
      "Short notes on a season of books.",
      "A few books worth your time, and one that wasn't.",
      "On reading slowly, and why it's worth it.",
      "The books I keep recommending.",
    ],
  },
  tools: {
    titles: [
      "My desk, version four",
      "A plain-text todo list",
      "The keyboard I keep coming back to",
      "Backups I actually test",
      "One notebook, every day",
      "Inbox zero, abandoned",
      "Using a timer to start, not to finish",
      "A dotfiles cleanup",
      "Calendar blocking for people who hate calendars",
      "The terminal as a home",
      "Fewer tabs",
      "Choosing a camera for walks",
      "Syncing files without a cloud",
      "A weekly review that sticks",
      "Notifications off, mostly",
      "Fountain pens for the impatient",
      "The tools I stopped using",
      "Two monitors, then one",
      "Keeping a work log",
      "A small home server",
    ],
    paragraphs: [
      "I've tried most of the productivity apps. The system that stuck is a text file with today's list at the top and everything else below it.",
      "The best tool is the one I stop noticing. Every few months I go through what I use and drop anything that's started demanding attention.",
      "Backups only count if I've restored from them. Once a quarter I pick a random folder, restore it somewhere else and check that it opens.",
      "Turning off notifications was the single biggest change to how my days feel. Nothing I've missed has turned out to be urgent.",
      "I keep a work log: a dated line or two for each thing I did. It's dull to write and invaluable a month later when I'm trying to remember why.",
      "My desk setup has gotten simpler with every version. One screen, one keyboard, a lamp and room for a notebook.",
      "A timer is the best way I know to start something I've been avoiding. Twenty-five minutes is short enough to agree to, and usually long enough to get going.",
      "Syncing files between my own machines without a cloud service took an afternoon to set up and hasn't needed attention since.",
    ],
    headings: ["The setup", "What stuck", "What I dropped", "Why it works"],
    lists: [
      ["A text file for today's list", "A paper notebook for everything else", "A timer", "Notifications off"],
      ["Restore a random folder.", "Check that it opens.", "Write down what you did."],
    ],
    excerpts: [
      "The setup that stuck, and everything I dropped along the way.",
      "Fewer tools, used more.",
      "A small change to how I work, a month in.",
      "Notes on a system simple enough to keep using.",
      "What I use, and why it's less than it used to be.",
    ],
  },
  life: {
    titles: [
      "Walking the same route for a year",
      "Notes from a rainy week by the sea",
      "Learning to bake bread, slowly",
      "The best coffee is the one nearby",
      "A winter of soup",
      "Getting lost on purpose",
      "On moving apartments",
      "The neighborhood bakery closed",
      "Trains over planes",
      "A garden on a balcony",
      "Cooking for one, well",
      "Notes from a long weekend offline",
      "Running, badly, again",
      "The case for staying home",
      "Summer evenings by the river",
      "What I carry on a day trip",
      "Learning to swim as an adult",
      "A small kitchen, fully used",
      "Postcards from nowhere in particular",
      "Autumn, in lists",
    ],
    paragraphs: [
      "I've walked the same loop most mornings for a year. It's never the same walk twice: different light, different people, a new shop where an old one was.",
      "Bread taught me patience in a way nothing else has. You can't hurry dough; you can only plan around it.",
      "The best coffee in the city is probably somewhere I haven't been. The best coffee for me is the place two streets over that knows my order.",
      "It rained every day of the trip, which meant museums, long lunches and walking anyway. I'd go back in the rain without a second thought.",
      "Cooking for one is easier once you stop treating it as a smaller version of cooking for four. Different recipes, different shopping, more leftovers on purpose.",
      "A weekend without a phone felt long on Saturday morning and short by Sunday night. I got through two books and a lot of thinking.",
      "Trains are slower than planes and better in almost every other way. You arrive somewhere in the middle of a city instead of an hour outside it.",
      "The balcony garden produced eleven tomatoes this year. I've never been so pleased with such a small harvest.",
    ],
    headings: ["The route", "What I noticed", "A few notes", "Next time"],
    lists: [
      ["Bread flour, water, salt and time", "A heavy pot", "Patience"],
      ["Comfortable shoes", "A paper map, just in case", "A notebook", "Something to read"],
    ],
    excerpts: [
      "Notes from somewhere close to home.",
      "A small thing that made the week better.",
      "On slowing down, mostly by accident.",
      "A few notes from a quiet weekend.",
      "What I noticed once I started paying attention.",
    ],
  },
};

const quotes = [
  "Write it down while it's still obvious. It won't be for long.",
  "Small and finished beats large and almost.",
  "Most of the work is deciding what not to do.",
  "Measure first. Then measure again.",
];

const closings = [
  "That's all for now. I'll write a follow-up if any of this changes.",
  "None of this is settled, and I expect to change my mind. That's partly why I'm writing it down.",
  "If you've found a better way, I'd like to hear about it.",
  "More soon, probably shorter.",
  "It's a small thing, but small things are most of what a day is made of.",
];

function bodyFor(theme: Theme) {
  const paragraphs = shuffled(theme.paragraphs);
  const headings = shuffled(theme.headings);
  const blocks = paragraphs.splice(0, between(1, 2));

  if (chance(0.65)) blocks.push(`## ${headings.pop()}`, ...paragraphs.splice(0, between(1, 2)));
  if (chance(0.45)) {
    const ordered = chance(0.4);
    blocks.push(pick(theme.lists).map((item, i) => `${ordered ? `${i + 1}.` : "-"} ${item}`).join("\n"));
  }
  if (theme.code && chance(0.5)) blocks.push(pick(theme.code));
  if (chance(0.25)) blocks.push(`> ${pick(quotes)}`);
  if (chance(0.5)) blocks.push(`## ${headings.pop()}`, ...paragraphs.splice(0, 1));
  if (chance(0.7)) blocks.push(pick(closings));
  return blocks.join("\n\n");
}

// Feature images are generated covers: a gradient with a few soft circles.
const palettes = [
  ["#1a1f36", "#2d3bcc", "indigo and ultramarine"],
  ["#f4a261", "#e76f51", "orange and coral"],
  ["#2a9d8f", "#e9c46a", "teal and gold"],
  ["#264653", "#2a9d8f", "deep teal"],
  ["#6d597a", "#e56b6f", "plum and rose"],
  ["#003049", "#fcbf49", "navy and amber"],
  ["#588157", "#dad7cd", "sage and stone"],
  ["#0b132b", "#5bc0be", "midnight and aqua"],
] as const;
const COVER = { width: 1600, height: 900 };

async function coverImage(slug: string) {
  const [from, to, name] = pick(palettes);
  const circles = Array.from({ length: between(2, 4) }, () => {
    const r = between(120, 420);
    const opacity = (0.06 + random() * 0.14).toFixed(2);
    return `<circle cx="${between(0, COVER.width)}" cy="${between(0, COVER.height)}" r="${r}" fill="#fff" fill-opacity="${opacity}"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${COVER.width}" height="${COVER.height}"><defs><linearGradient id="g" gradientTransform="rotate(${between(0, 359)} .5 .5)"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/>${circles}</svg>`;
  return {
    // Named the way uploads are, so the media route serves it.
    filename: `${slug.slice(0, 50).replace(/-$/, "")}-cover-${randomBytes(6).toString("hex")}.jpg`,
    data: await sharp(Buffer.from(svg)).jpeg({ quality: 82, mozjpeg: true }).toBuffer(),
    alt: `Abstract gradient in ${name}`,
  };
}

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const ago = (days: number) => new Date(now - days * DAY);

const samples = Object.values(themes).flatMap((theme) =>
  theme.titles.map((title) => {
    const draft = chance(0.12);
    // Published over the last three years; drafts started in the last two months.
    const publishedAt = draft ? null : ago(1 + random() * 3 * 365);
    const createdAt = publishedAt
      ? new Date(publishedAt.getTime() - random() * 10 * DAY)
      : ago(random() * 60);
    const updatedAt = new Date(
      Math.min(now, (publishedAt ?? createdAt).getTime() + random() * 20 * DAY),
    );
    const post = {
      title,
      slug: slugify(title),
      body: bodyFor(theme),
      excerpt: chance(0.5) ? pick(theme.excerpts) : "",
      publishedAt,
      createdAt,
      updatedAt,
    };
    return { post, withCover: chance(0.45) };
  }),
);

const taken = new Set(
  (
    await db
      .select({ slug: posts.slug })
      .from(posts)
      .where(inArray(posts.slug, samples.map((s) => s.post.slug)))
  ).map(({ slug }) => slug),
);
const toAdd = samples.filter((sample) => !taken.has(sample.post.slug));

// Covers only go to local storage. With MEDIA_STORAGE=s3, posts are added without them.
const local = (process.env.MEDIA_STORAGE || "local") === "local";
const mediaDir = path.resolve(process.env.MEDIA_DIR || "uploads");
const written: string[] = [];

try {
  const covers = new Map<string, Awaited<ReturnType<typeof coverImage>>>();
  if (local) {
    await mkdir(mediaDir, { recursive: true });
    for (const { post } of toAdd.filter((s) => s.withCover)) {
      const cover = await coverImage(post.slug);
      await writeFile(path.join(mediaDir, cover.filename), cover.data, { flag: "wx" });
      written.push(cover.filename);
      covers.set(post.slug, cover);
    }
  }

  await db.transaction(async (tx) => {
    for (const { post } of toAdd) {
      const cover = covers.get(post.slug);
      const [image] = cover
        ? await tx
            .insert(media)
            .values({ filename: cover.filename, ...COVER })
            .returning({ id: media.id })
        : [];
      const [{ id }] = await tx
        .insert(posts)
        .values({ ...post, featureImageId: image?.id, featureImageAlt: cover?.alt ?? "" })
        .returning({ id: posts.id });
      // Recorded like an editor save, so the image isn't cleaned up as unused.
      if (image) await tx.insert(postMedia).values({ postId: id, mediaId: image.id });
    }
  });
} catch (e) {
  await Promise.all(written.map((filename) => rm(path.join(mediaDir, filename), { force: true })));
  throw e;
} finally {
  await db.$client.end();
}

const drafts = toAdd.filter((s) => !s.post.publishedAt).length;
console.log(
  toAdd.length
    ? `Added ${toAdd.length} posts: ${toAdd.length - drafts} published, ${drafts} drafts, ${written.length} with feature images.`
    : "Nothing to add: the sample posts are already there.",
);
if (taken.size) console.log(`Skipped ${taken.size} whose URL was already taken.`);
if (toAdd.length) {
  console.log("If the app is running, save any post or restart it to see them on the public pages.");
}
if (!local) console.log("MEDIA_STORAGE isn't local, so no feature images were added.");
