// A made-up company and prep plan for the demo's Prep page. The page runs in its "shared copy" mode
// (the same mode as Export as HTML): no server, ticks and notes save in this browser. Dates are worked
// out when the page opens, so the plan always runs from two days ago to the interview next week.
(() => {
  "use strict";
  const at = (offset) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + offset); return d; };
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const dow = (d) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).replace(",", "");
  const lc = (slug) => `https://leetcode.com/problems/${slug}/`;
  const FIRST = -2;          // the plan started two days ago
  const INTERVIEW = 8;       // and the interview is eight days out

  const problems = [
    { id: "two-sum", title: "Two Sum", pattern: "Arrays and hashing", difficulty: "Easy", why: "warm-up, reported often" },
    { id: "valid-anagram", title: "Valid Anagram", pattern: "Arrays and hashing", difficulty: "Easy", why: "counting with a map" },
    { id: "top-k-frequent-elements", title: "Top K Frequent Elements", pattern: "Arrays and hashing", difficulty: "Medium", why: "heap or bucket sort" },
    { id: "valid-parentheses", title: "Valid Parentheses", pattern: "Stack", difficulty: "Easy", why: "classic stack" },
    { id: "daily-temperatures", title: "Daily Temperatures", pattern: "Stack", difficulty: "Medium", why: "monotonic stack" },
    { id: "longest-substring-without-repeating-characters", title: "Longest Substring Without Repeating Characters", pattern: "Sliding window", difficulty: "Medium", why: "reported often, weak area" },
    { id: "best-time-to-buy-and-sell-stock", title: "Best Time to Buy and Sell Stock", pattern: "Sliding window", difficulty: "Easy", why: "one pass, running minimum" },
    { id: "merge-intervals", title: "Merge Intervals", pattern: "Intervals", difficulty: "Medium", why: "sort first" },
    { id: "number-of-islands", title: "Number of Islands", pattern: "Graph BFS and DFS", difficulty: "Medium", why: "reported often" },
    { id: "course-schedule", title: "Course Schedule", pattern: "Graph BFS and DFS", difficulty: "Medium", why: "topological sort, weak area" },
  ].map((p) => ({ ...p, leetcode_url: lc(p.id), neetcode_url: "", source: "" }));

  const designs = [
    { id: "parking-lot", title: "Parking lot", kind: "OOD",
      prompt: "Design the classes for a multi-level parking lot that handles cars, motorcycles and trucks, assigns spots, issues tickets and charges on exit.",
      focus: ["spot types and assignment", "ticket and payment flow", "class responsibilities", "extending to new vehicle types"] },
    { id: "lru-cache", title: "LRU cache", kind: "OOD",
      prompt: "Design an in-memory LRU cache with get and put in O(1), a fixed capacity, and optional time-to-live per entry.",
      focus: ["hash map plus doubly linked list", "eviction", "TTL expiry", "thread safety"] },
  ];

  const behavioral = [
    { id: "b-ownership-1", value: "Own the outcome", question: "Tell me about a project you saw through from start to finish.", tip: "Pick one where you made the calls, not just did the work." },
    { id: "b-ownership-2", value: "Own the outcome", question: "Tell me about a time something you shipped broke. What did you do?", tip: "Say what you changed afterwards so it couldn't happen again." },
    { id: "b-customers-1", value: "Customers first", question: "Tell me about a time you changed your plan because of what a user needed.", tip: "Name the user and the evidence." },
    { id: "b-learn-1", value: "Learn fast", question: "Tell me about something technical you had to learn in a week.", tip: "How you learned matters as much as what." },
    { id: "b-commit-1", value: "Disagree, then commit", question: "Tell me about a time you disagreed with a decision and went with it anyway.", tip: "Show you argued with data, then backed the call." },
  ];

  // Day by day: offset from today, then the day's card.
  const DAYS = [
    [-2, "Arrays and hashing", "arrays, hashing", [
      ["7:30 to 8:00 AM", "study", "Read the hashing cheat sheet: when a map turns O(n^2) into O(n).", []],
      ["6:00 to 7:00 PM", "coding", "Solve these, 20 minutes each, then read one good solution.", ["two-sum", "valid-anagram"]],
      ["7:15 to 7:45 PM", "story", "Draft your first STAR story.", ["b-ownership-1"]],
      ["Last 10 minutes", "log", "Log what tripped you up today.", []]],
      "Which problem took longest, and why?"],
    [-1, "Stacks", "stack", [
      ["7:30 to 8:00 AM", "review", "Redo Two Sum from a blank page in under 10 minutes.", ["two-sum"]],
      ["6:00 to 7:00 PM", "coding", "Stack problems, out loud as if someone is listening.", ["valid-parentheses", "daily-temperatures"]],
      ["7:15 to 7:45 PM", "behavioral", "Answer these aloud, two minutes each.", ["b-ownership-1", "b-customers-1"]],
      ["Last 10 minutes", "log", "Log it.", []]],
      "Could you explain the monotonic stack to a friend?"],
    [0, "Sliding window", "sliding window", [
      ["7:30 to 8:00 AM", "study", "Sliding window: grow the right edge, shrink the left when the window breaks the rule.", []],
      ["6:00 to 6:45 PM", "coding", "Two window problems.", ["best-time-to-buy-and-sell-stock", "longest-substring-without-repeating-characters"]],
      ["7:00 to 7:45 PM", "mock", "Mock 1: one timed problem, spoken, 45 minutes.", ["longest-substring-without-repeating-characters"]],
      ["Last 10 minutes", "log", "Log it.", []]],
      "Where did you lose time in the mock?"],
    [1, "OOD: parking lot", "ood, design", [
      ["7:30 to 8:00 AM", "study", "Read the parking lot walkthrough, then close it.", ["parking-lot"]],
      ["6:00 to 7:00 PM", "design", "Sketch the classes blind, then compare.", ["parking-lot"]],
      ["7:15 to 7:45 PM", "story", "Write the shipped-and-broke story.", ["b-ownership-2"]]],
      "Which class did you forget?"],
    [2, "Intervals", "intervals, sorting", [
      ["7:30 to 8:00 AM", "review", "Redo Longest Substring from scratch.", ["longest-substring-without-repeating-characters"]],
      ["6:00 to 7:00 PM", "coding", "Sort first, then sweep.", ["merge-intervals", "top-k-frequent-elements"]],
      ["7:15 to 7:45 PM", "behavioral", "Answer aloud.", ["b-learn-1", "b-commit-1"]]],
      "What made the intervals click, or not?"],
    [3, "Graphs", "graphs, bfs, dfs", [
      ["7:30 to 8:00 AM", "study", "BFS and DFS on a grid, and how to mark visited cells.", []],
      ["6:00 to 7:15 PM", "coding", "Two graph problems.", ["number-of-islands", "course-schedule"]],
      ["7:30 to 7:45 PM", "log", "Log it.", []]],
      "Did you get cycle detection right the first time?"],
    [4, "Mock 2", "mock, design", [
      ["6:00 to 6:45 PM", "mock", "Mock 2: timed, spoken, 45 minutes.", ["course-schedule"]],
      ["7:00 to 7:45 PM", "design", "Live design mock, 45 minutes.", ["parking-lot"]]],
      "Two things to fix before the next mock."],
    [5, "OOD: LRU cache", "ood, design", [
      ["7:30 to 8:00 AM", "study", "Read the LRU cache design: map plus doubly linked list.", ["lru-cache"]],
      ["6:00 to 7:00 PM", "design", "Design it blind, then code get and put.", ["lru-cache"]],
      ["7:15 to 7:45 PM", "story", "Polish two stories.", ["b-customers-1", "b-commit-1"]]],
      "What would you say about thread safety?"],
    [6, "Weak spots", "review", [
      ["6:00 to 7:00 PM", "review", "Redo the two you found hardest.", ["course-schedule", "top-k-frequent-elements"]],
      ["7:15 to 7:45 PM", "behavioral", "All five stories, aloud, timed.", ["b-ownership-1", "b-ownership-2", "b-customers-1", "b-learn-1", "b-commit-1"]]],
      "Which story still feels thin?"],
    [7, "Light day", "rest, stories", [
      ["30 minutes", "review", "Skim your logs and cheat sheets. Nothing new.", []],
      ["20 minutes", "story", "Say your two best stories once each.", ["b-ownership-1", "b-learn-1"]],
      ["Evening", "log", "Lay out tomorrow: links, water, quiet room. Sleep early.", []]],
      "Anything you want to remember to say tomorrow?"],
  ];

  const days = DAYS.map(([off, title, tag, blocks, write_down]) => {
    const d = at(off), date = iso(d);
    return { date, dow: dow(d), title, tag, write_down,
      blocks: blocks.map(([time, kind, text, refs], j) => ({ time, kind, text, refs, source: "", key: `${date}:${j}` })) };
  });

  // Progress so far: the past days are ticked, plus what was practised.
  const done = {};
  for (const d of days.filter((x) => x.date < iso(at(0)))) for (const b of d.blocks) done[b.key] = true;
  done[days[2].blocks[0].key] = true;
  for (const k of ["p:two-sum", "p:valid-anagram", "p:valid-parentheses", "q:b-ownership-1"]) done[k] = true;
  const results = {
    "p:two-sum": { mode: "coding", title: "Two Sum", read: "done", phase: "wrap", hints: 0, turns: 9, minutes: 18, persona: "neutral",
      at: at(-2).toISOString(), language: "python",
      debrief: "Clear clarifying questions and a quick move from brute force to the hash map. You tested the duplicate case before I asked. Next time, say the space cost without being prompted.",
      code: "def two_sum(nums, target):\n    seen = {}\n    for i, x in enumerate(nums):\n        if target - x in seen:\n            return [seen[target - x], i]\n        seen[x] = i\n",
      run: { compiled: true, passed: 5, total: 5 } },
    "q:b-ownership-1": { mode: "behavioral", title: "Behavioral", read: "on_track", phase: "follow_up", hints: 0, turns: 7, minutes: 12, persona: "friendly",
      at: at(-1).toISOString(),
      debrief: "Good structure and a real result with a number. You said we more than I in the action part, so make your own decisions clearer." },
  };
  const inputs = {
    ["log:" + days[0].date]: "Two Sum fine. Valid Anagram: forgot the length check first. Story draft is too long, cut the setup.",
    ["log:" + days[1].date]: "Daily Temperatures took 35 minutes. Re-read the monotonic stack idea tomorrow morning.",
  };

  window.__PREP_EXPORT__ = {
    id: "acme-cloud-demo",
    name: "Acme Cloud",
    role: "Software Engineer I, new grad",
    interview_date: iso(at(INTERVIEW)),
    notes: "Made up for this demo.\nVirtual onsite: four 45-minute rounds on one day.\nTwo coding, one object-oriented design, one behavioral.\nPython is fine. Shared code editor, no running code.",
    research: {
      researched_at: iso(at(FIRST - 1)),
      company_summary: "Acme Cloud is a made-up company for this demo. In the real app this part is written from a web search of the company's careers pages and recent candidate reports, with every source cited.",
      role_notes: "New grad loops weigh coding most, with one object-oriented design round and one behavioral round.",
      process: {
        overview: "A recruiter call, an online assessment, then a virtual onsite of four rounds on one day.",
        rounds: [
          { name: "Coding 1", duration: "45 min", format: "Shared editor", focus: "Arrays, hashing, strings" },
          { name: "Coding 2", duration: "45 min", format: "Shared editor", focus: "Graphs, intervals" },
          { name: "Design", duration: "45 min", format: "Whiteboard tool", focus: "Object-oriented design" },
          { name: "Behavioral", duration: "45 min", format: "Video call", focus: "Company values, STAR stories" },
        ],
      },
      round_structure: [
        { span: "0 to 5 min", what: "Introductions" },
        { span: "5 to 40 min", what: "One problem, sometimes a follow-up" },
        { span: "40 to 45 min", what: "Your questions" },
      ],
      values: [
        { name: "Own the outcome", meaning: "You see work through, including when it breaks.", sample_questions: [] },
        { name: "Customers first", meaning: "Decisions start from what users need.", sample_questions: [] },
        { name: "Learn fast", meaning: "You pick up what the job needs, quickly.", sample_questions: [] },
        { name: "Disagree, then commit", meaning: "Argue with data, then back the decision.", sample_questions: [] },
      ],
      coding_topics: [
        { pattern: "Arrays and hashing", frequency: "high", examples: [{ title: "Two Sum", leetcode_url: lc("two-sum") }] },
        { pattern: "Sliding window", frequency: "high", examples: [{ title: "Longest Substring Without Repeating Characters", leetcode_url: lc("longest-substring-without-repeating-characters") }] },
        { pattern: "Graph BFS and DFS", frequency: "medium", examples: [{ title: "Number of Islands", leetcode_url: lc("number-of-islands") }] },
      ],
      system_design: [],
      behavioral_tips: ["Two minutes per story, then let them probe.", "Say I, not we, for what you did.", "End every story with a result, ideally a number."],
      logistics: ["Shared code editor without a run button.", "Any mainstream language.", "Camera on for every round."],
      recent_news: [], sources: [], from_your_sources: [], worth_adding: [], playbook_checks: [],
    },
    plan: {
      title: "Acme Cloud, 10-day plan",
      subtitle: "Coding first, then design and stories, with two full mocks.",
      lead: "Ten evenings around a day job: an hour or two each, the most-reported patterns first, a mock every few days, and a light last day.",
      days, problems, designs, behavioral,
      walkthroughs: {
        "two-sum": {
          statement: "Given an array and a target, return the indices of the two numbers that add up to the target.",
          stages: [
            { name: "Understand", code: "", lines: [
              { who: "You", text: "Can a number be used twice, and is there always exactly one answer?" },
              { who: "Interviewer", text: "Not the same index twice, and yes, exactly one answer." },
              { who: "Note", text: "Interviewers listen for questions about duplicates, negatives and empty input." }] },
            { name: "Brute force", code: "", lines: [
              { who: "You", text: "Check every pair with two loops. That's O(n^2) time and O(1) space." }] },
            { name: "Optimize", code: "def two_sum(nums, target):\n    seen = {}\n    for i, x in enumerate(nums):\n        if target - x in seen:\n            return [seen[target - x], i]\n        seen[x] = i\n", lines: [
              { who: "You", text: "For each number I know the partner I need, so I keep a map from value to index and look the partner up before storing the number." }] },
            { name: "Trace", code: "", lines: [
              { who: "You", text: "nums = [3, 3], target 6: first 3 goes in the map, second 3 finds it, return [0, 1]." }] },
            { name: "Complexity", code: "", lines: [
              { who: "You", text: "O(n) time, one pass. O(n) space for the map." }] },
          ],
        },
      },
      design_walkthroughs: {
        "parking-lot": {
          summary: "Classes for a multi-level parking lot that assigns spots by vehicle size, issues tickets and charges on exit.",
          stages: [
            { name: "Requirements", code: "", lines: [
              { who: "You", text: "How many levels, which vehicle types, and is pricing hourly?" },
              { who: "Interviewer", text: "Several levels, cars, motorcycles and trucks, hourly pricing." }] },
            { name: "Use cases", code: "", lines: [{ who: "You", text: "Park a vehicle, get a ticket, pay and leave, see free spots per level." }] },
            { name: "Classes and relationships", code: "", lines: [
              { who: "You", text: "ParkingLot has Levels, a Level has Spots, a Spot fits a size, a Ticket links a Vehicle to a Spot." }] },
            { name: "Key methods", code: "class Level:\n    def find_spot(self, vehicle):\n        return next((s for s in self.spots if s.free and s.fits(vehicle)), None)\n", lines: [
              { who: "You", text: "find_spot scans for the first free spot that fits. A free list per size makes it O(1)." }] },
            { name: "Extensions", code: "", lines: [{ who: "Note", text: "Adding electric charging spots should be a new spot type, not a change to every class." }] },
          ],
          diagram: "classDiagram\n  ParkingLot \"1\" --> \"many\" Level\n  Level \"1\" --> \"many\" Spot\n  Ticket --> Spot\n  Ticket --> Vehicle\n  Vehicle <|-- Car\n  Vehicle <|-- Motorcycle\n  Vehicle <|-- Truck\n  class Spot {\n    size\n    free\n    fits(vehicle)\n  }\n  class Ticket {\n    issued_at\n    price()\n  }",
        },
      },
    },
    progress: { done, inputs, results },
  };
})();
