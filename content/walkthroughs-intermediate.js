/* "The code in plain words" for intermediate projects. See walkthroughs-beginner.js. */
window.WALK = window.WALK || {};
Object.assign(window.WALK, {
  /* ───────── I01 Support RAG ───────── */
  "i01:0": [
    "This is **SQL**, the language databases understand. It creates the table where every chunk of every article is stored.",
    "**~CREATE EXTENSION vector~**: switches on pgvector, so the database can store embeddings.",
    "**Columns**: the chunk's id, which document it came from, title, breadcrumb, link, who may see it (~visibility~), the text itself, and a ~content_hash~ fingerprint to detect changes.",
    "**~tsv TSVECTOR GENERATED ...~**: the database automatically keeps a keyword-search version of the title and text. Title words get extra weight (~'A'~).",
    "**~embedding VECTOR(1024)~**: the meaning-numbers for the chunk, 1,024 of them.",
    "**The three ~CREATE INDEX~ lines**: make keyword search, vector search and 'find chunks of this document' fast. They're the index at the back of the book.",
  ],
  "i01:1": [
    "**~@dataclass class Chunk~**: one piece of an article: ids, title, breadcrumb, the text and its fingerprint.",
    "**~re.split(r\"\\n(?=#{2,3} )\", md)~**: cut the article just before each sub-heading, so pieces follow the article's own structure.",
    "**The merge loop**: glue very small sections onto the next one, so no piece is too tiny to be useful (at least 300 characters).",
    "**The ~for j in range(0, len(section), max_chars)~ loop**: only extremely long sections get cut further, every 3,000 characters.",
    "**~text = f\"{title}\\n{breadcrumb}...\"~**: put the title and breadcrumb at the top of every piece, so each piece makes sense on its own.",
    "**~hashlib.sha256(...)~**: a fingerprint of the text. The same text always gives the same fingerprint, so changes are easy to detect.",
  ],
  "i01:2": [
    "**~vo = voyageai.Client()~**: connect to the embedding service.",
    "**~for doc in changed_docs(since=cursor)~**: only articles changed since the last run. The ~cursor~ is a bookmark of 'how far we got'.",
    "**~existing = dict(...)~**: the fingerprints already stored for this article.",
    "**~todo = [c for c in chunks if existing.get(c.id) != c.content_hash]~**: only pieces that are new or changed need new embeddings, which saves time and money.",
    "**~vo.embed(..., input_type=\"document\")~**: turn the changed pieces into meaning-numbers.",
    "**~INSERT ... ON CONFLICT (id) DO UPDATE~**: insert a new piece, or update it if the id already exists (an 'upsert').",
    "**~DELETE ... AND NOT (id = ANY(keep))~**: remove pieces that no longer exist in the article, so old text can't be found.",
    "**Deleted articles**: remove all their pieces. Then ~conn.commit()~ saves everything at once and returns the new bookmark.",
  ],
  "i01:3": [
    "**~class SearchQuery~**: a cleaned-up search: the real question in one sentence, plus exact keywords (error codes, product names).",
    "**~rewrite(ticket)~**: the fast model turns a rambling customer message into that clean query.",
    "**~keyword_search(...)~**: an SQL query using Postgres full-text search, ranked by word matches and filtered by visibility. Returns up to 40 chunk ids.",
    "**~vector_search(...)~**: embeds the question (~input_type=\"query\"~) and asks Postgres for the 40 chunks with the closest meaning (~<=>~ means 'distance').",
    "**~rrf(*lists)~**: merges the two ranked lists. Each chunk gets ~1/(60 + rank)~ points from each list it appears in, so chunks near the top of both lists win.",
    "**~retrieve(...)~**: rewrite → both searches → merge → keep the top 30 → load their text → ~vo.rerank~ re-sorts them carefully and keeps the best 6.",
  ],
  "i01:4": [
    "**~SYSTEM~**: rules for the copilot: use only the documents, cite chunk ids, quote fees and limits word for word, and keep internal steps out of the customer reply.",
    "**~class Suggestion~**: status, the customer reply, internal notes for the agent, citations and quotes.",
    "**~docs = ...~**: wrap each retrieved chunk in a ~<doc id=...>~ tag so the model can cite it.",
    "**After the AI answers**: check every citation exists among the retrieved chunks, and every quote really appears in the cited text (ignoring extra spaces).",
    "**Returns the suggestion plus a problems list**, so the interface can warn the agent if something didn't verify.",
  ],
  "i01:5": [
    "**Turning history into a test set**: past tickets where an agent pasted a help-article link are free 'question → right answer' pairs.",
    "**~re.findall(...articles/(\\d+))~**: pull the article numbers out of the agent's reply.",
    "**Filter**: keep only solved tickets with a real message (over 40 characters), to reduce noise.",
    "**Write one JSON line per example** to ~retrieval.jsonl~.",
  ],
  "i01:6": [
    "**~doc_of(chunk_id)~**: turns 'article123#2.0' into 'article123', because we judge search by *article*, not by piece.",
    "**~metrics(...)~**: **recall@k** means 'was any right article in the top k?'. **Reciprocal rank** means 'how high was the first right one?' (1st place = 1, 2nd = 0.5…).",
    "**~run(...)~**: for every test question, run keyword search, vector search, hybrid, and hybrid + rerank, and score each one.",
    "**The final print** gives a table comparing the four approaches. This is the proof that the design choices are worth it.",
  ],
  "i01:7": [
    "**~class Claim~**: one factual statement from the reply, and whether the documents support it (yes / partially / no).",
    "**~JUDGE~**: asks the model to list every claim and check each against the documents.",
    "**~faithfulness(...)~**: the share of claims fully supported. 1.0 means everything is backed by the documents.",
  ],

  /* ───────── I02 Order agent ───────── */
  "i02:0": [
    "**~TOOLS~ is a list of tool descriptions** sent to the model, like a menu of things it may ask for.",
    "**Each tool has a ~name~, a ~description~ and an ~input_schema~**: the description is a mini prompt telling the model *when* to use the tool (and when not to).",
    "**No tool has a customer-id input.** The model can't even ask about another customer's orders.",
    "**~\"strict\": True~**: the model's tool inputs must match the schema exactly.",
    "**~\"enum\": [...]~ on return reasons**: only a fixed set of reasons is allowed.",
    "**~handoff_to_human~ is always available**, so the model always has a safe way out.",
  ],
  "i02:1": [
    "**~@dataclass class Verdict~**: the answer from the rules: allowed or not, whether a human must approve, and a reason.",
    "**~RETURN_WINDOW_DAYS = 30~**, **~AUTO_RETURN_LIMIT = 1000.00~**: the business rules as named constants, easy to read and change.",
    "**~check_return(...)~** goes through the rules in order: are all items in this order? Already returned? Delivered yet? Within 30 days? Over $1,000 (needs approval)?",
    "**~check_reschedule(...)~**: you can't reschedule what's delivered, and you can only pick a slot that was actually offered in this chat.",
    "**These rules are plain code**, so no clever customer message can talk them into an exception.",
  ],
  "i02:2": [
    "**~class Ctx~**: the conversation's trusted context: the signed-in customer's id (from the login session, not from the AI), slots offered so far, and an audit list of actions.",
    "**~owned(order_id)~**: fetches the order *only* if it belongs to this customer. That's the ownership check.",
    "**One ~if~ per tool**: each tool name maps to a small block of real code.",
    "**Write tools** (~reschedule_delivery~, ~start_return~) run the policy check first, then use an **idempotency key** built from the chat and order, so a repeated call can't act twice.",
    "**Approval path**: a return over the limit creates an approval ticket instead of acting, and tells the model what to say to the customer.",
    "**Every answer is JSON text**, and errors are returned *as data* (~{\"error\": ...}~) so the model can explain them politely.",
    "**~except Exception~**: if a tool crashes, the conversation continues with a suggestion to hand off to a human.",
  ],
  "i02:3": [
    "**~MAX_STEPS = 8~**: the agent's budget. At most 8 model calls per customer message.",
    "**~SYSTEM~**: tone and rules: look things up instead of guessing, confirm before changes, and check the policy before stating it.",
    "**~messages = history + [user message]~**: the conversation so far plus the new message.",
    "**The loop**: call the model with the tools → save its reply → if it wants tools, run them all → add *all* results in one message → repeat.",
    "**~if resp.stop_reason != \"tool_use\"~**: the model has finished, so return its text to the customer.",
    "**Budget used up**: hand off to a human instead of looping forever.",
  ],
  "i02:4": [
    "**Same agent, less code**: the SDK's tool runner runs the loop for you.",
    "**~@beta_tool~**: turns a normal Python function into a tool. The docstring becomes the description and the type hints become the input schema.",
    "**~make_tools(ctx, deps)~**: the tool functions are created *inside* this function, so they remember the trusted ~ctx~ (closures). Identity still comes from the session.",
    "**~for step, message in enumerate(runner)~**: each loop is one model response. Stop and hand off after 8 steps.",
  ],
  "i02:5": [
    "**~class CustomerMsg~**: what the simulated customer says next, and whether they're done.",
    "**~SIM~**: a prompt that makes the fast model *role-play a customer* with a hidden goal (persona).",
    "**~run_scenario(...)~**: build a fake shop (sandbox), then alternate turns between the agent and the simulated customer, for up to 8 rounds.",
    "**~checks = {...}~**: after the chat, check the *end state* of the fake world: was the right delivery moved? Were no refunds made? Was nothing leaked?",
    "**The YAML example at the bottom** shows a happy-path scenario and a social-engineering attack scenario.",
  ],

  /* ───────── I03 MCP logistics ───────── */
  "i03:0": [
    "**~current_tenant: ContextVar~**: a per-request 'who is asking' value. Each request has its own, even when many run at once.",
    "**~API = httpx.Client(...)~**: a reusable connection to the company's existing REST API.",
    "**~_get(path, **params)~**: every call automatically adds the current tenant. If no tenant is set, it crashes on purpose (fail closed).",
    "**~shipment(tracking_id)~**: fetch the shipment, **double-check it belongs to this tenant**, then gather the last scan and any problems into one tidy ~Shipment~.",
  ],
  "i03:1": [
    "**~mcp = FastMCP(\"meridian-shipments\")~**: create the MCP server.",
    "**~@mcp.tool()~**: turns a Python function into a tool any MCP app can discover. The docstring is the description the AI reads.",
    "**~track_shipment~**: one shipment's full status, plus a hint about the next action.",
    "**~find_shipments~**: search with filters (status, city, date, reference), capped at 50 rows.",
    "**~request_redelivery~ has two steps**: the first call returns a summary and a one-time token, and only a second call *with* the token (after the user says yes) does the real action.",
    "**~@mcp.resource(...)~**: read-only data (the scan timeline) that apps can attach as context.",
    "**~@mcp.prompt()~**: a ready-made instruction users can pick from a menu.",
    "**~mcp.run()~**: start the server over stdio, for local use by staff.",
  ],
  "i03:2": [
    "**~app = mcp.streamable_http_app()~**: the same server, made available over the internet.",
    "**~class TenantAuth(BaseHTTPMiddleware)~**: code that runs on *every* request before it reaches the tools: the security guard at the door.",
    "**Read the token** from the ~Authorization~ header and find out which customer it belongs to. No valid token means a 401 'unauthorized' reply.",
    "**~current_tenant.set(tenant)~** before the request and **~reset~** after it (in ~finally~, so it happens even on errors).",
    "**~audit(...)~**: record who called what, and the result.",
  ],
  "i03:3": [
    "**~async def ask(question)~**: our own ops agent, written as an MCP *client*.",
    "**~stdio_client(params)~**: starts the MCP server as a separate program and talks to it through standard input/output.",
    "**~session.list_tools()~**: ask the server 'what tools do you have?' at runtime, exactly as any other AI app would.",
    "**~async_mcp_tool(t, session)~**: convert each MCP tool into a tool the Claude tool runner understands.",
    "**~async for message in runner~**: run the agent loop and return the final text.",
  ],
  "i03:4": [
    "**The API connects to the remote MCP server for you**: no MCP client code on our side.",
    "**~mcp_servers=[{...}]~**: where the server is, its name, and a token scoped to *this* customer.",
    "**~tools=[{\"type\": \"mcp_toolset\", ...}]~**: says 'make that server's tools available'. Both parts are required.",
    "**~betas=[...]~**: this feature is switched on with a beta flag.",
  ],
  "i03:5": [
    "**A desktop AI app's settings file** (JSON). It tells the app how to start our MCP server on the staff member's laptop.",
    "**~command~ + ~args~**: run ~uv run python server.py~ in the server's folder. That's all, with zero extra code.",
  ],

  /* ───────── I04 Text-to-SQL ───────── */
  "i04:0": [
    "**The data catalogue (YAML)**: written by analysts, describing each table in plain words.",
    "**~grain~**: what one row means (one store, one product, one day). It's essential for correct totals.",
    "**Column notes like 'USE THIS for \"sales\"'**: the business definitions that stop the AI using the wrong number.",
    "**~joins~**: how tables connect to each other.",
  ],
  "i04:1": [
    "**~CATALOG = yaml.safe_load(...)~**: load the catalogue.",
    "**~table_doc(name)~**: turns one table's catalogue entry into a readable text block.",
    "**~INDEX = BM25(...)~**: the keyword search from B05, reused here to search *tables* instead of handbook sections.",
    "**~relevant_tables(question)~**: find the best-matching tables, then add the tables they join to, so the AI can write correct joins.",
  ],
  "i04:2": [
    "**~METRICS~**: business definitions written as SQL snippets ('sales' = net sales), included in the cached system prompt.",
    "**~SYSTEM~**: strict rules: one SELECT, no changes to data, only the provided tables, and state any assumptions.",
    "**~class SqlProposal~**: the plan, the SQL, and the assumptions ('last month' = September).",
    "**~propose(...)~**: find relevant tables, describe them, and ask the model for a SQL *proposal*. Nothing runs yet.",
  ],
  "i04:3": [
    "**Never run AI-written SQL as plain text.** This file inspects it first.",
    "**~sqlglot.parse(...)~**: turn the SQL text into a tree you can examine, like diagramming a sentence.",
    "**Exactly one statement**, and it must be a SELECT (reading only). Any INSERT, UPDATE, DELETE, DROP or CREATE is rejected.",
    "**Table allowlist**: every table used must be in ~ALLOWED_TABLES~ (temporary names defined inside the query are ignored).",
    "**Function denylist**: block dangerous functions like ~pg_sleep~.",
    "**Add ~LIMIT 1000~** if missing, then rebuild clean SQL *from the tree*.",
  ],
  "i04:4": [
    "**~psycopg.connect(dsn=RO_DSN)~**: connect with a **read-only** database account.",
    "**~SET statement_timeout = '15s'~**: any query longer than 15 seconds is stopped.",
    "**~set_config('app.user_region', ...)~**: tells the database's row-level security which region this manager may see.",
    "**~cur.fetchmany(1000)~**: return at most 1,000 rows. That makes three safety walls after validation.",
  ],
  "i04:5": [
    "**~for attempt in range(2)~**: try at most twice.",
    "**Empty SQL**: the model said it can't answer, so explain why.",
    "**~validate~ then ~run_query~**: if either fails, the *actual error message* is sent back with the next attempt, so the model can fix its query.",
    "**~for ... else~**: the ~else~ runs only if the loop never hit ~break~, meaning both attempts failed.",
    "**Summary call**: the fast model writes 1–3 sentences from the real result, using exact numbers.",
    "**Return everything**: answer, SQL, assumptions and rows, so the manager can see *how* the answer was found.",
  ],
  "i04:6": [
    "**Compare results, not SQL text.** Two different queries can both be right.",
    "**~normalise(...)~**: round decimals, ignore column order, and sort rows unless order matters.",
    "**For each question**: run the analyst's gold SQL and our pipeline, then compare the normalised results.",
    "**Print accuracy and the first 20 failures** with their assumptions. Failures usually point to a missing definition.",
  ],

  /* ───────── I05 Contract review ───────── */
  "i05:0": [
    "**The client's playbook as data** (YAML), owned by lawyers.",
    "**For each clause type**: is it required? The preferred position, acceptable fallbacks, and red lines (never acceptable).",
    "**Turning lawyers' know-how into a file** is often the most valuable result of the project.",
  ],
  "i05:1": [
    "**~HEADING~**: a pattern that recognises clause headings like '12.3 Limitation of Liability' or 'ARTICLE IX'.",
    "**~@dataclass class Clause~**: one clause with an id, its heading, its text and its page number.",
    "**~segment(pages)~**: go page by page and line by line. A heading starts a new clause, and other lines are added to the current one.",
    "**Keep the page number** so lawyers can jump straight to the right page. Very short pieces are dropped.",
  ],
  "i05:2": [
    "**~ClauseType~**: which playbook topics a clause covers. One clause can cover several.",
    "**~Finding~**: the assessment: position (preferred → red line), analysis, the exact quote, suggested new wording, and a note if it depends on definitions elsewhere.",
  ],
  "i05:3": [
    "**~TYPES~ and ~TypeList~**: build the allowed clause types from the playbook file at runtime.",
    "**~ASSESS~**: the reviewer's instructions: compare with the playbook, quote the deciding words, flag cross-references, and when unsure choose the worse position.",
    "**~classify(clause)~**: the fast model labels each clause's topics.",
    "**~assess(clause, ctype)~**: the strong model compares one clause with *one* playbook rule, and code checks the quote really appears in the clause.",
    "**~review(clauses)~**: classify all clauses in parallel, assess each clause–topic pair in parallel, then sort findings with red lines first.",
    "**~by_type~**: which clauses cover which topics, used next to find missing clauses.",
  ],
  "i05:4": [
    "**Finds what's *not* there**: for every required clause type in the playbook, if no clause covers it, create a red-line finding ('No limitation of liability clause found').",
    "**Pure code**, so it's always reliable.",
  ],
  "i05:5": [
    "**~KeyTerms~**: a few business facts per contract: counterparty, dates, auto-renewal, notice period, liability cap, law.",
    "**~extract_terms(...)~**: read the contract once and fill in the form, with null where it's not stated.",
    "**The SQL comment at the bottom**: once terms are in a table, 'which contracts renew next quarter?' is a simple query. Searching documents can't count reliably, and a database can.",
  ],
  "i05:6": [
    "**Compare the AI's findings with the lawyers' findings** for each contract.",
    "**~recall~ per severity**: of the real red lines, how many did we find? This matters most.",
    "**~precision~**: of our findings, how many were real? False alarms cost lawyer time but not risk.",
  ],
});

Object.assign(window.WALK, {
  /* ───────── I06 Moderation cascade ───────── */
  "i06:0": [
    "**~ROUTES~**: two named routes: ~fast~ (cheap model, short answers) and ~smart~ (strong model).",
    "**~FALLBACK~**: if the fast route fails, try the smart one. If the smart one fails, give up and raise the error.",
    "**~STATS = Counter()~**: a running tally of calls, tokens and time per route, which feeds the cost dashboard.",
    "**~except (RateLimitError, InternalServerError, APIConnectionError)~**: only *temporary* problems trigger the fallback. A bad request is a bug and shouldn't be hidden.",
    "**~return parse(..., tier=FALLBACK[tier])~**: the function calls itself with the next route (recursion).",
  ],
  "i06:1": [
    "**~Policy~**: the 14 marketplace rules a listing can break.",
    "**~PolicyScore~**: for one rule, how likely the listing breaks it (0–1), with evidence.",
    "**~Assessment~**: a list of possible violations plus an 'uncertain' flag for genuinely borderline cases.",
  ],
  "i06:2": [
    "**Tier 0: free rules, no AI.**",
    "**Known bad images**: if a photo's fingerprint matches a known prohibited image, block immediately.",
    "**Banned phrases**: send to a human (they might be innocent, e.g. a news book about fentanyl).",
    "**Price anomaly**: a famous brand at 20% of its normal price is suspicious, so send it to the stronger tier.",
    "**~return None~**: nothing found, so continue to the AI tiers.",
  ],
  "i06:3": [
    "**~T = yaml.safe_load(...)~**: the thresholds, chosen by the simulation script rather than guessed.",
    "**~COMPACT~ vs ~DETAILED~**: a short policy summary for the cheap tier, and the full policies (cached) for the strong tier.",
    "**Tier 1**: the fast model scores the listing. Clearly fine (low top score, not uncertain) means publish. Clearly bad (above the block threshold, and not a high-severity policy) means block.",
    "**~max(a1.violations, key=lambda v: v.score, default=None)~**: pick the most likely violation, or ~None~ if the list is empty.",
    "**Tier 2**: everything in between goes to the strong model with the detailed policies.",
    "**After tier 2**: publish if clean. Send to a human if high-severity, uncertain or below the block threshold. Otherwise block.",
  ],
  "i06:4": [
    "**~COST~**: what each tier costs per listing, measured from the gateway's stats.",
    "**~simulate(rows, clear, block, t2_block)~**: replays scored, labelled listings through the cascade rules *without* calling the AI again, so it's free and instant.",
    "**~w = r[\"weight\"]~**: rare violations were over-sampled for testing, and the weight corrects for that so totals reflect real traffic.",
    "**For each listing**: add up the cost of the tiers it would pass through, and record whether the final decision was right (tp), a wrong block (fp) or a miss (fn).",
    "**Returns** cost per day, recall, false-removal rate and human workload, the four numbers the business cares about.",
    "**~itertools.product(...)~**: try every combination of three thresholds and print a table to choose from.",
  ],

  /* ───────── I07 Sales call judge ───────── */
  "i07:0": [
    "**The rubric file, version 4**: four yes/no questions about the sales call.",
    "**~counts~**: exactly what counts as a 'yes'.",
    "**~does_not_count~**: common near-misses that must be 'no'. These lines came from studying disagreements between the AI and managers.",
  ],
  "i07:1": [
    "**~RUBRIC~ and ~VERSION~**: load the rubric and remember its version for every score.",
    "**~CriterionVerdict~**: evidence quotes first, then reasoning, then the yes / no / unclear verdict.",
    "**~SYSTEM~**: apply the rules literally. 'Unclear' is only for genuinely unclear audio, not for 'the rep didn't do it'.",
    "**~render_rubric()~**: turns the rubric into readable text for the prompt.",
    "**~score_call(...)~**: score the call, then check each quote really appears in the transcript. A 'yes' without real evidence becomes 'unclear'.",
  ],
  "i07:2": [
    "**~kappa(a, b)~**: measures how often two graders agree, *minus* how often they'd agree by pure luck. 1 = perfect agreement, 0 = no better than chance.",
    "**~po~**: observed agreement. **~pe~**: agreement expected by chance, based on how often each grader says each label.",
    "**~run(...)~**: score every calibration call with the AI judge.",
    "**For each criterion**: compare manager A vs manager B, the AI vs A, and the AI vs B.",
    "**Prints disagreements** where both managers agree but the AI differs. These are the most useful cases for improving the rubric wording.",
  ],
  "i07:3": [
    "**~rate_with_interval(yes, n)~**: the share of 'yes' answers *plus a range* showing how sure we can be. With few calls the range is wide, with many it's narrow (Wilson interval).",
    "**~rep_profile(cards)~**: for one sales rep, look at their last 30 calls and compute each criterion's rate and range.",
    "**Why**: one call can be a fluke. Coaching should be based on patterns across many calls.",
  ],

  /* ───────── I08 Prior authorisation ───────── */
  "i08:0": [
    "**~class S(str, Enum)~**: every stage a case can be in, as a fixed list of names.",
    "**~ALLOWED~**: for each stage, the stages it may move to next. Notice you can only reach ~SUBMITTED~ from ~AWAITING_CLINICIAN~.",
    "**~HUMAN_OR_WAIT~**: stages where the automation stops and waits for a person or the insurer.",
    "**~check_transition(a, b)~**: raises an error for any illegal move. Safety is built into the structure.",
  ],
  "i08:1": [
    "**One insurer's rules for one procedure**, turned into a checklist file (reviewed by staff).",
    "**~criteria~**: the requirements that must all be documented.",
    "**~any_of_exceptions~**: special situations (like a suspected fracture) that skip some requirements.",
    "**~source~**: where in the insurer's PDF the rule came from, for auditing.",
  ],
  "i08:2": [
    "**'Minimum necessary'**: send the AI only the patient information it needs, as health-privacy law requires.",
    "**Filter notes** to relevant types and to the last 270 days.",
    "**Replace the patient's name** and identifiers (record numbers, social security numbers, phones) with placeholders.",
    "**Return cleaned notes** with their ids and dates, so evidence can still be traced back.",
  ],
  "i08:3": [
    "**Each function is one stage's work** and returns ~(next_stage, output)~.",
    "**~load_criteria~**: find the reviewed checklist for this insurer and procedure. If none exists, send the case to staff.",
    "**~match_evidence~**: give the AI the cleaned notes and the checklist, and get back met / not met / insufficient for each requirement, with quotes and note ids.",
    "**Quote check**: a 'met' whose quotes can't be found in the cited notes is downgraded, so staff will check it.",
    "**Decide what's next**: if any required item isn't met (and no exception applies), the case goes to 'gaps found'. Otherwise draft the packet.",
    "**~draft_packet~**: the AI writes the letter from the matched evidence only, and the form fields are pre-filled.",
    "**~submit~**: refuses to run without a clinician's attestation, even if called by mistake. It also uses an idempotency key.",
  ],
  "i08:4": [
    "**~route_after_match~**: after matching, either notify staff about gaps or draft the packet.",
    "**~request_signature~**: notify the clinician and wait.",
    "**~AUTO~**: which function runs automatically in which stage.",
    "**~advance(case_id)~**: keep running automatic steps until the case reaches a waiting stage. Any crash sends the case to staff.",
    "**~store.transition(..., audit={...})~**: every move is saved with who did it, which model and prompt version, and a fingerprint of the inputs. That's the audit log.",
    "**~clinician_attest(...)~**: the human step. Approve → save the attestation and submit. Reject → send the case back to re-matching with the reason.",
  ],
  "i08:5": [
    "**~confusion[(truth, prediction)]~**: counts every combination of true status and predicted status.",
    "**~false_met~**: cases where the AI said 'met' but the nurse said otherwise. This is the dangerous error and must be near zero.",
    "**Gap detection recall**: of the real gaps, how many did we catch before submission?",
  ],

  /* ───────── I09 Travel memory ───────── */
  "i09:0": [
    "**~TripState~**: the trip facts we know so far, all optional at the start. It's the patient file.",
    "**~@property ready_for_search~**: true once we know where, when and who. It reads like a field but is calculated.",
    "**~missing_for_handoff()~**: lists what's still missing before an advisor can call.",
    "**~TripUpdate~**: only what changed in the latest message, including adding or removing interests and clearing fields ('forget the dates').",
    "**~merge(s, u)~**: apply the update to the state in code: overwrite changed fields, clear cleared ones, update lists without duplicates, and reset the chosen package if the destination changed.",
  ],
  "i09:1": [
    "**~SYSTEM~**: return only what changed, use the corrected value when the user corrects themselves, and never guess a budget.",
    "**The ~user~ message**: today's date, the current state, the assistant's last message (so 'yes, that one' makes sense) and the new user message.",
    "**Fast model**: this runs on every turn, so it must be cheap and quick.",
  ],
  "i09:2": [
    "**Builds an SQL query piece by piece** from whatever we know: destination or region, month, budget (plus 10% wiggle room), and family-friendly if children are coming.",
    "**~%s~ placeholders + the ~p~ list**: values are passed separately from the SQL text. This prevents SQL injection, where a user types code into a form.",
    "**~ORDER BY (tags && interests) DESC~**: packages matching the user's interests come first.",
    "**~dict(zip(columns, row))~**: turn each result row into a dictionary with named fields.",
  ],
  "i09:3": [
    "**~SYSTEM~ (cached)**: tone, one question at a time, and never invent packages or prices.",
    "**~build_messages(...)~**: the context: current state, what's missing, the summary of older chat, search results (if any), the last 6 messages, and the new message.",
    "**~stream_reply(...)~**: ~client.messages.stream(...)~ gives the reply piece by piece, and ~yield text~ passes each piece on immediately.",
  ],
  "i09:4": [
    "**~@app.post(\"/chat\")~**: the website sends each new message here.",
    "**Load the session**, find the assistant's last message, extract updates and merge them into the state.",
    "**Search only if** the state is ready and something changed.",
    "**~def events()~**: a generator that sends each piece of text to the browser as ~data: ...~ lines. That format is Server-Sent Events.",
    "**After streaming finishes**: save the turn and the new state, summarise if the chat is long, and queue a hand-off to an advisor if the user wants to book.",
    "**~StreamingResponse(...)~**: tells FastAPI to keep the connection open and stream.",
  ],
  "i09:5": [
    "**~KEEP = 8~**: always keep the last 8 messages word for word.",
    "**Only summarise when the chat is long** (more than 16 messages).",
    "**Fold older messages into the running summary**, keeping likes, dislikes and reasons. Facts like dates are already in the state.",
  ],
  "i09:6": [
    "**Personas**: simulated travellers with a hidden 'true' trip and a script (for example, changing their mind on turn 3).",
    "**~field_accuracy(final, truth)~**: compares the final state with the truth, field by field. Lists count as correct if they contain everything expected.",
    "**~invented~**: any assistant message mentioning a package code that isn't in the real inventory. This must be zero.",
  ],

  /* ───────── I10 Prompt CI ───────── */
  "i10:0": [
    "**~REGISTRY~**: a file saying which prompt version, model and limits each feature uses.",
    "**~prompt(feature, version)~**: load a prompt file by feature and version.",
    "**~run(feature, user, ...)~**: the gateway's new main function. Callers name a feature, not a prompt or model.",
    "**~with tracer.start_as_current_span(...) as span~**: start a trace record for this call.",
    "**~span.set_attribute(...)~ lines**: record the model, prompt version, token counts, finish reason and time, using standard 'GenAI' names that monitoring tools understand.",
    "**~version~ / ~model~ overrides**: let tests and CI try a *candidate* prompt or model without changing the registry.",
  ],
  "i10:1": [
    "**~quotes_verified(summary, article)~**: finds every quoted phrase in the summary and checks it appears in the article. That's a code check, so it's exact.",
    "**~run_suite(...)~**: for each test article, write a summary with the version or model under test.",
    "**Three metrics**: quotes verified and faithfulness (critical), and length (soft).",
    "**Faithfulness**: a judge lists each claim and whether the article supports it, and we compute the share supported.",
  ],
  "i10:2": [
    "**~CRITICAL~**: the metrics that block a change if they drop.",
    "**~TOLERANCE = 0.02~**: small drops within normal randomness are allowed.",
    "**~changed_features()~**: ask git which files changed in this pull request, so only the affected features are tested (or all of them, if the gateway changed).",
    "**~importlib.import_module(...)~**: load the right test suite by name.",
    "**Compare each metric with the baseline** and build a markdown table with ✅, ⚠️ or ❌.",
    "**~return 1 if failed else 0~**: exit code 1 tells CI 'failed', which blocks the merge.",
  ],
  "i10:3": [
    "**A GitHub Actions workflow file (YAML).**",
    "**~on: pull_request: paths: [...]~**: run only when prompts, the gateway or evals change.",
    "**~steps~**: get the code, install tools, run the eval gate with the API key from GitHub's secret store (~secrets.ANTHROPIC_API_KEY~), and post the report as a comment on the pull request.",
    "**~if: always()~**: post the report even when the gate fails, which is exactly when it matters most.",
  ],
  "i10:4": [
    "**~SHADOW~**: for summaries, also try a candidate model on 5% of requests.",
    "**The user always gets the production answer** (~out~) straight away.",
    "**~threading.Thread(target=shadow, daemon=True).start()~**: run the candidate in the background, so the user never waits for it.",
    "**Save both answers as a pair** for later comparison. Shadow failures are ignored, so they can never affect users.",
  ],
});
