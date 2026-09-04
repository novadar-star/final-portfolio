// ===========================
// nova. — project data
// Single source of truth for all systems/projects.
// To add a project: add an object to this array.
// No HTML, CSS, or layout editing required.
// ===========================

const PROJECTS = [
  {
    id: 'ai-job-scraper',
    slug: 'ai-job-scraper',
    title: 'AI Job Scraper & Custom Output Parser',
    category: 'automation · ai integration',
    year: '2026',
    status: 'shipped',
    featured: true,
    shortDesc: 'started from a public n8n tutorial, then wrote a custom parser because the AI kept sending back broken JSON.',
    context: 'n8n · AI Agent · Google Drive · Slack',
    image: 'pics/ai-research-workflow.png',
    imageAlt: 'AI Jobs Scraper & Resume Optimizer — n8n workflow',
    hasVideo: false,
    caseStudyUrl: 'https://docs.google.com/document/d/10zqOfkmxrdfvt5o_QGfXX9R4xgH0vif_xIE7Dpyyxzs/edit?tab=t.0',
    githubUrl: null,
    liveUrl: null,
    tags: ['n8n', 'AI Agent', 'Slack', 'Google Drive', 'Job Scraping', 'Custom Parser'],
    // Connector diagram — the signature interaction
    // Each stage: { id, label, annotation }
    connector: [
      {
        id: 'trigger',
        label: 'Trigger',
        annotation: 'Slack message in a designated channel kicks off the pipeline — no manual dashboard needed.'
      },
      {
        id: 'scrape',
        label: 'Scrape',
        annotation: 'Pulls job listings from a target source. Filters by title and seniority before passing anything downstream.'
      },
      {
        id: 'match',
        label: 'Match',
        annotation: 'AI agent reads each listing and scores it against resume context pulled from Google Drive. Outputs structured JSON — in theory.'
      },
      {
        id: 'parse',
        label: 'Parse',
        annotation: 'Custom JS parser: strips markdown fences if present → JSON.parse → regex extraction fallback → safe defaults. Built because the AI rarely sends clean JSON on the first pass.'
      },
      {
        id: 'draft',
        label: 'Draft',
        annotation: 'Tailored application materials drafted per matching role. Includes a cover note that references specific JD language.'
      },
      {
        id: 'deliver',
        label: 'Deliver',
        annotation: 'Results posted back to Slack with match score and draft link. The whole loop runs without leaving the channel.'
      }
    ],
    // Full story for the detail page
    story: {
      problem: 'Most n8n job scraper tutorials break the moment the LLM\'s output isn\'t perfectly formatted JSON. The AI agents in these workflows have no error handling — they just fail silently or crash the run. That\'s fine for a demo; it\'s not fine for something you actually want to use.',
      thinking: 'Re-prompting and hoping the model sends cleaner output next time isn\'t a strategy at scale. The problem isn\'t the model — it\'s that there\'s no fallback when the format is wrong. Most people add a "format as JSON" instruction and call it a job. That handles maybe 70% of cases.',
      system: 'Trigger (Slack) → Scrape (job listings) → Match (AI agent against resume context) → Parse (custom JS — fence-stripping, JSON.parse, regex fallback, safe defaults) → Draft (tailored application materials) → Deliver (results back to Slack with match score)',
      build: 'Built the parser independently as a Function node in n8n. The logic: first strip any markdown code fences (```json ... ```) that the model sometimes wraps output in. Then attempt JSON.parse(). If that throws, run a regex to extract key-value pairs from the raw string. If that also fails, return safe defaults so the workflow continues rather than crashing.\n\nLater reused the same parser pattern in a public webinar co-presentation — which meant sanitizing a hardcoded API key from the workflow JSON before sharing. That was a useful lesson about the gap between "works on my machine" and "shareable artifact."',
      outcome: 'A reusable parser pattern that\'s now a standard node in every AI-output workflow I build. The job scraper itself runs reliably on demand via Slack.',
      learning: 'The parser is more useful than the scraper. The scraper is a tutorial. The parser is a solution to a real recurring problem. That distinction — between following a pattern and solving a problem — is what I\'m trying to build toward.'
    }
  },
  {
    id: 'gtm-outbound',
    slug: 'gtm-outbound',
    title: 'GTM Signal-Based Outbound Pipeline',
    category: 'automation · lead generation',
    year: '2026',
    status: 'shipped',
    featured: false,
    shortDesc: 'a signal-driven outbound pipeline that debugged its own email validation when the paid API turned out to cost money.',
    context: 'n8n · Hunter.io · Gmail · automated outbound',
    image: 'pics/gtm-signal-workflow.png',
    imageAlt: 'GTM Signal-Based Outbound Pipeline — n8n workflow',
    hasVideo: false,
    caseStudyUrl: 'https://docs.google.com/document/d/1VppM8l46e1lrg1pFAywSw1xVK_FzzFkD-q0oGV-DbxE/edit?tab=t.0',
    githubUrl: null,
    liveUrl: null,
    tags: ['n8n', 'Hunter.io', 'Gmail API', 'Lead Scoring', 'Email Validation', 'CRM'],
    connector: [
      {
        id: 'signal',
        label: 'Signal',
        annotation: 'Ingests GTM signals — job postings, hiring announcements, company growth indicators. Not all signals are equal; filtering happens here.'
      },
      {
        id: 'score',
        label: 'Score',
        annotation: 'Each lead gets a score based on signal strength and ICP fit. Low-score leads are dropped before any enrichment spend.'
      },
      {
        id: 'enrich',
        label: 'Enrich',
        annotation: 'Hunter.io finds contact emails for qualified leads. ICP profile is built from the signal data + company info.'
      },
      {
        id: 'validate',
        label: 'Validate',
        annotation: 'Email validation via MX record lookup + format checks. Originally planned to use NeverBounce — swapped for free DNS lookup when the API turned out to have usage costs at this volume.'
      },
      {
        id: 'draft',
        label: 'Draft',
        annotation: 'Personalized outbound email generated from the ICP profile. References the specific signal that triggered the outreach.'
      },
      {
        id: 'log',
        label: 'Log',
        annotation: 'Every lead, score, and action logged to a CRM sheet. Draft emails saved for review before send.'
      }
    ],
    story: {
      problem: 'Outbound sales teams spend most of their time on leads that were never going to convert. The signal was there — a job posting, a funding announcement — but no one was routing it to the right person with the right message at the right moment.',
      thinking: 'If you can read signals systematically (not just "follow them on LinkedIn"), score them against an ICP, and generate a draft that references the actual signal, you\'ve turned a manual prospecting process into something that scales. The hard part is the email validation — bounced emails tank domain reputation.',
      system: 'Signal Ingestion → Lead Scoring → Contact Enrichment (Hunter.io) → Email Validation (MX + format) → ICP Profile Build → Outbound Draft → CRM Logging',
      build: 'Built the scoring logic first — needed a way to weight different signal types before spending any API calls on enrichment. Hit a wall with NeverBounce: the free tier doesn\'t cover the volume, and the paid tier was overkill. Replaced it with a DNS MX record lookup (free, synchronous, catches most invalid domains) plus a regex format check. Good enough for the use case.\n\nAlso ran into a JSearch API nesting bug where the job data came back in an unexpected structure. Fixed by adding a normalization step before the scoring logic — another case where an explicit parse step saved the downstream.',
      outcome: 'A working pipeline that produces scored, enriched, validated leads with draft outreach. The MX-lookup substitution turned a cost problem into a working solution.',
      learning: 'Constraints (the NeverBounce cost) pushed a better solution. A free DNS lookup is actually more transparent and debuggable than a paid black-box API. I\'d make the same call again.'
    }
  },
  {
    id: 'zero-touch-attendee',
    slug: 'zero-touch-attendee',
    title: 'Zero-Touch Attendee Pipeline',
    category: 'workflow design',
    year: '2026',
    status: 'shipped',
    featured: false,
    shortDesc: 'end-to-end event registration: webhook in, personalized Gmail confirmation out, no manual steps.',
    context: 'n8n · Webhooks · Google Sheets · Gmail',
    image: 'pics/aws-community-day.png',
    imageAlt: 'Zero-Touch Attendee Pipeline — n8n workflow',
    hasVideo: false,
    caseStudyUrl: null,
    githubUrl: null,
    liveUrl: null,
    tags: ['n8n', 'Webhooks', 'Google Sheets API', 'Gmail API', 'Conditional Routing'],
    connector: [
      {
        id: 'register',
        label: 'Register',
        annotation: 'Webhook receives registration form data. Fires immediately on submission — no polling delay.'
      },
      {
        id: 'deduplicate',
        label: 'Deduplicate',
        annotation: 'Checks Google Sheets for an existing row with the same email. Duplicate submissions get a quiet drop, not an error.'
      },
      {
        id: 'route',
        label: 'Route',
        annotation: 'Conditional routing based on ticket tier: General / VIP / Speaker. Each tier gets different confirmation copy and different logging columns.'
      },
      {
        id: 'log',
        label: 'Log',
        annotation: 'Attendee record appended to the appropriate sheet tab with timestamp and tier.'
      },
      {
        id: 'confirm',
        label: 'Confirm',
        annotation: 'Personalized Gmail sent via API. VIP and Speaker emails include extra details — no generic "you\'re registered" copy.'
      }
    ],
    story: {
      problem: 'Event registration for community events is usually a Typeform that dumps into a spreadsheet, and then someone manually sends confirmation emails. When you\'re running a 120-person community, that someone is you.',
      thinking: 'The whole thing can be automated end-to-end. The only interesting logic is the tier-based routing — a general attendee doesn\'t need the speaker briefing doc link, and a VIP doesn\'t need the "how to get there" paragraph that\'s already on the event page.',
      system: 'Webhook Trigger → Duplicate Check (Google Sheets) → Conditional Router (General / VIP / Speaker) → Log to Sheet → Send Personalized Gmail',
      build: 'The duplicate check was the part most people skip. Built it as a Google Sheets lookup before the router — if the email already exists, the workflow exits cleanly. The personalized confirmation emails use expression-based templates in n8n, pulling the attendee\'s name and tier from the trigger payload.',
      outcome: 'A fully automated registration loop. From form submission to confirmation email, zero manual steps.',
      learning: 'The deduplication logic is the unsexy part that makes the rest of it trustworthy. Anyone can send a webhook to Gmail. The part that makes it production-ready is the edge case handling.'
    }
  },
  {
    id: 'google-maps-leads',
    slug: 'google-maps-leads',
    title: 'Google Maps Lead Scraper',
    category: 'automation',
    year: '2026',
    status: 'shipped',
    featured: false,
    shortDesc: 'scheduled pipeline that turns a Google Maps search into a qualified leads spreadsheet.',
    context: 'n8n · Apify · Google Sheets',
    image: 'pics/google-mpas-craper-leads.png',
    imageAlt: 'Google Maps Lead Scraper — n8n workflow',
    hasVideo: false,
    caseStudyUrl: null,
    githubUrl: null,
    liveUrl: null,
    tags: ['n8n', 'Apify', 'Google Maps', 'Google Sheets', 'Scheduled Trigger'],
    connector: [
      {
        id: 'schedule',
        label: 'Schedule',
        annotation: 'Cron trigger fires on a set interval. No manual kick-off required.'
      },
      {
        id: 'scrape',
        label: 'Scrape',
        annotation: 'Apify actor runs a Google Maps search for a target keyword + location. Returns raw business data.'
      },
      {
        id: 'filter',
        label: 'Filter',
        annotation: 'Results filtered by qualification criteria — rating threshold, review count, website presence. Unqualified leads dropped here.'
      },
      {
        id: 'loop',
        label: 'Loop',
        annotation: 'n8n SplitInBatches node processes results one at a time to stay within API rate limits.'
      },
      {
        id: 'append',
        label: 'Append',
        annotation: 'Qualified leads appended to Google Sheets with business name, address, phone, website, and rating.'
      }
    ],
    story: {
      problem: 'Finding local business leads manually is slow. Copy-paste from Google Maps, one listing at a time, into a spreadsheet that someone then has to clean.',
      thinking: 'Apify has a Google Maps scraper actor. n8n can call Apify. The filter logic and qualification criteria are just conditional nodes. The whole thing should be schedulable and hands-off.',
      system: 'Cron Schedule → Apify Actor (Google Maps scrape) → Filter (qualification criteria) → Loop (batch processing) → Append to Google Sheets',
      build: 'Straightforward pipeline. The interesting part was the rate limiting — Google Maps data comes back fast but Apify has actor run concurrency limits. Used n8n\'s SplitInBatches node to process 10 results at a time with a short wait between batches.',
      outcome: 'A scheduled lead list that populates itself. The filter criteria are parameterizable — swap the target keyword and location, and the same workflow works for a different market.',
      learning: 'Batch processing and rate limiting are not optional in production automation. The first version ran everything in parallel and hit rate limits within 30 seconds. Batching fixed it.'
    }
  },
  {
    id: 'ai-advisor',
    slug: 'ai-advisor',
    title: 'Internal AI Advisor Platform',
    category: 'production app',
    year: '2026',
    status: 'shipped',
    featured: false,
    shortDesc: 'full-stack Next.js app with three AI personas for an intern cohort. shipped to production at Eskwelabs.',
    context: 'Eskwelabs · shipped to production team',
    image: 'pics/ai-advisor.png',
    imageAlt: 'Internal AI Advisor Platform',
    hasVideo: true,
    videoSrc: 'vid/ai-advisor.mp4',
    caseStudyUrl: null,
    githubUrl: 'https://github.com/novadar-star/Eskwelabs-Internal-AI-Advisor-',
    liveUrl: null,
    tags: ['Next.js 14', 'Gemini', 'Supabase RLS', 'Google OAuth', 'Streaming'],
    connector: [
      {
        id: 'auth',
        label: 'Auth',
        annotation: 'Google OAuth with domain allowlist — only @eskwelabs.com accounts can log in. Enforced at the middleware layer, not just the UI.'
      },
      {
        id: 'context',
        label: 'Context',
        annotation: 'Each AI persona pulls relevant context from Google Docs at request time. The advisor "knows" about current cohort materials without manual updates.'
      },
      {
        id: 'stream',
        label: 'Stream',
        annotation: 'Gemini responses streamed token-by-token via the Vercel AI SDK. No waiting for the full response before rendering starts.'
      },
      {
        id: 'rls',
        label: 'RLS',
        annotation: 'Supabase Row Level Security ensures each user only sees their own conversation history. Auth token passed through to Supabase on every request.'
      },
      {
        id: 'persist',
        label: 'Persist',
        annotation: 'Conversation history stored per-user in Supabase. Personas remember context within a session.'
      }
    ],
    story: {
      problem: 'Interns at Eskwelabs needed a way to get quick answers about their project requirements, learning materials, and program structure without waiting for async Slack responses.',
      thinking: 'Three distinct advisor personas (technical, curriculum, general) would cover most question types. Google Docs as the context source meant the content team could update materials without touching the app.',
      system: 'Google OAuth (domain allowlist) → Context Pull (Google Docs) → Gemini Streaming → Supabase RLS (per-user history)',
      build: 'Built as a Next.js 14 app with App Router. The trickiest part was the Row Level Security setup — needed to pass the user\'s JWT from Google OAuth through to Supabase on every request so RLS policies evaluated correctly. Streaming was straightforward with the Vercel AI SDK.',
      outcome: 'Shipped to the production intern cohort. The platform is actively used for daily task guidance.',
      learning: 'RLS is easy to get conceptually right and hard to get technically right. The auth token passthrough took most of the debugging time. Once it worked, it was solid.'
    }
  },
  {
    id: 'awssbg-website',
    slug: 'awssbg-website',
    title: 'AWS SBG Adamson · Org Website',
    category: 'community · web',
    year: '2025',
    status: 'shipped',
    featured: false,
    shortDesc: 'branding and UI/UX for the official site of a 120+ member cloud community at Adamson University.',
    context: 'AWS Student Builder Group · Adamson University',
    image: 'pics/aawssbg-website.png',
    imageAlt: 'AWS SBG Adamson website',
    hasVideo: true,
    videoSrc: 'vid/awssbg-website.mp4',
    caseStudyUrl: null,
    githubUrl: null,
    liveUrl: 'https://awssbgadu.pages.dev/',
    tags: ['HTML/CSS', 'JavaScript', 'Web Design', 'Community'],
    connector: [
      {
        id: 'brief',
        label: 'Brief',
        annotation: 'Community needed a home base: event listings, team page, and a way for new students to understand what the org does.'
      },
      {
        id: 'brand',
        label: 'Brand',
        annotation: 'Developed visual identity that worked within AWS brand guidelines while feeling like a student org, not a corporate subsidiary.'
      },
      {
        id: 'build',
        label: 'Build',
        annotation: 'Static HTML/CSS/JS site. Fast, no build pipeline complexity for a team of student maintainers.'
      },
      {
        id: 'ship',
        label: 'Ship',
        annotation: 'Deployed to Cloudflare Pages. Handed off with a brief guide for future officers to update event content.'
      }
    ],
    story: {
      problem: 'The AWS SBG at Adamson had no web presence. New students couldn\'t find out what the org did, past events weren\'t documented anywhere, and the team had no shared visual identity.',
      thinking: 'The site needed to work for two audiences: prospective members (what is this org, should I join) and current members (events, team, resources). And it needed to be maintainable by whoever the next president is.',
      system: 'Brand brief → Visual identity → HTML/CSS/JS build → Cloudflare Pages deploy',
      build: 'Kept it simple: static HTML, no framework. Future officers are CS students but not necessarily web developers — a Vite+React project they can\'t maintain is worse than a plain HTML file they can. Built a content update guide as part of the handoff.',
      outcome: 'A live org site at awssbgadu.pages.dev. Active during my presidency and proposed for continued use.',
      learning: 'Handoff documentation is as important as the build. A site that only the original developer can update isn\'t a community asset.'
    }
  },
  {
    id: 'school-registrar',
    slug: 'school-registrar',
    title: 'School Registrar System',
    category: 'academic project',
    year: '2025',
    status: 'shipped',
    featured: false,
    shortDesc: 'student record management system built to learn database design, CRUD, and system architecture fundamentals.',
    context: 'Adamson University · academic project',
    image: null,
    imageAlt: null,
    hasVideo: false,
    caseStudyUrl: null,
    githubUrl: 'https://github.com/novadar-star/school-registrar',
    liveUrl: null,
    tags: ['Database', 'CRUD', 'SQL', 'System Architecture'],
    connector: [
      {
        id: 'schema',
        label: 'Schema',
        annotation: 'Designed the entity-relationship model first. Students, courses, enrollments, grades — normalized to 3NF.'
      },
      {
        id: 'crud',
        label: 'CRUD',
        annotation: 'Standard create/read/update/delete operations for each entity. Parameterized queries throughout to prevent SQL injection.'
      },
      {
        id: 'enroll',
        label: 'Enroll',
        annotation: 'Enrollment logic handles course capacity constraints and prerequisite checking.'
      },
      {
        id: 'report',
        label: 'Report',
        annotation: 'Basic academic reporting: grade summaries, enrollment lists, course rosters.'
      }
    ],
    story: {
      problem: 'An academic project to learn database design fundamentals by building something with real-world structure: a system that manages student records, course enrollment, and academic history.',
      thinking: 'A registrar system has enough real complexity to be interesting — relationships between entities, constraint logic, reporting requirements — without being so large it can\'t be finished in a semester.',
      system: 'Schema design (ER model) → CRUD layer → Enrollment logic (capacity + prerequisites) → Reporting',
      build: 'Started with the ER diagram, normalized to 3NF before writing any code. Enrollment logic was the most interesting part — needed to check both course capacity and prerequisite completion in a single transaction.',
      outcome: 'A working registrar system demonstrating relational database design, CRUD operations, and constraint enforcement.',
      learning: 'Schema design decisions made early are expensive to change late. The time spent on the ER diagram before touching code was the highest-leverage work in the project.'
    }
  }
];

// Helper: get a project by slug
function getProject(slug) {
  return PROJECTS.find(p => p.slug === slug) || null;
}

// Helper: get all featured projects
function getFeaturedProjects() {
  return PROJECTS.filter(p => p.featured);
}

// Helper: get projects excluding the flagship
function getSupportingProjects() {
  return PROJECTS.filter(p => !p.featured);
}
