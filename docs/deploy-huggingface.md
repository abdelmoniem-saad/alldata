# Put AllData online for free (Hugging Face Spaces)

This is the plain-English, click-by-click guide to take AllData from "only on my
computer" to a real web address anyone can open. It's **free**, needs **no credit
card**, and the simulations (Run buttons) work.

You'll do this once. Total time: ~10 minutes of your clicking, then ~5-10 minutes
of waiting while it builds itself.

> **What "Hugging Face Spaces" is, in one line:** a free service that takes your
> code, packages it up, and runs it on a always-on computer with a public web
> address. Your app gets ~16 GB of memory free, plenty for the simulations.

Everything technical is already prepared in your project (a `Dockerfile`, a
startup script, and the settings Hugging Face reads). You just push the code up
and press go.

---

## Part A — Make an account and create the Space (clicking)

1. Go to **https://huggingface.co/join** and make a free account. (Pick a
   username, e.g. `yourname`. Remember it.)
2. Click your avatar (top-right) → **New Space**. Or go straight to
   **https://huggingface.co/new-space**.
3. Fill in the little form:
   - **Owner:** you.
   - **Space name:** `alldata` (this becomes part of your web address).
   - **License:** pick any (e.g. MIT).
   - **Select the Space SDK:** choose **Docker**, then **Blank**.
   - **Hardware:** leave the free **CPU basic** (that's the ~16 GB one).
   - **Visibility:** **Public**.
4. Click **Create Space**. You now have an empty Space at:
   `https://huggingface.co/spaces/YOURNAME/alldata`
   It will say it's empty, that's expected, we send the code next.

---

## Part B — Send your code to the Space (copy-paste)

You'll push your project up with a few commands. First you need a **token** (this
is just a password Hugging Face uses to let your computer upload).

1. **Get a token:** go to **https://huggingface.co/settings/tokens** → **Create
   new token** → give it **Write** permission → **Create** → copy the long
   string it shows. Keep it somewhere for the next step.

2. **Open a terminal in your project folder.** On Windows, open the `alldata`
   folder, and in the address bar type `cmd` and press Enter (or use Git Bash /
   PowerShell). Then run these, one block at a time. Replace **YOURNAME** with
   your Hugging Face username:

   ```sh
   git add -A
   git commit -m "Deploy AllData"
   git remote add hf https://huggingface.co/spaces/YOURNAME/alldata
   git push hf main
   ```

3. When it asks for a **username**, type your Hugging Face username. When it asks
   for a **password**, paste the **token** from step 1 (the typing/paste may be
   invisible, that's normal, just paste and press Enter).

That uploads everything. (If `git push hf main` complains the branch is
different, run `git push hf HEAD:main` instead.)

---

## Part C — Watch it build, then open it

1. Go back to your Space page: `https://huggingface.co/spaces/YOURNAME/alldata`.
2. You'll see it **Building** (a yellow status). It's reading the `Dockerfile`,
   building the website, installing Python, and seeding the lessons. This takes
   **5-10 minutes the first time**. You can click the **Logs** tab to watch.
3. When the status turns **Running** (green), the app appears right there on the
   page. Your public address is:
   `https://YOURNAME-alldata.hf.space`
4. Open it, click into a topic, hit **Run** on a simulation, you should see
   output and plots. Share that link with anyone. 🎉

---

## Good to know (plain answers to the obvious questions)

- **Is it really free?** Yes, the free "CPU basic" hardware. No card.
- **Does it fall asleep?** If nobody visits for a while, the Space pauses to save
  resources, then wakes up on the next visit (a few seconds' delay). Normal for
  free hosting.
- **Do sign-ups and progress stay forever?** On the free tier alone, storage
  resets when the Space restarts or rebuilds (the lessons re-seed themselves
  each time, so the content is always there, but visitor accounts/progress
  reset). That's fine for letting people try it. **Part D below** wires a
  free external Postgres in ~5 minutes to make accounts, progress, and forks
  permanent.
- **Is running strangers' code safe?** Their code runs **inside your Space's own
  sandbox**, with time limits and rate limits already on, and the app mints a
  fresh security key each restart. Good for a public trial. Don't put anything
  private in the Space.
- **Updating the site later:** make your changes, then run `git add -A`,
  `git commit -m "update"`, `git push hf main` again. It rebuilds automatically.
- **R simulations:** the **R** tab stays hidden for now (R isn't installed in the
  free image), so there's no broken button. Adding R later is a small change to
  the `Dockerfile`, ask when you want it. See [`r-runtime.md`](r-runtime.md).

---

## Part D — Make accounts and progress durable (optional, ~5 minutes)

By default the Space's storage is **ephemeral**: accounts, progress, and forks
reset whenever the Space restarts. To make them permanent, give the Space an
external Postgres database (free tiers work — e.g. [Neon](https://neon.tech)
or [Supabase]):

1. Create a free Postgres database at your provider and copy its connection
   string. It looks like:
   `postgresql://user:password@ep-xyz.eu-central-1.aws.neon.tech/dbname`
2. AllData uses the async driver, so change the scheme to
   `postgresql+asyncpg://…` and add `?sslmode=require` at the end.
   **Neon's copy button appends `&channel_binding=require` — delete that
   part.** asyncpg forwards unknown query params to the server as settings,
   and Postgres rejects `channel_binding` with `unrecognized configuration
   parameter`, which breaks every connection. The value should end with
   just `?sslmode=require`.
3. In your Space: **Settings → Variables and secrets → New secret**
   - Name: `DATABASE_URL`
   - Value: `postgresql+asyncpg://user:password@…?sslmode=require`
   - While you're there, also set `SECRET_KEY` to a long random string so
     logins survive restarts too (without it, a new secret is minted per boot
     and everyone is signed out).
4. The Space takes care of the rest: on boot it runs the idempotent importer
   against the external DB (schema + lesson content), and
   `GET /api/health` reports `{"status":"ok","database":"ok"}` when the
   connection is live — or 503 if the database is unreachable, which the
   keep-alive workflow below surfaces.

Nothing else changes: lessons still live in `seed/` (re-imported on boot),
and content updates still deploy with `git push hf main`.

## Keep-alive (optional, already wired)

`.github/workflows/keepalive.yml` pings `/api/health` every 30 minutes from
GitHub Actions. That keeps the free Space from sleeping after 48 idle hours
(so the first visitor doesn't wait for a cold start) and shows red runs in
the Actions tab when the Space or its database is down. If your Space lives
at a different address, set a repository secret `ALLODATA_URL` to the base
URL. Nothing to configure — it runs as long as the workflow file is on the
GitHub repo's default branch.

## If something goes wrong

- **Build failed (red status):** open the **Logs** tab and copy the last 20-30
  lines, that says exactly what tripped. Most first-time failures are a typo in
  the push or a missing file; re-running the Part B commands usually fixes it.
- **App loads but Run does nothing:** check the **Logs** tab while you click Run,
  it prints the error. Share it and I'll sort it.
- **"Authentication failed" on push:** your token needs **Write** permission;
  make a new one (Part B step 1) and try the push again.
