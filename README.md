[![SWUbanner](https://raw.githubusercontent.com/vshymanskyy/StandWithUkraine/main/banner-direct-single.svg)](https://stand-with-ukraine.pp.ua/)

# Keycap

<img src="public\android-chrome-192x192.png" align="right"
  alt="Purple keycap with capital letter K" width="150" height="150"/>

Simple note-taking app with support for markdown. Share your thoughts with others and organize them into folders.

## Why?

After months of using Windows and Android, I found out that notes aren't syncing. Plus there wasn't support for markdown. But you can ask why build something similar to the Notion? and the answer will be pretty simple. With this project, I developed my skills and I hope it will load much faster than notion 🙃

## Stack

- [Nuxt](https://nuxt.com/)
- [Prisma](https://prisma.io/)
- [Cockroach DB](https://www.cockroachlabs.com/product/)

## Todo

- [x] custom `ctrl+k` search
- [x] commands through `ctrl+k`
- [x] add support for renaming __folders__
- [x] OAuth with Google and GitHub?
- [x] show notes via sharable links
- [ ] code highlighting
- [ ] work without internet (kinda working, if the page is still cached, notes and folders will be loaded from local copies)
- [ ] create landing page
- [x] create project logo

## Notes

- [Prisma vs Drizzle (my benchmark)](./benchmarks/prisma-vs-drizzle/README.md)
  tldr: Prisma even manages to beat drizzle in some queries (at least on my local machine)

- [Prisma vs Kysely (my benchmark)](./benchmarks/prisma-vs-kysely/README.md)
  tldr: in queries without joins prisma is not that far, but in larger queries, Kysely has usually more than 100 ops/s difference

[Rewrite with kysely](https://github.com/logotip4ik/keycap/tree/feat/kysely). Kysely is slightly faster in a development environment,
though `node-postgres` isn't well suited for serverless. So to see Kysely outperforms Prisma you will need much more traffic than a few visitors in a week.

### Load testing with Bombardier

test command:

```sh
bombardier http://localhost:3000/api/notes/main -l -d 60s -c 300
```

<details>
<summary>Kysely</summary>

```sh
Statistics        Avg      Stdev        Max
  Reqs/sec       601.55      90.08     841.85
  Latency      497.61ms    32.88ms      0.89s
  Latency Distribution
     50%   503.24ms
     75%   515.54ms
     90%   526.89ms
     95%   535.99ms
     99%   625.21ms
  HTTP codes:
    1xx - 0, 2xx - 36322, 3xx - 0, 4xx - 0, 5xx - 0
    others - 0
  Throughput:    34.97MB/s
```
</details>

<details>
<summary>Prisma (v4)</summary>

```sh
Statistics        Avg      Stdev        Max
  Reqs/sec       587.57     161.55    4091.91
  Latency      512.14ms    46.99ms      0.99s
  Latency Distribution
     50%   504.01ms
     75%   524.79ms
     90%   586.09ms
     95%   615.20ms
     99%   682.54ms
  HTTP codes:
    1xx - 0, 2xx - 35320, 3xx - 0, 4xx - 0, 5xx - 0
    others - 0
  Throughput:    33.94MB/s
```
</details>

<details>
<summary>Drizzle</summary>

I should have done something wrong [`feat/drizzle`](https://github.com/logotip4ik/keycap/tree/feat/drizzle)

```sh
Statistics        Avg      Stdev        Max
  Reqs/sec       173.54      34.56     269.03
  Latency         1.70s   456.12ms      6.18s
  Latency Distribution
     50%      1.57s
     75%      1.68s
     90%      1.88s
     95%      1.99s
     99%      3.86s
  HTTP codes:
    1xx - 0, 2xx - 10716, 3xx - 0, 4xx - 0, 5xx - 0
    others - 0
  Throughput:    10.18MB/s
```
</details>
