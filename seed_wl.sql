-- Optional: clean slate if you had partial tables
-- DROP TABLE IF EXISTS comments;
-- DROP TABLE IF EXISTS watchlist_items;
-- DROP TABLE IF EXISTS watchlists;

-- Tables (DuckDB-safe)
CREATE TABLE IF NOT EXISTS watchlists (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  intro TEXT,
  default_sort TEXT DEFAULT 'perf_m',
  group_by_subcategory BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watchlist_items (
  watchlist_id INTEGER NOT NULL,
  ticker TEXT NOT NULL,
  subcategory TEXT,
  layout_meta JSON,
  created_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (watchlist_id, ticker)
);

CREATE TABLE IF NOT EXISTS comments (
  watchlist_id INTEGER NOT NULL,
  ticker TEXT NOT NULL,
  box_index INTEGER NOT NULL,     -- 1 or 2
  text TEXT DEFAULT '',
  updated_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (watchlist_id, ticker, box_index)
);

CREATE INDEX IF NOT EXISTS idx_items_wl        ON watchlist_items(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_items_ticker    ON watchlist_items(ticker);
CREATE INDEX IF NOT EXISTS idx_comments_wl     ON comments(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_comments_ticker ON comments(ticker);

-- Known tickers in your DB (filters out symbols not present)
CREATE OR REPLACE TEMP VIEW _known AS
SELECT DISTINCT ticker FROM stock_data;

-----------------------------
-- Watchlist 1: AI Leaders
-----------------------------
INSERT INTO watchlists (id, title, intro, default_sort, group_by_subcategory)
VALUES (1, 'AI Leaders', 'Core AI hardware, platforms, and infra', 'perf_m', TRUE);

INSERT INTO watchlist_items (watchlist_id, ticker, subcategory)
SELECT 1 AS watchlist_id, v.ticker, v.subcategory
FROM (
  VALUES
    ('NVDA','AI Chips'),
    ('AMD','AI Chips'),
    ('AVGO','AI Chips'),
    ('TSM','Foundry/Litho'),
    ('ASML','Foundry/Litho'),
    ('MSFT','Platforms'),
    ('GOOGL','Platforms'),
    ('META','Platforms'),
    ('SMCI','Accelerators/Infra'),
    ('ANET','Accelerators/Infra')
) AS v(ticker, subcategory)
JOIN _known k ON k.ticker = v.ticker;

INSERT INTO comments (watchlist_id, ticker, box_index, text)
SELECT wi.watchlist_id, wi.ticker, b.box_index, ''
FROM watchlist_items wi
JOIN (SELECT 1 AS box_index UNION ALL SELECT 2) b ON TRUE
WHERE wi.watchlist_id = 1;

-----------------------------------
-- Watchlist 2: Semiconductors (Core)
-----------------------------------
INSERT INTO watchlists (id, title, intro, default_sort, group_by_subcategory)
VALUES (2, 'Semiconductors (Core)', 'Designers, foundries, equipment, memory', 'perf_w', TRUE);

INSERT INTO watchlist_items (watchlist_id, ticker, subcategory)
SELECT 2 AS watchlist_id, v.ticker, v.subcategory
FROM (
  VALUES
    -- Designers
    ('NVDA','Designers'),
    ('AMD','Designers'),
    ('AVGO','Designers'),
    ('QCOM','Designers'),
    -- Foundries
    ('TSM','Foundries'),
    ('GFS','Foundries'),
    -- Equipment
    ('ASML','Equipment'),
    ('AMAT','Equipment'),
    ('LRCX','Equipment'),
    ('KLAC','Equipment'),
    -- Memory
    ('MU','Memory')
) AS v(ticker, subcategory)
JOIN _known k ON k.ticker = v.ticker;

INSERT INTO comments (watchlist_id, ticker, box_index, text)
SELECT wi.watchlist_id, wi.ticker, b.box_index, ''
FROM watchlist_items wi
JOIN (SELECT 1 AS box_index UNION ALL SELECT 2) b ON TRUE
WHERE wi.watchlist_id = 2;

--------------------------
-- Watchlist 3: Cloud & SaaS
--------------------------
INSERT INTO watchlists (id, title, intro, default_sort, group_by_subcategory)
VALUES (3, 'Cloud & SaaS', 'Hyperscalers and core enterprise SaaS', 'perf_m', TRUE);

INSERT INTO watchlist_items (watchlist_id, ticker, subcategory)
SELECT 3 AS watchlist_id, v.ticker, v.subcategory
FROM (
  VALUES
    -- Hyperscalers
    ('MSFT','Hyperscalers'),
    ('GOOGL','Hyperscalers'),
    ('AMZN','Hyperscalers'),
    -- Core SaaS
    ('CRM','SaaS'),
    ('NOW','SaaS'),
    ('SNOW','SaaS'),
    ('MDB','SaaS'),
    ('DDOG','SaaS'),
    ('NET','SaaS'),
    ('PLTR','SaaS/Analytics')
) AS v(ticker, subcategory)
JOIN _known k ON k.ticker = v.ticker;

INSERT INTO comments (watchlist_id, ticker, box_index, text)
SELECT wi.watchlist_id, wi.ticker, b.box_index, ''
FROM watchlist_items wi
JOIN (SELECT 1 AS box_index UNION ALL SELECT 2) b ON TRUE
WHERE wi.watchlist_id = 3;

-----------------------
-- Watchlist 4: Energy Majors
-----------------------
INSERT INTO watchlists (id, title, intro, default_sort, group_by_subcategory)
VALUES (4, 'Energy Majors', 'US integrated & upstream leaders', 'perf_3m', TRUE);

INSERT INTO watchlist_items (watchlist_id, ticker, subcategory)
SELECT 4 AS watchlist_id, v.ticker, v.subcategory
FROM (
  VALUES
    ('XOM','Integrated'),
    ('CVX','Integrated'),
    ('COP','Upstream'),
    ('SLB','Services'),
    ('EOG','Upstream')
) AS v(ticker, subcategory)
JOIN _known k ON k.ticker = v.ticker;

INSERT INTO comments (watchlist_id, ticker, box_index, text)
SELECT wi.watchlist_id, wi.ticker, b.box_index, ''
FROM watchlist_items wi
JOIN (SELECT 1 AS box_index UNION ALL SELECT 2) b ON TRUE
WHERE wi.watchlist_id = 4;

-- Sanity checks
SELECT title, COUNT(*) AS symbols
FROM watchlists w
JOIN watchlist_items wi ON wi.watchlist_id = w.id
GROUP BY 1
ORDER BY 1;

SELECT * FROM watchlists ORDER BY id;
